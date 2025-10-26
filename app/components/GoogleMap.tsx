'use client';

import { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export default function GoogleMap({
  center = { lat: 40.7128, lng: -74.0060 },
  zoom = 12,
  className = "w-full h-96"
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        setError('Google Maps API key not found');
        return;
      }

      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
        });

        const { Map } = await importLibrary('maps');

        if (mapRef.current) {
          new Map(mapRef.current, {
            center: center,
            zoom: zoom,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          });
        }
      } catch (err) {
        setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error loading Google Maps:', err);
      }
    };

    initMap();
  }, [center, zoom]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded`}>
        <p className="text-red-600 p-4">{error}</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
