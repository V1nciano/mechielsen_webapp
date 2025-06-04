'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, Cable, ArrowRight, CheckCircle2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';

interface Machine {
  id: string;
  naam: string;
  type: string;
  beschrijving?: string;
  afbeelding?: string;
}

interface HydraulicInput {
  id: string;
  input_nummer: number;
  kleur: string;
}

interface Attachment {
  id: string;
  naam: string;
  type: string;
  afbeelding?: string;
  hydraulic_hoses?: AttachmentHose[];
}

interface AttachmentHose {
  id: string;
  kleur: string;
  volgorde: number;
}

const KLEUREN = [
  { value: 'rood', label: 'Rood', color: 'bg-red-500', textColor: 'text-white' },
  { value: 'blauw', label: 'Blauw', color: 'bg-blue-500', textColor: 'text-white' },
  { value: 'geel', label: 'Geel', color: 'bg-yellow-400', textColor: 'text-black' },
  { value: 'groen', label: 'Groen', color: 'bg-green-500', textColor: 'text-white' },
  { value: 'zwart', label: 'Zwart', color: 'bg-black', textColor: 'text-white' },
  { value: 'wit', label: 'Wit', color: 'bg-white border-2 border-gray-300', textColor: 'text-black' },
  { value: 'oranje', label: 'Oranje', color: 'bg-orange-500', textColor: 'text-white' },
  { value: 'paars', label: 'Paars', color: 'bg-purple-500', textColor: 'text-white' }
];

export default function VisualConfigPage() {
  const params = useParams();
  const machineId = params?.machineId as string;
  
  const [machine, setMachine] = useState<Machine | null>(null);
  const [hydraulicInputs, setHydraulicInputs] = useState<HydraulicInput[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch machine info
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('*')
        .eq('id', machineId)
        .single();

      if (machineError) {
        console.error('Error fetching machine:', machineError);
        router.push('/dashboard');
        return;
      }

      setMachine(machineData);

      // Fetch hydraulic inputs for this machine
      const { data: hydraulicInputsData, error: hydraulicError } = await supabase
        .from('machine_hydraulic_inputs')
        .select('*')
        .eq('machine_id', machineId)
        .order('volgorde', { ascending: true });

      if (hydraulicError) {
        console.error('Error fetching hydraulic inputs:', hydraulicError);
        toast.error('Fout bij ophalen hydraulische inputs');
      } else {
        setHydraulicInputs(hydraulicInputsData || []);
      }

      // Fetch attachments for this machine with their hoses
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select(`
          *,
          hydraulic_hoses:attachment_hydraulic_hoses(
            id,
            kleur,
            volgorde
          )
        `)
        .order('naam', { ascending: true });

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
        toast.error('Fout bij ophalen aanbouwdelen');
      } else {
        setAttachments(attachmentsData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [machineId, supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getKleurDisplay = (kleur: string, size = 'w-8 h-8') => {
    const kleurInfo = KLEUREN.find(k => k.value === kleur);
    if (!kleurInfo) return null;
    
    return (
      <div className={`${size} rounded-full ${kleurInfo.color} flex items-center justify-center shadow-sm border-2 border-white`}>
        <span className={`text-xs font-bold ${kleurInfo.textColor}`}>
          {kleur === 'rood' ? 'R' : kleur === 'blauw' ? 'B' : kleur === 'geel' ? 'G' : 
           kleur === 'groen' ? 'GR' : kleur === 'zwart' ? 'Z' : kleur === 'wit' ? 'W' :
           kleur === 'oranje' ? 'O' : 'P'}
        </span>
      </div>
    );
  };

  const getMatchingConnections = () => {
    const connections: Array<{inputId: string, inputKleur: string, inputNummer: number, attachmentId: string, attachmentNaam: string, hoseKleur: string, hoseVolgorde: number}> = [];
    
    hydraulicInputs.forEach(input => {
      attachments.forEach(attachment => {
        attachment.hydraulic_hoses?.forEach(hose => {
          if (input.kleur === hose.kleur) {
            connections.push({
              inputId: input.id,
              inputKleur: input.kleur,
              inputNummer: input.input_nummer,
              attachmentId: attachment.id,
              attachmentNaam: attachment.naam,
              hoseKleur: hose.kleur,
              hoseVolgorde: hose.volgorde
            });
          }
        });
      });
    });
    
    return connections;
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

  const connections = getMatchingConnections();

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Slangconfiguratie</h1>
              <p className="text-gray-600">{machine?.naam} ({machine?.type})</p>
            </div>
          </div>
        </div>

        {/* Main Layout: Machine links, Verbindingen midden, Aanbouwdelen rechts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Links: Machine met Hydraulische Inputs */}
          <div className="lg:col-span-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Machine: {machine?.naam}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Machine Image */}
                {machine?.afbeelding && (
                  <div className="mb-6">
                    <Image
                      src={machine.afbeelding}
                      alt={machine.naam}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
                
                {/* Hydraulische Inputs */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700 mb-3">Hydraulische Inputs</h3>
                  {hydraulicInputs.map((input) => (
                    <div key={input.id} className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-100">
                      {getKleurDisplay(input.kleur, 'w-10 h-10')}
                      <div>
                        <p className="font-medium text-lg">Input {input.input_nummer}</p>
                        <p className="text-sm text-gray-600 capitalize">{input.kleur} aansluiting</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Midden: Verbindingen Overzicht */}
          <div className="lg:col-span-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-green-600" />
                  Kleur Verbindingen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connections.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Gevonden verbindingen op basis van kleurcodering:
                    </p>
                    {connections.map((conn, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          {getKleurDisplay(conn.inputKleur, 'w-6 h-6')}
                          <span className="text-sm font-medium">Input {conn.inputNummer}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div className="flex items-center gap-2">
                          {getKleurDisplay(conn.hoseKleur, 'w-6 h-6')}
                          <div className="text-sm">
                            <p className="font-medium">{conn.attachmentNaam}</p>
                            <p className="text-gray-500">Slang {conn.hoseVolgorde}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Aansluiting Voltooid Knop */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              // Find the most connected attachment
                              const attachmentConnections = connections.reduce((acc, conn) => {
                                acc[conn.attachmentId] = (acc[conn.attachmentId] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>);
                              
                              const mostConnectedId = Object.entries(attachmentConnections)
                                .sort(([,a], [,b]) => b - a)[0]?.[0];
                              
                              if (mostConnectedId) {
                                const attachment = attachments.find(a => a.id === mostConnectedId);
                                if (attachment) {
                                  setSelectedAttachment(attachment);
                                }
                              }
                            }}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                            Aansluiting Voltooid - Toon Specificaties
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Settings className="w-5 h-5" />
                              Aansluiting Voltooid: {selectedAttachment?.naam}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedAttachment && (
                            <div className="space-y-6">
                              {/* Attachment Overview & Machine Settings in one box */}
                              <div className="bg-white border rounded-lg p-6 space-y-6">
                                {/* Photo and Attachment Info */}
                                <div className="flex flex-col items-center text-center">
                                  {selectedAttachment.afbeelding && (
                                    <Image
                                      src={selectedAttachment.afbeelding}
                                      alt={selectedAttachment.naam}
                                      width={200}
                                      height={200}
                                      className="w-48 h-48 object-cover rounded-lg border mb-4"
                                    />
                                  )}
                                  <div>
                                    <h4 className="font-medium text-xl">{selectedAttachment.naam}</h4>
                                    <p className="text-gray-600">{selectedAttachment.type}</p>
                                    <p className="text-sm text-green-600 font-medium mt-2">
                                      {connections.filter(conn => conn.attachmentId === selectedAttachment.id).length} verbinding(en) actief
                                    </p>
                                  </div>
                                </div>

                                {/* Machine Settings */}
                                <div className="border-t pt-6">
                                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-orange-600" />
                                    Machine Instellingen
                                  </h3>
                                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 p-4 rounded-xl">
                                    <h5 className="font-semibold text-orange-800 mb-3">🔧 Aanbevolen Instellingen:</h5>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="font-medium text-gray-700">Hydraulische Druk:</span>
                                        <span className="font-bold text-orange-600">200-250 bar</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="font-medium text-gray-700">Flow Rate:</span>
                                        <span className="font-bold text-orange-600">60-100 l/min</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="font-medium text-gray-700">Olie Temperatuur:</span>
                                        <span className="font-bold text-orange-600">40-80°C</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="font-medium text-gray-700">Filter Status:</span>
                                        <span className="font-bold text-red-600">Controleren!</span>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                                      <p className="text-sm text-orange-800 font-medium">
                                        ⚠️ Controleer deze instellingen op uw machine voordat u het aanbouwdeel gebruikt
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Verbindingen Overzicht */}
                              <div>
                                <h3 className="font-semibold text-lg mb-3">Verbindingen Overzicht</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {connections
                                    .filter(conn => conn.attachmentId === selectedAttachment.id)
                                    .map((conn, index) => (
                                      <div key={index} className="border rounded-lg p-4 bg-green-50">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            {getKleurDisplay(conn.inputKleur, 'w-8 h-8')}
                                            <span className="font-medium">Input {conn.inputNummer}</span>
                                          </div>
                                          <ArrowRight className="w-4 h-4 text-gray-400" />
                                          <div className="flex items-center gap-2">
                                            {getKleurDisplay(conn.hoseKleur, 'w-8 h-8')}
                                            <span className="font-medium">Slang {conn.hoseVolgorde}</span>
                                          </div>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                          Machine input {conn.inputKleur} → Attachment slang {conn.hoseKleur}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                              
                              {/* Veiligheids Instructies */}
                              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                <h3 className="font-semibold text-lg mb-3 text-red-800">🚨 Veiligheids Instructies</h3>
                                <div className="text-sm text-red-700 space-y-2">
                                  <p>• <strong>Voor aansluiting:</strong> Zet machine uit en laat hydraulische druk aflopen</p>
                                  <p>• <strong>Tijdens aansluiting:</strong> Controleer alle koppelingen op juiste bevestiging</p>
                                  <p>• <strong>Na aansluiting:</strong> Test functionaliteit op lage snelheid</p>
                                  <p>• <strong>Controle:</strong> Check op lekkages bij alle aansluitpunten</p>
                                </div>
                              </div>
                              
                              {/* Acties */}
                              <div className="flex justify-between items-center pt-4 border-t">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setCompletionDialogOpen(false)}
                                >
                                  Sluiten
                                </Button>
                                <Button 
                                  onClick={() => {
                                    toast.success(`Aansluiting voltooid voor ${selectedAttachment.naam}!`);
                                    setCompletionDialogOpen(false);
                                    router.push('/dashboard');
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Bevestig Aansluiting
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">🔍</div>
                    <p className="text-gray-500">Geen kleurverbindingen gevonden</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Slangkleuren moeten overeenkomen met machine input kleuren
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rechts: Aanbouwdelen met Slangen */}
          <div className="lg:col-span-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cable className="w-5 h-5 text-orange-600" />
                  Aanbouwdelen & Slangen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center gap-3 mb-3">
                        {attachment.afbeelding && (
                          <Image
                            src={attachment.afbeelding}
                            alt={attachment.naam}
                            width={50}
                            height={50}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                        <div>
                          <p className="font-medium">{attachment.naam}</p>
                          <p className="text-sm text-gray-600">{attachment.type}</p>
                        </div>
                      </div>
                      
                      {/* Slangen van dit aanbouwdeel */}
                      {attachment.hydraulic_hoses && attachment.hydraulic_hoses.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Slangen:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {attachment.hydraulic_hoses.map((hose) => {
                              const hasConnection = hydraulicInputs.some(input => input.kleur === hose.kleur);
                              return (
                                <div key={hose.id} className={`flex items-center gap-2 p-2 rounded border ${
                                  hasConnection ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                }`}>
                                  {getKleurDisplay(hose.kleur, 'w-6 h-6')}
                                  <div className="text-xs">
                                    <p className="font-medium">Slang {hose.volgorde}</p>
                                    <p className="text-gray-500 capitalize">{hose.kleur}</p>
                                  </div>
                                  {hasConnection && (
                                    <div className="ml-auto">
                                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Verbonden"></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Geen slangen geconfigureerd</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kleur Legenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {KLEUREN.map((kleur) => (
                  <div key={kleur.value} className="flex items-center gap-2">
                    {getKleurDisplay(kleur.value, 'w-6 h-6')}
                    <span className="text-sm capitalize">{kleur.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> Slangen worden automatisch verbonden met machine inputs op basis van kleurcodering. 
                  Zorg ervoor dat de slangkleuren overeenkomen met de machine input kleuren voor een correcte verbinding.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 