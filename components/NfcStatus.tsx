"use client";

import { useEffect, useState } from 'react';
import { checkNfcStatus } from '../lib/api';

interface NfcStatus {
  tag_detected: boolean;
  timestamp: number;
  error?: boolean;
  message?: string;
}

export default function NfcStatus() {
  const [status, setStatus] = useState<NfcStatus | null>(null);
  const [lastError, setLastError] = useState<string>('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await checkNfcStatus() as NfcStatus;
        setStatus(data);
        if (data.error) {
          setLastError(data.message || 'Unknown error');
        }
      } catch (error) {
        console.error('Error in fetchStatus:', error);
        setLastError('Failed to fetch status');
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">NFC Status</h2>
      
      {status ? (
        <>
          <div className={`p-4 rounded ${
            status.tag_detected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {status.tag_detected ? '✅ Tag gedetecteerd' : '❌ Geen tag'}
          </div>
          
          {status.error && (
            <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
              <p className="font-medium">⚠️ Connection Status:</p>
              <p>{status.message}</p>
              {lastError && <p className="text-sm mt-2">Last error: {lastError}</p>}
            </div>
          )}
          
          <p className="mt-2 text-sm text-gray-500">
            Laatste update: {new Date(status.timestamp).toLocaleTimeString()}
          </p>
        </>
      ) : (
        <div className="p-4 bg-gray-100 rounded">
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
}