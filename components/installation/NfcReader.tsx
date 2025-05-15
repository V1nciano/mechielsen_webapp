'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";

export default function NfcReader() {
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = () => {
    setIsVerified(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Verificatie</h2>
      <p className="text-gray-600">
        Controleer of de slang goed is aangesloten.
      </p>
      
      {!isVerified ? (
        <Button 
          onClick={handleVerify} 
          className="w-full"
        >
          Verifiëren
        </Button>
      ) : (
        <div className="p-4 bg-green-100 text-green-700 rounded-md">
          <p>✓ Slang is goed aangesloten</p>
          <p className="text-sm mt-2">Je kunt nu op voltooien klikken om door te gaan.</p>
        </div>
      )}
    </div>
  );
} 