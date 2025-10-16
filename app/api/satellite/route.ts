import { NextRequest, NextResponse } from 'next/server';
import ee from '@google/earthengine';

let eeInitialized = false;

async function initializeEE() {
  if (eeInitialized) return;

  const serviceAccount = process.env.GEE_SERVICE_ACCOUNT;
  const privateKey = process.env.GEE_PRIVATE_KEY;

  if (!serviceAccount || !privateKey) {
    throw new Error('Google Earth Engine credentials not configured');
  }

  // Replace escaped newlines in the private key
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  return new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      {
        client_email: serviceAccount,
        private_key: formattedKey,
      },
      () => {
        ee.initialize(
          null,
          null,
          () => {
            eeInitialized = true;
            resolve();
          },
          (error: Error) => {
            reject(error);
          }
        );
      },
      (error: Error) => {
        reject(error);
      }
    );
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const buffer = searchParams.get('buffer') || '500'; // Buffer in meters

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  try {
    await initializeEE();

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const bufferMeters = parseFloat(buffer);

    // Create point geometry
    const point = ee.Geometry.Point([longitude, latitude]);

    // Get Sentinel-2 imagery (similar to the notebook code)
    const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(point)
      .filterDate('2023-01-01', '2024-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .sort('system:time_start', false);

    const image = collection.first();

    // Create thumbnail URL
    const region = point.buffer(bufferMeters).bounds();

    const thumbUrl = image.getThumbURL({
      region: region.getInfo().coordinates,
      dimensions: 512,
      format: 'png',
      min: 0,
      max: 3000,
      bands: ['B4', 'B3', 'B2'], // RGB bands for true color
    });

    // Fetch the image from GEE
    const response = await fetch(thumbUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image from GEE: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
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
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
