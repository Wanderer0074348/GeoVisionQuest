'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import { CandidatePoint } from '@/types';
import ImageAnalyzer from '@/components/ImageAnalyzer';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-white">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const [candidates, setCandidates] = useState<CandidatePoint[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidatePoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const response = await fetch('/candidates.csv');
      const csvText = await response.text();

      Papa.parse<CandidatePoint>(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCandidates(results.data);
          setLoading(false);
        },
        error: (error: Error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error loading candidates:', error);
      setLoading(false);
    }
  };

  const handleMarkerClick = (candidate: CandidatePoint) => {
    setSelectedCandidate(candidate);
    setShowAnalyzer(true);
  };

  const handleCloseAnalyzer = () => {
    setShowAnalyzer(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">GeoVision Quest</h1>
            <p className="text-gray-400 text-sm mt-1">
              AI-Powered Archaeological Feature Detection in the Amazon
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Candidate Sites</p>
            <p className="text-2xl font-bold text-blue-400">
              {loading ? '...' : candidates.length}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading candidate sites...</p>
            </div>
          </div>
        ) : (
          <>
            <Map
              candidates={candidates}
              onMarkerClick={handleMarkerClick}
              selectedCandidate={selectedCandidate}
            />

            {/* Instructions Panel */}
            {!showAnalyzer && (
              <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-95 rounded-lg shadow-xl p-4 max-w-sm border border-gray-700 z-[1000]">
                <h3 className="text-lg font-semibold text-white mb-2">
                  How to Use
                </h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">1.</span>
                    Click on any marker to view its location
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">2.</span>
                    Satellite imagery will be loaded from Google Maps
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">3.</span>
                    Click &quot;Analyze with OpenAI&quot; to detect archaeological features
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">4.</span>
                    Review AI analysis and confidence scores
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Analyzer Modal */}
      {showAnalyzer && (
        <ImageAnalyzer
          candidate={selectedCandidate}
          onClose={handleCloseAnalyzer}
        />
      )}

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-3 text-center text-xs text-gray-500">
        Powered by OpenStreetMap, Google Maps Satellite, and OpenAI GPT-4 Vision
      </footer>
    </div>
  );
}
