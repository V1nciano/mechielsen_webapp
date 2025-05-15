'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';

interface Step {
  id: string;
  stap_nummer: number;
  beschrijving: string;
  afbeelding_url?: string;
  nfc_vereist?: boolean;
}

interface AttachmentDetails {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  gewicht?: number;
  werkdruk?: number;
  max_druk?: number;
  debiet?: number;
  vermogen?: number;
  afbeelding?: string;
  extra_info?: string;
}

export default function InstallationStepper() {
  const params = useParams();
  const router = useRouter();
  const attachmentId = params?.attachmentId as string;
  const [steps, setSteps] = useState<Step[]>([]);
  const [step, setStep] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentDetails | null>(null);
  const [nfcVerified, setNfcVerified] = useState(false);

  useEffect(() => {
    if (!attachmentId) return;
    fetch(`/api/installatie_stappen?attachmentId=${attachmentId}`)
      .then(res => res.json())
      .then(data => setSteps(data));
    fetch(`/api/attachments/${attachmentId}`)
      .then(res => res.json())
      .then(data => setAttachment(data));
    setNfcVerified(false);
  }, [attachmentId]);

  if (!steps.length) return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center">Laden...</div>;

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-gray-50 rounded-xl shadow-lg">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Terug naar Dashboard</Button>
        <div className="flex gap-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${idx === step ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-300'} font-bold transition-all`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 bg-white rounded-lg shadow mb-6 text-center">
        <h2 className="text-xl font-bold mb-2">Stap {step + 1}</h2>
        <p className="mb-4">{steps[step].beschrijving}</p>
        {steps[step].afbeelding_url && (
          <Image
            src={`/images/${steps[step].afbeelding_url}`}
            alt="Instructie"
            width={400}
            height={240}
            className="mx-auto mb-4 max-h-60 rounded"
            style={{ objectFit: 'contain' }}
            priority
          />
        )}
        {steps[step].nfc_vereist && (
          <div className="mb-4">
            <Button variant="secondary" onClick={() => setNfcVerified(true)} disabled={nfcVerified}>Scan NFC</Button>
            {nfcVerified && (
              <div className="mt-3 p-3 bg-green-100 text-green-700 rounded">Slangen goed aangesloten</div>
            )}
          </div>
        )}
        {/* Extra info dropdown */}
        {attachment?.extra_info && (
          <Collapsible className="mt-4 text-left">
            <CollapsibleTrigger className="flex items-center gap-2 text-primary font-medium">
              <ChevronDown className="w-4 h-4" /> Meer informatie
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">
              {attachment.extra_info}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>Vorige</Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>Volgende</Button>
        ) : (
          <Button onClick={() => setShowDialog(true)}>Voltooien</Button>
        )}
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <div className="flex flex-col items-center">
            {attachment?.afbeelding && (
              <Image
                src={`/images/${attachment.afbeelding}`}
                alt={attachment.naam}
                width={128}
                height={128}
                className="w-32 h-32 object-contain mb-4 rounded shadow"
                style={{ objectFit: 'contain' }}
                priority
              />
            )}
            <DialogTitle className="text-2xl font-bold mb-2 text-center">Installatie voltooid!</DialogTitle>
            <div className="text-gray-600 mb-4 text-center">De installatie van <span className="font-semibold text-primary">{attachment?.naam}</span> is succesvol afgerond.</div>
            <div className="w-full max-w-md bg-gray-50 rounded-lg p-4 mb-2">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="font-medium text-gray-700 py-1 pr-4">Type</td>
                    <td className="text-right text-gray-900">{attachment?.type}</td>
                  </tr>
                  {attachment?.gewicht !== undefined && (
                    <tr>
                      <td className="font-medium text-gray-700 py-1 pr-4">Gewicht</td>
                      <td className="text-right text-gray-900">{attachment.gewicht} kg</td>
                    </tr>
                  )}
                  {attachment?.werkdruk !== undefined && (
                    <tr>
                      <td className="font-medium text-gray-700 py-1 pr-4">Werkdruk</td>
                      <td className="text-right text-gray-900">{attachment.werkdruk} bar</td>
                    </tr>
                  )}
                  {attachment?.max_druk !== undefined && (
                    <tr>
                      <td className="font-medium text-gray-700 py-1 pr-4">Max druk</td>
                      <td className="text-right text-gray-900">{attachment.max_druk} bar</td>
                    </tr>
                  )}
                  {attachment?.debiet !== undefined && (
                    <tr>
                      <td className="font-medium text-gray-700 py-1 pr-4">Debiet</td>
                      <td className="text-right text-gray-900">{attachment.debiet} l/min</td>
                    </tr>
                  )}
                  {attachment?.vermogen !== undefined && (
                    <tr>
                      <td className="font-medium text-gray-700 py-1 pr-4">Vermogen</td>
                      <td className="text-right text-gray-900">{attachment.vermogen} W</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mt-4 text-gray-700 text-sm"><span className="font-medium">Beschrijving:</span> {attachment?.beschrijving}</div>
            </div>
            <div className="mt-6 flex justify-end w-full">
              <Button onClick={() => { setShowDialog(false); router.push('/dashboard'); }} className="w-full">Sluiten</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
