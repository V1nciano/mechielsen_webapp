'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { use } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import Image from "next/image";

interface InstallationStep {
  id: string;
  title: string;
  description: string;
  nfc_required: boolean;
  nfc_position?: string;
  stap_nummer: number;
  beschrijving: string;
}

interface MachineConfig {
  id: string;
  machine_id: string;
  systeem_type: string;
  max_druk: number;
  benodigd_debiet: number;
  aantal_slangen: number;
  waarschuwingen: string[];
}

interface NfcStatus {
  tag_detected: boolean;
  message: string;
  details: string;
  connectionStatus: 'waiting' | 'connected' | 'error';
  position?: string;
  timestamp?: number;
  error?: string | null;
}

interface StepInstructions {
  instructions: string[];
  image: string | null;
  imageAlt: string;
}

export default function InstallationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [steps, setSteps] = useState<InstallationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [machineConfig, setMachineConfig] = useState<MachineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [nfcStatus, setNfcStatus] = useState<NfcStatus>({
    tag_detected: false,
    message: 'Wacht op NFC tag...',
    details: 'Houd de slang bij de NFC lezer',
    connectionStatus: 'waiting'
  });
  const [checkingNfc, setCheckingNfc] = useState(false);
  const [connectedHoses, setConnectedHoses] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const VALID_TAGS = {
    'SUPPLY_LEFT': 'Aanvoerslang links',
    'RETURN_RIGHT': 'Retourslang rechts',
    'LEAK': 'Lekleiding'
  };

  const getStepInstructions = (step: InstallationStep): StepInstructions => {
    switch (step.stap_nummer) {
      case 1:
        return {
          instructions: [
            'Lees aandachtig de installatie-instructies',
            'Controleer of alle benodigde materialen aanwezig zijn',
            'Zorg voor een schone en veilige werkplek',
            'Volg de stappen in de juiste volgorde'
          ],
          image: null,
          imageAlt: ''
        };
      case 2:
        return {
          instructions: [
            'Bekijk de afbeelding voor de juiste aansluiting',
            'Let op de aangegeven aansluitpunten',
            'Controleer de richting van de slangen',
            'Zorg voor een correcte aansluiting'
          ],
          image: '/images/installation-diagram.jpg',
          imageAlt: 'Installatie diagram'
        };
      case 3:
        return {
          instructions: [
            'Houd de NFC tag van de slang bij de lezer',
            'Wacht op bevestiging van de verbinding',
            'Controleer of de slang correct is aangesloten',
            'Ga door naar de volgende stap na bevestiging'
          ],
          image: null,
          imageAlt: ''
        };
      case 4:
        return {
          instructions: [
            'Controleer de configuratie-instellingen',
            'Noteer de benodigde waarden',
            'Stel de machine in volgens de specificaties',
            'Verifieer alle instellingen'
          ],
          image: null,
          imageAlt: ''
        };
      default:
        return {
          instructions: [step.beschrijving],
          image: null,
          imageAlt: ''
        };
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: installation, error: installationError } = await supabase
          .from('gebruikers_installaties')
          .select(`
            machine_id,
            status
          `)
          .eq('id', resolvedParams.id)
          .single();

        if (installationError) throw new Error('Kon installatie niet ophalen');
        if (!installation) throw new Error('Installatie niet gevonden');

        const { data: config, error: configError } = await supabase
          .from('machine_configuraties')
          .select('*')
          .eq('machine_id', installation.machine_id)
          .single();

        if (configError) throw new Error('Kon machine configuratie niet ophalen');
        setMachineConfig(config);

        const { data: stepsData, error: stepsError } = await supabase
          .from('installatie_stappen')
          .select(`
            id,
            machine_id,
            stap_nummer,
            beschrijving,
            nfc_vereist
          `)
          .eq('machine_id', installation.machine_id)
          .order('stap_nummer');

        if (stepsError) throw new Error('Kon installatiestappen niet ophalen');
        
        console.log('Installation steps:', stepsData);
        
        if (stepsData && stepsData.length > 0) {
          const transformedSteps = stepsData.map(step => ({
            id: step.id,
            title: `Stap ${step.stap_nummer}`,
            description: step.beschrijving,
            nfc_required: step.nfc_vereist,
            nfc_position: step.stap_nummer === 1 ? 'SUPPLY_LEFT' : 
                         step.stap_nummer === 2 ? 'RETURN_RIGHT' : 
                         step.stap_nummer === 3 ? 'LEAK' : undefined,
            stap_nummer: step.stap_nummer,
            beschrijving: step.beschrijving
          }));
          setSteps(transformedSteps);
        } else {
          const defaultSteps = [
            {
              id: '1',
              title: 'Stap 1: Aanvoerslang aansluiten',
              description: 'Sluit de aanvoerslang aan aan de linkerkant van de machine',
              nfc_required: true,
              nfc_position: 'SUPPLY_LEFT',
              stap_nummer: 1,
              beschrijving: 'Sluit de aanvoerslang aan aan de linkerkant van de machine'
            },
            {
              id: '2',
              title: 'Stap 2: Retourslang aansluiten',
              description: 'Sluit de retourslang aan aan de rechterkant van de machine',
              nfc_required: true,
              nfc_position: 'RETURN_RIGHT',
              stap_nummer: 2,
              beschrijving: 'Sluit de retourslang aan aan de rechterkant van de machine'
            },
            {
              id: '3',
              title: 'Stap 3: Lekleiding aansluiten',
              description: 'Sluit de lekleiding aan op de aangegeven positie',
              nfc_required: true,
              nfc_position: 'LEAK',
              stap_nummer: 3,
              beschrijving: 'Sluit de lekleiding aan op de aangegeven positie'
            }
          ];
          setSteps(defaultSteps);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Fout bij ophalen gegevens');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resolvedParams.id, router, supabase]);

  // Start polling when component mounts and current step requires NFC
  useEffect(() => {
    const currentStepData = steps[currentStep];
    if (currentStepData?.nfc_required) {
      // Clear any existing interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Start new polling interval with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      const checkWithRetry = async () => {
        try {
          await checkNfcStatus();
          retryCount = 0; // Reset retry count on success
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error('Max retries reached for NFC check');
            retryCount = 0;
          }
        }
      };

      // Initial check
      checkWithRetry();

      // Set up polling
      const interval = setInterval(checkWithRetry, 2000); // Check every 2 seconds
      setPollingInterval(interval);

      // Cleanup
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [currentStep, steps]);

  const checkNfcStatus = async () => {
    try {
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/nfc', {
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error('NFC error:', data.error);
        setNfcStatus({
          tag_detected: false,
          message: 'Fout bij controleren',
          details: data.error,
          connectionStatus: 'error',
          timestamp: data.timestamp,
          error: data.error
        });
        return;
      }

      const currentStepData = steps[currentStep];
      if (currentStepData?.nfc_required && currentStepData.nfc_position) {
        if (data.tag_detected) {
          const expectedPosition = currentStepData.nfc_position.toUpperCase();
          if (data.position === expectedPosition) {
            if (!connectedHoses.includes(expectedPosition)) {
              setConnectedHoses([...connectedHoses, expectedPosition]);
              toast.success('Slang correct aangesloten!');
            }
            setNfcStatus({
              ...data,
              message: 'Slang correct aangesloten',
              details: `Positie: ${VALID_TAGS[expectedPosition as keyof typeof VALID_TAGS]}`,
              connectionStatus: 'connected'
            });
          } else {
            setNfcStatus({
              ...data,
              message: 'Verkeerde slang',
              details: `Verwacht: ${VALID_TAGS[expectedPosition as keyof typeof VALID_TAGS]}`,
              connectionStatus: 'error'
            });
          }
        } else {
          setNfcStatus({
            ...data,
            message: 'Wacht op NFC tag...',
            details: 'Houd de slang bij de NFC lezer',
            connectionStatus: 'waiting'
          });
        }
      }

    } catch (error) {
      console.error('Error checking NFC status:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setNfcStatus({
            tag_detected: false,
            message: 'Timeout',
            details: 'Geen reactie van de NFC lezer. Controleer de verbinding.',
            connectionStatus: 'error',
            error: 'Timeout'
          });
        } else {
          setNfcStatus({
            tag_detected: false,
            message: 'Fout bij controleren',
            details: error.message,
            connectionStatus: 'error',
            error: error.message
          });
        }
      }
    }
  };

  const handleNextStep = async () => {
    const currentStepData = steps[currentStep];
    
    if (currentStepData.nfc_required && currentStep === steps.length - 1) { // Only check on last step
      if (!nfcStatus.tag_detected || !nfcStatus.position || 
          nfcStatus.position !== currentStepData.nfc_position?.toUpperCase()) {
        toast.error('Slang moet op de juiste positie aangesloten zijn voordat je de installatie kunt voltooien');
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setNfcStatus({
        tag_detected: false,
        message: 'Wacht op NFC tag...',
        details: 'Houd de slang bij de NFC lezer',
        connectionStatus: 'waiting'
      });
      setCurrentStep(prevStep => prevStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const { error } = await supabase
        .from('gebruikers_installaties')
        .update({ status: 'completed' })
        .eq('id', resolvedParams.id);

      if (error) {
        console.error('Error completing installation:', error);
        toast.error('Fout bij voltooien installatie');
        return;
      }

      toast.success('Installatie succesvol voltooid!');
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Gegevens worden geladen...</p>
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const stepInstructions = currentStepData ? getStepInstructions(currentStepData) : null;

  return (
    <div className="min-h-screen p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Installatie Stap {currentStep + 1} van {steps.length}</CardTitle>
              <CardDescription>{currentStepData?.title}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextStep}
                disabled={currentStep === steps.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {stepInstructions && (
              <div className="space-y-4">
                <h3 className="font-semibold">Instructies:</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  {stepInstructions.instructions.map((instruction, index) => (
                    <li key={index} className="text-gray-700">{instruction}</li>
                  ))}
                </ol>
              </div>
            )}

            {currentStep === 1 && stepInstructions?.image && (
              <div className="mt-4">
                <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={stepInstructions.image}
                    alt={stepInstructions.imageAlt}
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {stepInstructions.imageAlt}
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">NFC Status:</p>
                    <div className="flex items-center gap-2">
                      {nfcStatus.connectionStatus === 'connected' && (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <p className="text-green-600">Slang correct aangesloten</p>
                        </>
                      )}
                      {nfcStatus.connectionStatus === 'error' && (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <p className="text-red-600">Slang niet juist aangesloten</p>
                        </>
                      )}
                      {nfcStatus.connectionStatus === 'waiting' && (
                        <>
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <p className="text-yellow-600">Wacht op NFC tag...</p>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {currentStepData?.nfc_position 
                        ? `Verwacht: ${VALID_TAGS[currentStepData.nfc_position.toUpperCase() as keyof typeof VALID_TAGS]}`
                        : nfcStatus.details}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && machineConfig && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Configuratie-instellingen:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="font-medium">Druk-instellingen:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Maximale druk: {machineConfig.max_druk} bar</li>
                      <li>Werkdruk: {machineConfig.max_druk * 0.8} bar</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Debiet-instellingen:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Benodigd debiet: {machineConfig.benodigd_debiet} l/min</li>
                      <li>Minimaal debiet: {machineConfig.benodigd_debiet * 0.9} l/min</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-medium">Systeem-specificaties:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Systeem type: {machineConfig.systeem_type}</li>
                    <li>Aantal slangen: {machineConfig.aantal_slangen}</li>
                  </ul>
                </div>
                {machineConfig.waarschuwingen && machineConfig.waarschuwingen.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-red-600">Waarschuwingen:</h3>
                    <ul className="list-disc pl-5 space-y-1 text-red-600">
                      {machineConfig.waarschuwingen.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                Vorige
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={currentStepData?.nfc_required && 
                         (!nfcStatus.tag_detected || 
                          !nfcStatus.position || 
                          nfcStatus.position !== currentStepData.nfc_position?.toUpperCase())}
              >
                {currentStep === steps.length - 1 ? 'Voltooien' : 'Volgende'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 