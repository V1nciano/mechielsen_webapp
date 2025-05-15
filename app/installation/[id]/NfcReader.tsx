'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";

interface NDEFRecord {
  recordType: string;
  data: Uint8Array;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFReadingEvent {
  message: NDEFMessage;
}

interface NDEFReader {
  scan(): Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
}

declare global {
  interface Window {
    NDEFReader: new () => NDEFReader;
  }
}

export default function NfcReader({ onScan }: { onScan?: (data: string) => void }) {
  const [nfcData, setNfcData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readNfcTag = async () => {
    setError(null);
    setNfcData(null);

    if ('NDEFReader' in window) {
      try {
        const ndef = new window.NDEFReader();
        await ndef.scan();
        ndef.onreading = (event: NDEFReadingEvent) => {
          const decoder = new TextDecoder();
          for (const record of event.message.records) {
            if (record.recordType === "text") {
              const data = decoder.decode(record.data);
              setNfcData(data);
              if (onScan) onScan(data);
            }
          }
        };
        alert('Scan een NFC tag met je telefoon');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Onbekende fout';
        setError('Fout bij lezen NFC tag: ' + errorMessage);
      }
    } else {
      setError('Web NFC wordt niet ondersteund op dit apparaat/browser.');
    }
  };

  return (
    <div>
      <Button onClick={readNfcTag}>Scan NFC Tag</Button>
      {nfcData && <div className="mt-4">NFC Data: {nfcData}</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
