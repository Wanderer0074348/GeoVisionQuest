'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export default function GoogleMap({
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 12,
  className = "w-full h-96"
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        setError('Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file');
        return;
      }

      try {
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        const { Map } = await loader.importLibrary('maps');

        if (mapRef.current) {
          const newMap = new Map(mapRef.current, {
            center: center,
            zoom: zoom,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          });

          setMap(newMap);
        }
      } catch (err) {
        setError(`Failed to load Google Maps: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.error('Error loading Google Maps:', err);
      }
    };

    initMap();
  }, [center.lat, center.lng, zoom]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded`}>
        <p className="text-red-600 p-4">{error}</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}
