'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PictureInstructions({ imageUrl }: { imageUrl: string }) {
  const [step, setStep] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [machineSpecs, setMachineSpecs] = useState<any>(null);

  useEffect(() => {
    const fetchMachine = async () => {
      const supabase = createClientComponentClient();
      // Stap 1: Haal installatie op
      const { data: installatie, error: instError } = await supabase
        .from('gebruikers_installaties')
        .select('machine_id')
        .eq('id', installationId)
        .single();

      if (instError || !installatie) return;

      // Stap 2: Haal machine op
      const { data: machine, error: machError } = await supabase
        .from('machines')
        .select('*')
        .eq('id', installatie.machine_id)
        .single();

      setMachineSpecs(machine);
    };

    fetchMachine();
  }, [installationId]);

  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2">Afbeelding</h2>
      <img src={imageUrl} alt="Instructie afbeelding" className="rounded shadow" />
    </div>
  );
}
