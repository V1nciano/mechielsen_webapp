import React from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from './button';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  label?: string;
}

interface IDetectedBarcode {
  rawValue: string;
}

export default function QRScanner({ onScan, onClose, label }: QRScannerProps) {
  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const firstCode = detectedCodes[0];
      if (firstCode?.rawValue) {
        onScan(firstCode.rawValue);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90 p-4">
      <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">{label || 'Scan QR Code'}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="w-full h-80 rounded-lg overflow-hidden mb-4 bg-gray-100">
          <Scanner
            onScan={handleScan}
            onError={(error: unknown) => console.log(error)}
            constraints={{
              facingMode: 'environment'
            }}
            styles={{
              container: {
                width: '100%',
                height: '100%'
              },
              video: {
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }
            }}
          />
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          Richt de camera op een QR-code om te scannen
        </p>
      </div>
    </div>
  );
} 