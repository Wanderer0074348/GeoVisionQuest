import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

async function getAccessToken() {
  const serviceAccount = process.env.GEE_SERVICE_ACCOUNT;
  const privateKey = process.env.GEE_PRIVATE_KEY;

  if (!serviceAccount || !privateKey) {
    throw new Error('Google Earth Engine credentials not configured');
  }

  const formattedKey = privateKey.replace(/\\n/g, '\n');

  const jwtClient = new google.auth.JWT({
    email: serviceAccount,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/earthengine.readonly'],
  });

  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const buffer = searchParams.get('buffer') || '500';

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const bufferMeters = parseFloat(buffer);

    // Get access token
    const accessToken = await getAccessToken();

    // Calculate bounds for the region
    const metersPerDegree = 111320; // Approximate meters per degree at equator
    const latOffset = bufferMeters / metersPerDegree;
    const lonOffset = bufferMeters / (metersPerDegree * Math.cos((latitude * Math.PI) / 180));

    // Build Earth Engine expression for Sentinel-2 imagery
    const eeExpression = {
      expression: {
        functionInvocationValue: {
          functionName: 'Image.visualize',
          arguments: {
            image: {
              functionInvocationValue: {
                functionName: 'Collection.first',
                arguments: {
                  collection: {
                    functionInvocationValue: {
                      functionName: 'Collection.sort',
                      arguments: {
                        collection: {
                          functionInvocationValue: {
                            functionName: 'Collection.filter',
                            arguments: {
                              collection: {
                                functionInvocationValue: {
                                  functionName: 'Collection.filterDate',
                                  arguments: {
                                    collection: {
                                      functionInvocationValue: {
                                        functionName: 'Collection.filterBounds',
                                        arguments: {
                                          collection: {
                                            functionInvocationValue: {
                                              functionName: 'ImageCollection.load',
                                              arguments: {
                                                id: { constantValue: 'COPERNICUS/S2_SR_HARMONIZED' },
                                              },
                                            },
                                          },
                                          geometry: {
                                            functionInvocationValue: {
                                              functionName: 'GeometryConstructors.Point',
                                              arguments: {
                                                coordinates: {
                                                  constantValue: [longitude, latitude],
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                    },
                                    start: { constantValue: '2023-01-01' },
                                    end: { constantValue: '2024-12-31' },
                                  },
                                },
                              },
                              filter: {
                                functionInvocationValue: {
                                  functionName: 'Filter.lt',
                                  arguments: {
                                    leftField: { constantValue: 'CLOUDY_PIXEL_PERCENTAGE' },
                                    rightValue: { constantValue: 20 },
                                  },
                                },
                              },
                            },
                          },
                        },
                        key: { constantValue: 'system:time_start' },
                        ascending: { constantValue: false },
                      },
                    },
                  },
                },
              },
            },
            bands: { constantValue: ['B4', 'B3', 'B2'] },
            min: { constantValue: 0 },
            max: { constantValue: 3000 },
          },
        },
      },
    };

    // Get thumbnail from Earth Engine
    const eeResponse = await fetch(
      'https://earthengine.googleapis.com/v1/projects/earthengine-public/thumbnails:getPixels',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: eeExpression,
          fileFormat: 'PNG',
          grid: {
            dimensions: {
              width: 512,
              height: 512,
            },
            affineTransform: {
              scaleX: (lonOffset * 2) / 512,
              shearX: 0,
              translateX: longitude - lonOffset,
              shearY: 0,
              scaleY: -(latOffset * 2) / 512,
              translateY: latitude + latOffset,
            },
            crsCode: 'EPSG:4326',
          },
        }),
      }
    );

    if (!eeResponse.ok) {
      const errorText = await eeResponse.text();
      throw new Error(`Earth Engine API error: ${errorText}`);
    }

    const imageBuffer = await eeResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return NextResponse.json({
      image: `data:image/png;base64,${base64Image}`,
      coordinates: { lat: latitude, lon: longitude },
      source: 'Google Earth Engine - Sentinel-2',
    });
  } catch (error) {
    console.error('Error fetching satellite image from GEE:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch satellite imagery from Google Earth Engine',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
