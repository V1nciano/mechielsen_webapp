'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  nfc_required: boolean;
  nfc_position?: string;
}

export default function VerificationPage() {
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nfcStatus, setNfcStatus] = useState('Wacht op NFC tag...');
  const [verificationComplete, setVerificationComplete] = useState(false);
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

    const fetchVerificationSteps = async () => {
      try {
        const { data, error } = await supabase
          .from('verification_steps')
          .select('*')
          .order('id');

        if (error) throw error;

        setSteps(data || []);
      } catch (error) {
        console.error('Fout bij ophalen verificatiestappen:', error);
        toast.error('Fout bij ophalen verificatiestappen');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    fetchVerificationSteps();
  }, [router, supabase]);

  const checkNfcStatus = async () => {
    try {
      const response = await fetch('/api/nfc');
      const data = await response.json();

      if (data.tag_detected) {
        const currentStepData = steps[currentStep];
        if (currentStepData.nfc_required && data.position === currentStepData.nfc_position) {
          toast.success('NFC tag correct gescand!');
          setNfcStatus('Tag correct gescand');
          return true;
        } else {
          toast.error('Verkeerde tag gescand');
          setNfcStatus('Verkeerde tag gescand');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('Fout bij controleren NFC status:', error);
      toast.error('Fout bij controleren NFC status');
      return false;
    }
  };

  const handleNextStep = async () => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData.nfc_required) {
      const nfcValid = await checkNfcStatus();
      if (!nfcValid) return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setNfcStatus('Wacht op NFC tag...');
    } else {
      setVerificationComplete(true);
      toast.success('Installatie succesvol geverifieerd!');
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

  if (verificationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-green-600">Installatie Voltooid!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Alle stappen zijn succesvol geverifieerd.</p>
            <p>De machine is correct geïnstalleerd en klaar voor gebruik.</p>
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
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
          <h1 className="text-3xl font-bold">Verificatie Installatie</h1>
          <p className="text-gray-600">Stap {currentStep + 1} van {steps.length}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentStepData.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-gray-700">{currentStepData.description}</p>

              {currentStepData.nfc_required && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-700">
                    Scan de NFC tag op positie: {currentStepData.nfc_position}
                  </p>
                  <p className="text-sm text-blue-600 mt-2">{nfcStatus}</p>
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
                <Button onClick={handleNextStep}>
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