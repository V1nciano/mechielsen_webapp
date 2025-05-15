'use client';
import React, { useState, useEffect } from 'react';
import Instructions from './Instructions';
import PictureInstructions from './PictureInstructions';
import NfcReader from './NfcReader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InstallationStepper({ installationId }: { installationId: string }) {
  const [step, setStep] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [machineSpecs, setMachineSpecs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchMachineAndSteps = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClientComponentClient();
      // Stap 1: Haal installatie op
      const { data: installatie, error: instError } = await supabase
        .from('gebruikers_installaties')
        .select('machine_id')
        .eq('id', installationId)
        .single();

      if (instError || !installatie) {
        setError('Installatie niet gevonden.');
        setLoading(false);
        return;
      }

      // Stap 2: Haal machine op
      const { data: machine, error: machError } = await supabase
        .from('machines')
        .select('*')
        .eq('id', installatie.machine_id)
        .single();

      if (machError || !machine) {
        setError('Machine niet gevonden.');
        setLoading(false);
        return;
      }

      setMachineSpecs(machine);

      // Stap 3: Haal installatie stappen op
      const { data: stappen, error: stappenError } = await supabase
        .from('installatie_stappen')
        .select('*')
        .eq('machine_id', installatie.machine_id)
        .order('stap_nummer', { ascending: true });

      if (stappenError || !stappen) {
        setError('Installatiestappen niet gevonden.');
        setLoading(false);
        return;
      }

      // Selecteer de eerste stap van elk type
      const uitlegStap = stappen.find((stap: any) => stap.beschrijving && !stap.afbeelding_url && !stap.nfc_vereist);
      const fotoStap = stappen.find((stap: any) => stap.afbeelding_url);
      const nfcStap = stappen.find((stap: any) => stap.nfc_vereist);

      const dynamicSteps = [];
      if (uitlegStap) {
        dynamicSteps.push({
          label: `Stap 1`,
          content: (
            <div className="p-6 bg-white rounded-lg shadow mb-6">
              <Instructions description={uitlegStap.beschrijving} />
            </div>
          ),
        });
      } else {
        dynamicSteps.push({
          label: `Stap 1`,
          content: <div className="text-red-600">Geen uitleg gevonden.</div>,
        });
      }
      if (fotoStap) {
        dynamicSteps.push({
          label: `Stap 2`,
          content: (
            <div className="p-6 bg-white rounded-lg shadow mb-6">
              <PictureInstructions imageUrl={fotoStap.afbeelding_url} />
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 mt-2 text-primary font-medium">
                  <ChevronDown className="w-4 h-4" /> Uitleg bij deze foto
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-gray-700 bg-gray-50 p-3 rounded">
                  {fotoStap.beschrijving || 'Geen uitleg beschikbaar.'}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ),
        });
      } else {
        dynamicSteps.push({
          label: `Stap 2`,
          content: <div className="text-red-600">Geen foto-instructie gevonden.</div>,
        });
      }
      if (nfcStap) {
        dynamicSteps.push({
          label: `Stap 3`,
          content: (
            <div className="p-6 bg-white rounded-lg shadow mb-6">
              <NfcReader />
            </div>
          ),
        });
      } else {
        dynamicSteps.push({
          label: `Stap 3`,
          content: <div className="text-red-600">Geen NFC-check stap gevonden.</div>,
        });
      }
      setSteps(dynamicSteps);
      setLoading(false);
    };

    fetchMachineAndSteps();
  }, [installationId]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setShowDialog(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center">Laden...</div>;
  }

  if (error) {
    return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center text-red-600">{error}</div>;
  }

  if (steps.length === 0) {
    return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center">Geen instructies gevonden voor deze machine.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-gray-100 rounded-xl shadow-lg">
      <div className="mb-8 flex justify-center gap-2">
        {steps.map((s, idx) => (
          <div
            key={s.label}
            className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${idx === step ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-300'} font-bold transition-all`}
          >
            {idx + 1}
          </div>
        ))}
      </div>
      <div>{steps[step].content}</div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} disabled={step === 0}>Terug</Button>
        <Button onClick={handleNext}>{step === steps.length - 1 ? 'Voltooien' : 'Volgende'}</Button>
      </div>
      {showDialog && machineSpecs && (
        <Dialog open={showDialog} onOpenChange={handleDialogClose}>
          <DialogContent>
            <DialogTitle>Installatie voltooid!</DialogTitle>
            <div className="mt-4">
              <p><strong>Machine:</strong> {machineSpecs.naam}</p>
              <p><strong>Type:</strong> {machineSpecs.type}</p>
              <p><strong>Werkdruk:</strong> {machineSpecs.werkdruk} bar</p>
              <p><strong>Max druk:</strong> {machineSpecs.max_druk} bar</p>
              <p><strong>Debiet:</strong> {machineSpecs.debiet} l/min</p>
              <p><strong>Vermogen:</strong> {machineSpecs.vermogen} W</p>
              <p><strong>Beschrijving:</strong> {machineSpecs.beschrijving}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => handleDialogClose(false)}>Sluiten</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}