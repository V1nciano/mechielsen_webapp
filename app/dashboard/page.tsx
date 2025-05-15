'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Machine } from '@/components/dashboard/MachineList';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const qrRef = React.useRef<SVGSVGElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/machines')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMachines(data);
        } else {
          setMachines([]);
          console.error('Error fetching machines:', data?.error || data);
        }
        setLoading(false);
      });
  }, []);

  const handleShowQR = (machine: Machine) => {
    setSelectedMachine(machine);
    setQrDialogOpen(true);
  };

  const handleSelectMachine = (machine: Machine) => {
    router.push(`/dashboard/machines/${machine.id}/attachments`);
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const img = new window.Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngFile;
        downloadLink.download = `qr-${selectedMachine?.naam || 'machine'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Hydraulische Machines Mechielsen</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Card
              key={machine.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectMachine(machine)}
            >
              <CardHeader>
                {machine.afbeelding && (
                  <Image
                    src={`/images/${machine.afbeelding}`}
                    alt={machine.naam}
                    width={400}
                    height={192}
                    className="w-full h-48 object-contain mb-4 rounded"
                    style={{ objectFit: 'contain' }}
                    priority
                  />
                )}
                <CardTitle>{machine.naam}</CardTitle>
                <CardDescription>{machine.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{machine.beschrijving}</p>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={e => {
                    e.stopPropagation();
                    handleShowQR(machine);
                  }}
                >
                  Toon QR-code
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogTitle>QR Code voor {selectedMachine?.naam}</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {selectedMachine && (
              <QRCodeSVG
                ref={qrRef}
                value={`${window.location.origin}/dashboard/machines/${selectedMachine.id}/attachments`}
                size={256}
                level="H"
                includeMargin={true}
              />
            )}
            <Button onClick={handleDownloadQR}>Download QR Code</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 