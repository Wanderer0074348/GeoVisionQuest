import { NextRequest, NextResponse } from 'next/server';
import ee from '@google/earthengine';

let eeInitialized = false;

async function initializeEE() {
  if (eeInitialized) return;

  const privateKey = process.env.EARTH_ENGINE_PRIVATE_KEY;
  const clientEmail = process.env.EARTH_ENGINE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error('Earth Engine credentials not configured');
  }

  return new Promise<void>((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      () => {
        ee.initialize(
          null,
          null,
          () => {
            eeInitialized = true;
            resolve();
          },
          (error: Error) => reject(error)
        );
      },
      (error: Error) => reject(error)
    );
  });
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
    await initializeEE();

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    const point = ee.Geometry.Point([longitude, latitude]);
    const region = point.buffer(500).bounds();

    const sentinel = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(point)
      .filterDate('2023-01-01', '2024-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .select(['B4', 'B3', 'B2'])
      .median();

    const visParams = {
      min: 0,
      max: 3000,
      dimensions: '640x640',
      region: region,
      format: 'png',
    };

    const url = sentinel.getThumbURL(visParams);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Earth Engine image: ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    return NextResponse.json({
      image: `data:image/png;base64,${base64Image}`,
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
