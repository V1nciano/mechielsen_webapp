'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AttachmentList from '@/components/dashboard/AttachmentList';
import type { Attachment } from '@/components/dashboard/AttachmentList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Settings, Circle, CheckCircle, Target } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Badge } from '@/components/ui/badge';

interface Machine {
  id: string;
  naam: string;
  type: string;
  hydraulische_inputs?: number;
  beschrijving?: string;
}

interface HydraulicInput {
  id: string;
  input_nummer: number;
  input_kleur: string;
  input_label: string;
  functie_beschrijving: string;
  volgorde: number;
  druk_rating?: number;
  debiet_rating?: number;
}

interface SelectedAttachment {
  inputId: string;
  attachment: Attachment;
  timestamp: Date;
}

const HYDRAULIC_KLEUREN = [
  { value: 'rood', label: 'Rood', color: 'bg-red-500', textColor: 'text-white' },
  { value: 'blauw', label: 'Blauw', color: 'bg-blue-500', textColor: 'text-white' },
  { value: 'geel', label: 'Geel', color: 'bg-yellow-400', textColor: 'text-black' },
  { value: 'groen', label: 'Groen', color: 'bg-green-500', textColor: 'text-white' },
  { value: 'zwart', label: 'Zwart', color: 'bg-black', textColor: 'text-white' },
  { value: 'wit', label: 'Wit', color: 'bg-white border-2 border-gray-300', textColor: 'text-black' },
  { value: 'oranje', label: 'Oranje', color: 'bg-orange-500', textColor: 'text-white' },
  { value: 'paars', label: 'Paars', color: 'bg-purple-500', textColor: 'text-white' }
];

export default function AttachmentsPage() {
  const params = useParams();
  const machineId = params?.machineId as string;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [hydraulicInputs, setHydraulicInputs] = useState<HydraulicInput[]>([]);
  const [selectedInput, setSelectedInput] = useState<HydraulicInput | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!machineId) return;
    fetchMachineAndAttachments();
  }, [machineId]);

  // Auto-select first available input when inputs are loaded
  useEffect(() => {
    if (hydraulicInputs.length > 0 && !selectedInput) {
      const firstInput = hydraulicInputs[0];
      setSelectedInput(firstInput);
    }
  }, [hydraulicInputs, selectedInput]);

  const fetchMachineAndAttachments = async () => {
    try {
      // Fetch machine info
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('id, naam, type, hydraulische_inputs, beschrijving')
        .eq('id', machineId)
        .single();

      if (machineError) {
        console.error('Error fetching machine:', machineError);
        router.push('/dashboard');
        return;
      }

      setMachine(machineData);

      // Fetch hydraulic inputs for this machine
      const { data: inputsData, error: inputsError } = await supabase
        .from('machine_hydraulic_inputs')
        .select('*')
        .eq('machine_id', machineId)
        .order('volgorde', { ascending: true });

      if (inputsError) {
        console.error('Error fetching hydraulic inputs:', inputsError);
      } else {
        setHydraulicInputs(inputsData || []);
      }

      // Fetch attachments
      const response = await fetch(`/api/attachments?machineId=${machineId}`);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        setAttachments([]);
      } else {
        setAttachments(data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKleurDisplay = (kleur: string) => {
    const kleurInfo = HYDRAULIC_KLEUREN.find(k => k.value === kleur);
    if (!kleurInfo) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full ${kleurInfo.color} flex items-center justify-center shadow-sm`}>
          <span className={`text-xs font-bold ${kleurInfo.textColor}`}>
            {kleur === 'rood' ? 'R' : kleur === 'blauw' ? 'B' : kleur === 'geel' ? 'G' : 
             kleur === 'groen' ? 'GR' : kleur === 'zwart' ? 'Z' : kleur === 'wit' ? 'W' :
             kleur === 'oranje' ? 'O' : 'P'}
          </span>
        </div>
        <span className="text-sm font-medium capitalize">{kleurInfo.label}</span>
      </div>
    );
  };

  const handleInputSelect = (input: HydraulicInput) => {
    setSelectedInput(input);
  };

  const handleAttachmentSelect = (attachment: Attachment) => {
    if (!selectedInput) return;

    // Add the attachment to selected inputs
    const newSelection: SelectedAttachment = {
      inputId: selectedInput.id,
      attachment,
      timestamp: new Date()
    };

    // Remove any existing selection for this input and add the new one
    const updatedSelections = selectedAttachments.filter(sel => sel.inputId !== selectedInput.id);
    updatedSelections.push(newSelection);
    setSelectedAttachments(updatedSelections);

    // Auto-advance to next input
    const currentIndex = hydraulicInputs.findIndex(input => input.id === selectedInput.id);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < hydraulicInputs.length) {
      // Move to next input
      const nextInput = hydraulicInputs[nextIndex];
      setSelectedInput(nextInput);
    } else {
      // All inputs filled, show completion message
      setSelectedInput(null);
    }
  };

  const getInputStatus = (input: HydraulicInput) => {
    const hasAttachment = selectedAttachments.find(sel => sel.inputId === input.id);
    const isSelected = selectedInput?.id === input.id;
    
    if (hasAttachment) return 'completed';
    if (isSelected) return 'active';
    return 'pending';
  };

  const getAttachmentForInput = (inputId: string) => {
    return selectedAttachments.find(sel => sel.inputId === inputId);
  };

  const resetSelection = () => {
    setSelectedAttachments([]);
    setSelectedInput(hydraulicInputs[0] || null);
  };

  const allInputsFilled = hydraulicInputs.length > 0 && 
    selectedAttachments.length === hydraulicInputs.length;

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="w-4 h-4" /> Terug naar dashboard
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => router.push(`/dashboard/machines/${machineId}/ventielen`)}
        >
          <Settings className="w-4 h-4" /> Ventielen Overzicht
        </Button>
        {selectedAttachments.length > 0 && (
          <Button
            variant="outline"
            onClick={resetSelection}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            Opnieuw beginnen
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      {hydraulicInputs.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Installatie Voortgang
              </span>
              <Badge variant={allInputsFilled ? "default" : "secondary"}>
                {selectedAttachments.length} / {hydraulicInputs.length} inputs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {hydraulicInputs.map((input, index) => {
                const status = getInputStatus(input);
                const selectedAttachment = getAttachmentForInput(input.id);
                
                return (
                  <div key={input.id} className="flex items-center gap-2">
                    <div className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer
                      ${status === 'completed' ? 'bg-green-50 border-green-300 text-green-800' :
                        status === 'active' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                        'bg-gray-50 border-gray-200 text-gray-600'}
                    `}
                    onClick={() => handleInputSelect(input)}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : status === 'active' ? (
                        <Target className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        Input {input.input_nummer}
                      </span>
                      {selectedAttachment && (
                        <span className="text-xs">
                          ({selectedAttachment.attachment.naam})
                        </span>
                      )}
                    </div>
                    {index < hydraulicInputs.length - 1 && (
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    )}
                  </div>
                );
              })}
            </div>
            {allInputsFilled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Alle inputs geconfigureerd!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Je kunt nu doorgaan met de installatie van de geselecteerde aanbouwdelen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Machine Info */}
      {machine && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {machine.naam} - Hydraulische Inputs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{machine.beschrijving}</p>
            <p className="text-sm text-gray-500 mb-4">
              {selectedInput ? 
                `Selecteer een aanbouwdeel voor ${selectedInput.input_label} (Input ${selectedInput.input_nummer})` :
                allInputsFilled ? 
                  'Alle inputs zijn geconfigureerd. Je kunt een input selecteren om te wijzigen.' :
                  'Klik op een hydraulische input om aanbouwdelen te bekijken.'
              }
            </p>
            
            {hydraulicInputs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {hydraulicInputs.map((input) => {
                  const status = getInputStatus(input);
                  const selectedAttachment = getAttachmentForInput(input.id);
                  
                  return (
                    <Card 
                      key={input.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        status === 'completed' ? 'ring-2 ring-green-500 bg-green-50' :
                        status === 'active' ? 'ring-2 ring-blue-500 bg-blue-50' :
                        'hover:bg-gray-50'
                      }`}
                      onClick={() => handleInputSelect(input)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : status === 'active' ? (
                              <Target className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="font-medium">Input {input.input_nummer}</span>
                          </div>
                          {getKleurDisplay(input.input_kleur)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-gray-900">{input.input_label}</p>
                          <p className="text-gray-600">{input.functie_beschrijving}</p>
                          {selectedAttachment && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <p className="text-xs font-medium text-green-700">
                                Geselecteerd: {selectedAttachment.attachment.naam}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedAttachment.attachment.type}
                              </p>
                            </div>
                          )}
                          {input.druk_rating && (
                            <p className="text-xs text-gray-500">Max: {input.druk_rating} bar</p>
                          )}
                          {input.debiet_rating && (
                            <p className="text-xs text-gray-500">Debiet: {input.debiet_rating} l/min</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Circle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Geen hydraulische inputs geconfigureerd</p>
                <p className="text-sm text-gray-400 mt-2">
                  De hydraulische inputs voor deze machine zijn nog niet ingesteld.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Input Info */}
      {selectedInput && (
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Actieve Input: {selectedInput.input_nummer} - {selectedInput.input_label}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {getKleurDisplay(selectedInput.input_kleur)}
              <div>
                <p className="font-medium">{selectedInput.functie_beschrijving}</p>
                <p className="text-sm text-gray-600">
                  Selecteer een aanbouwdeel hieronder. De interface gaat automatisch naar de volgende input.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments List */}
      {selectedInput ? (
        <div>
          <h2 className="text-xl font-bold mb-4">
            Aanbouwdelen voor {selectedInput.input_label}
          </h2>
          <AttachmentList 
            attachments={attachments} 
            onAttachmentSelect={handleAttachmentSelect}
          />
        </div>
      ) : allInputsFilled ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Installatie Complete!
          </h3>
          <p className="text-gray-500 mb-4">
            Alle hydraulische inputs zijn geconfigureerd. Je kunt nu de slangconfiguratie visueel instellen.
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Button
              onClick={() => router.push(`/dashboard/machines/${machineId}/visual-config`)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="w-4 h-4" />
              Visueel Configureren
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {selectedAttachments.map((selected) => {
              const input = hydraulicInputs.find(inp => inp.id === selected.inputId);
              return (
                <Button
                  key={selected.inputId}
                  variant="outline"
                  onClick={() => router.push(`/installations/${selected.attachment.id}`)}
                  className="flex items-center gap-2"
                >
                  Start installatie {input?.input_nummer}: {selected.attachment.naam}
                </Button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Selecteer een hydraulische input
          </h3>
          <p className="text-gray-500">
            Klik op een van de hydraulische inputs hierboven om compatible aanbouwdelen te bekijken.
          </p>
        </div>
      )}
    </div>
  );
}