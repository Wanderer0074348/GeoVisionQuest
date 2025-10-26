import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';

async function getAccessToken() {
  const privateKey = process.env.EARTH_ENGINE_PRIVATE_KEY;
  const clientEmail = process.env.EARTH_ENGINE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Earth Engine credentials not configured');
  }

  const client = new JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/earthengine.readonly'],
  });

  const token = await client.getAccessToken();
  return token.token;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    const accessToken = await getAccessToken();

    const imageExpression = {
      expression: {
        functionInvocationValue: {
          functionName: 'ImageCollection.median',
          arguments: {
            collection: {
              functionInvocationValue: {
                functionName: 'ImageCollection.select',
                arguments: {
                  input: {
                    functionInvocationValue: {
                      functionName: 'ImageCollection.filter',
                      arguments: {
                        collection: {
                          functionInvocationValue: {
                            functionName: 'ImageCollection.filterDate',
                            arguments: {
                              collection: {
                                functionInvocationValue: {
                                  functionName: 'ImageCollection.filterBounds',
                                  arguments: {
                                    collection: {
                                      functionInvocationValue: {
                                        functionName: 'ImageCollection.load',
                                        arguments: {
                                          id: {
                                            constantValue: 'COPERNICUS/S2_SR_HARMONIZED'
                                          }
                                        }
                                      }
                                    },
                                    geometry: {
                                      functionInvocationValue: {
                                        functionName: 'GeometryConstructors.Point',
                                        arguments: {
                                          coordinates: {
                                            constantValue: [longitude, latitude]
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              },
                              start: {
                                constantValue: '2023-01-01'
                              },
                              end: {
                                constantValue: '2024-12-31'
                              }
                            }
                          }
                        },
                        filter: {
                          functionInvocationValue: {
                            functionName: 'Filter.lt',
                            arguments: {
                              name: {
                                constantValue: 'CLOUDY_PIXEL_PERCENTAGE'
                              },
                              value: {
                                constantValue: 20
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  bandSelectors: {
                    constantValue: ['B4', 'B3', 'B2']
                  }
                }
              }
            }
          }
        }
      }
    };

    const buffer = 500;

    const thumbnailRequest = {
      expression: imageExpression.expression,
      fileFormat: 'PNG',
      bandIds: ['B4', 'B3', 'B2'],
      visualizationOptions: {
        ranges: [
          { min: 0, max: 3000 },
          { min: 0, max: 3000 },
          { min: 0, max: 3000 }
        ]
      },
      grid: {
        dimensions: {
          width: 640,
          height: 640
        },
        affineTransform: {
          scaleX: (buffer * 2) / 640,
          shearX: 0,
          translateX: longitude - buffer / 111320,
          shearY: 0,
          scaleY: -(buffer * 2) / 640,
          translateY: latitude + buffer / 110540
        },
        crsCode: 'EPSG:4326'
      }
    };

    const response = await fetch(
      'https://earthengine.googleapis.com/v1/projects/earthengine-legacy/thumbnails:compute',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(thumbnailRequest),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Earth Engine API error: ${error}`);
    }

    const data = await response.json();

    if (!data.data) {
      throw new Error('No image data returned from Earth Engine');
    }

    return NextResponse.json({
      image: `data:image/png;base64,${data.data}`,
      coordinates: { lat: latitude, lon: longitude },
      source: 'Sentinel-2 (Google Earth Engine)',
    });
  } catch (error) {
    console.error('Error fetching satellite image:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch satellite imagery',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
