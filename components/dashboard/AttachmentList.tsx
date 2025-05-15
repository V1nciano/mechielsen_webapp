'use client';

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export interface Attachment {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  afbeelding?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  backButton?: React.ReactNode;
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments, backButton }) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const qrRef = useRef<SVGSVGElement | null>(null);
  const router = useRouter();

  const handleShowQR = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setQrDialogOpen(true);
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
        downloadLink.download = `qr-${selectedAttachment?.naam || 'attachment'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
  };

  return (
    <div className="max-w-5xl mx-auto mt-10">
      {backButton}
      <h1 className="text-2xl font-bold mb-6">Kies een aanbouwdeel</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="bg-white border rounded-lg shadow-sm hover:shadow-lg transition-shadow p-4 flex flex-col items-center cursor-pointer"
            onClick={() => router.push(`/installations/${attachment.id}`)}
          >
            {attachment.afbeelding && (
              <Image
                src={`/images/${attachment.afbeelding}`}
                alt={attachment.naam}
                width={400}
                height={160}
                className="w-full h-40 object-contain mb-4 rounded"
                style={{ objectFit: 'contain' }}
                priority
              />
            )}
            <div className="font-semibold text-lg text-center mb-1">{attachment.naam}</div>
            <div className="text-sm text-gray-600 text-center mb-2">{attachment.beschrijving}</div>
            <div className="text-xs text-gray-400 mb-4">Type: {attachment.type}</div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleShowQR(attachment);
              }}
            >
              Toon QR-code
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogTitle>QR Code voor {selectedAttachment?.naam}</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {selectedAttachment && (
              <QRCodeSVG
                ref={qrRef}
                value={`${window.location.origin}/installations/${selectedAttachment.id}`}
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
};

export default AttachmentList; 