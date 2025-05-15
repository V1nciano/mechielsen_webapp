'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function PictureInstructions({ installationId }: { installationId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      setLoading(true);
      setError(null);
      const supabase = createClientComponentClient();

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

      const { data: stappen, error: stappenError } = await supabase
        .from('installatie_stappen')
        .select('afbeelding_url')
        .eq('machine_id', installatie.machine_id)
        .not('afbeelding_url', 'is', null)
        .single();

      if (stappenError || !stappen) {
        // Fallback to the EWR150E-Hydraulic image if no image is found in the database
        setImageUrl('/images/EWR150E-Hydraulic.jpg');
        setLoading(false);
        return;
      }

      setImageUrl(stappen.afbeelding_url);
      setLoading(false);
    };

    fetchImage();
  }, [installationId]);

  if (loading) {
    return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center">Laden...</div>;
  }

  if (error) {
    return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center text-red-600">{error}</div>;
  }

  if (!imageUrl) {
    return <div className="max-w-md mx-auto mt-8 p-4 border rounded shadow text-center">Geen afbeelding beschikbaar.</div>;
  }

  return (
    <div className="relative w-full aspect-video">
      <Image
        src={imageUrl}
        alt="Installatie instructie"
        fill
        className="object-contain rounded-lg"
        priority
      />
    </div>
  );
}
