'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { use } from 'react';

interface InstallationStep {
  id: string;
  machine_id: string;
  step_number: number;
  title: string;
  description: string;
  image: string;
  nfc_required: boolean;
  nfc_position?: string;
}

interface Machine {
  id: string;
  name: string;
  description: string;
  image: string;
  type: string;
}

export default function InstallationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<InstallationStep[]>([]);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [nfcStatus, setNfcStatus] = useState('Wacht op slang aansluiting...');
  const [tagDetected, setTagDetected] = useState(false);
  const [tagPosition, setTagPosition] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
    };

    const fetchData = async () => {
      try {
        // Haal machine details op
        const { data: machineData, error: machineError } = await supabase
          .from('machines')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (machineError) throw machineError;

        // Haal installatiestappen op
        const { data: stepsData, error: stepsError } = await supabase
          .from('installation_steps')
          .select('*')
          .eq('machine_id', resolvedParams.id)
          .order('step_number');

        if (stepsError) throw stepsError;

        setMachine(machineData);
        setSteps(stepsData || []);
      } catch (error) {
        console.error('Fout bij ophalen gegevens:', error);
        toast.error('Fout bij ophalen installatie-instructies');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    fetchData();
  }, [resolvedParams.id, router, supabase]);

  const checkNfcStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/nfc');
      const data = await response.json();

      if (data.tag_detected) {
        setTagDetected(true);
        setTagPosition(data.position);
        
        const currentStepData = steps[currentStep];
        if (currentStepData.nfc_required) {
          setNfcStatus('Slang correct aangesloten!');
          return true;
        }
      } else {
        setTagDetected(false);
        setTagPosition(null);
        setNfcStatus('Wacht op slang aansluiting...');
        return false;
      }
    } catch (error) {
      console.error('Fout bij controleren slang aansluiting:', error);
      setNfcStatus('Fout bij controleren slang aansluiting');
      return false;
    }
  }, [currentStep, steps]);

  // Poll for NFC status updates only on the final step
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.nfc_required && currentStep === steps.length - 1) {
      const interval = setInterval(checkNfcStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStep, steps, checkNfcStatus]);

  const handleNextStep = async () => {
    const currentStepData = steps[currentStep];
    
    // Only require NFC verification on the final step
    if (currentStepData.nfc_required && currentStep === steps.length - 1) {
      const nfcValid = await checkNfcStatus();
      if (!nfcValid) {
        toast.error('Slang niet correct aangesloten. Controleer de aansluiting.');
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setNfcStatus('Wacht op slang aansluiting...');
      setTagDetected(false);
      setTagPosition(null);
    } else {
      router.push('/verification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    );
  }

  if (!machine || steps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Fout</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Machine niet gevonden of geen installatie-instructies beschikbaar.</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Terug naar dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{machine.name}</h1>
          <p className="text-gray-600">Stap {currentStep + 1} van {steps.length}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentStepData.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="aspect-video">
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              
              <p className="text-gray-700">{currentStepData.description}</p>

              {currentStepData.nfc_required && (
                <div className={`p-4 rounded-lg ${
                  currentStep === steps.length - 1
                    ? tagDetected
                      ? 'bg-green-50'
                      : 'bg-blue-50'
                    : 'bg-gray-50'
                }`}>
                  <p className={`${
                    currentStep === steps.length - 1
                      ? tagDetected
                        ? 'text-green-700'
                        : 'text-blue-700'
                      : 'text-gray-700'
                  }`}>
                    {currentStep === steps.length - 1
                      ? tagDetected
                        ? 'Slang correct aangesloten!'
                        : 'Wacht op slang aansluiting...'
                      : 'Demonstratie: ' + currentStepData.nfc_position}
                  </p>
                  {currentStep === steps.length - 1 && tagDetected && (
                    <p className="text-sm mt-2">
                      Aansluitpunt: {tagPosition}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  Vorige stap
                </Button>
                <Button 
                  onClick={handleNextStep}
                  disabled={currentStep === steps.length - 1 && currentStepData.nfc_required && !tagDetected}
                >
                  {currentStep === steps.length - 1 ? 'Voltooien' : 'Volgende stap'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 