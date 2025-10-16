'use client';

import { useState, useEffect } from 'react';
import { CandidatePoint, ValidationResult } from '@/types';
import Image from 'next/image';

interface ImageAnalyzerProps {
  candidate: CandidatePoint | null;
  onClose: () => void;
}

export default function ImageAnalyzer({ candidate, onClose }: ImageAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (candidate) {
      fetchSatelliteImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  const fetchSatelliteImage = async () => {
    if (!candidate) return;

    setLoading(true);
    setError(null);
    setValidationResult(null);
    setImageUrl(null);

    try {
      const response = await fetch(
        `/api/satellite?lat=${candidate.latitude}&lon=${candidate.longitude}&zoom=18`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch satellite image');
      }

      const data = await response.json();
      setImageUrl(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch image');
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async () => {
    if (!imageUrl) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await response.json();
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!candidate) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Satellite Image Analysis</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 text-sm text-gray-300">
            <p>
              <span className="font-semibold">Location:</span> {candidate.latitude.toFixed(6)}, {candidate.longitude.toFixed(6)}
            </p>
            <p>
              <span className="font-semibold">Elevation:</span> {candidate.elevation}m
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {imageUrl && (
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-gray-800 rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt="Satellite imagery"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <button
                onClick={analyzeImage}
                disabled={analyzing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing with AI...
                  </>
                ) : (
                  'Analyze with OpenAI'
                )}
              </button>

              {validationResult && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Analysis Results</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        validationResult.isValid
                          ? 'bg-green-900 text-green-200'
                          : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {validationResult.isValid ? 'Valid Feature' : 'Not Valid'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Confidence</p>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${validationResult.confidence}%` }}
                        ></div>
                      </div>
                      <p className="text-right text-sm text-gray-300 mt-1">
                        {validationResult.confidence}%
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-1">Analysis</p>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        {validationResult.analysis}
                      </p>
                    </div>

                    {validationResult.features && validationResult.features.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Observed Features</p>
                        <div className="flex flex-wrap gap-2">
                          {validationResult.features.map((feature, index) => (
                            <span
                              key={index}
                              className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-xs"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
