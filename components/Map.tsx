'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CandidatePoint } from '@/types';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  candidates: CandidatePoint[];
  onMarkerClick: (candidate: CandidatePoint) => void;
  selectedCandidate: CandidatePoint | null;
}

function MapController({ selectedCandidate }: { selectedCandidate: CandidatePoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedCandidate) {
      map.flyTo([selectedCandidate.latitude, selectedCandidate.longitude], 18, {
        duration: 1.5,
      });
    }
  }, [selectedCandidate, map]);

  return null;
}

export default function Map({ candidates, onMarkerClick, selectedCandidate }: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading map...</div>
      </div>
    );
  }

  // Default center to Amazon region
  const center: [number, number] = [-10.9, -69.67];

  return (
    <MapContainer
      center={center}
      zoom={10}
      className="w-full h-full"
      style={{ background: '#1a1a1a' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController selectedCandidate={selectedCandidate} />
      {candidates.map((candidate, index) => (
        <Marker
          key={index}
          position={[candidate.latitude, candidate.longitude]}
          eventHandlers={{
            click: () => onMarkerClick(candidate),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">Candidate #{index + 1}</p>
              <p>Lat: {candidate.latitude.toFixed(6)}</p>
              <p>Lon: {candidate.longitude.toFixed(6)}</p>
              <p>Elevation: {candidate.elevation}m</p>
              <button
                onClick={() => onMarkerClick(candidate)}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Analyze
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
