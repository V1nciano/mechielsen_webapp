'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, ArrowRight, ArrowDown, CheckCircle2, Settings } from 'lucide-react';
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
  werkdruk: number;
  max_druk: number;
  debiet?: number;
  vermogen?: number;
  gewicht?: number;
  hydraulic_hoses?: AttachmentHose[];
}

interface AttachmentHose {
  id: string;
  kleur: string;
  volgorde: number;
}



interface Connection {
  id: string;
  inputId: string;
  inputKleur: string;
  inputNummer: number;
  attachmentId: string;
  attachmentNaam: string;
  hoseKleur: string;
  hoseVolgorde: number;
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
  const searchParams = useSearchParams();
  const machineId = params?.machineId as string;
  const attachmentId = searchParams.get('attachmentId');
  
  const [machine, setMachine] = useState<Machine | null>(null);
  const [hydraulicInputs, setHydraulicInputs] = useState<HydraulicInput[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<{[key: string]: boolean}>({});
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

      // Fetch only attachments that are coupled to this machine
      let attachmentsQuery = supabase
        .from('attachment_machines')
        .select(`
          attachment:attachments(
            *,
            hydraulic_hoses:attachment_hydraulic_hoses(
              id,
              kleur,
              volgorde
            )
          )
        `)
        .eq('machine_id', machineId);

      // If a specific attachment ID is provided, filter to only that attachment
      if (attachmentId) {
        attachmentsQuery = attachmentsQuery.eq('attachment_id', attachmentId);
      }

      const { data: attachmentsData, error: attachmentsError } = await attachmentsQuery;

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
        toast.error('Fout bij ophalen aanbouwdelen');
      } else {
        // Extract attachments from the relationship data
        const coupledAttachments = attachmentsData
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.map((item: any) => item.attachment)
          .filter((attachment): attachment is Attachment => attachment !== null)
          .sort((a, b) => a.naam.localeCompare(b.naam)) || [];
        setAttachments(coupledAttachments);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [machineId, attachmentId, supabase, router]);

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

  const getMatchingConnections = (): Connection[] => {
    const connections: Connection[] = [];
    
    hydraulicInputs.forEach(input => {
      attachments.forEach(attachment => {
        attachment.hydraulic_hoses?.forEach(hose => {
          if (input.kleur === hose.kleur) {
            const connectionId = `${input.id}-${hose.id}`;
            connections.push({
              id: connectionId,
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

  const toggleConnectionStatus = (connectionId: string) => {
    setConnectionStatuses(prev => ({
      ...prev,
      [connectionId]: !prev[connectionId]
    }));
  };

  const areAllConnectionsChecked = (connections: Connection[]) => {
    return connections.length > 0 && connections.every(conn => connectionStatuses[conn.id]);
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
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Terug</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Slangconfiguratie</h1>
              <p className="text-sm sm:text-base text-gray-600 truncate">{machine?.naam} ({machine?.type})</p>
              {attachmentId && (
                <p className="text-xs sm:text-sm text-blue-600 mt-1">🔗 Geselecteerd aanbouwdeel wordt getoond</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Layout: Machine links, Verbindingen midden, Aanbouwdelen rechts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Links: Machine met Hydraulische Inputs */}
          <div className="md:col-span-1 lg:col-span-4">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span className="truncate">Machine: {machine?.naam}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Machine Image */}
                {machine?.afbeelding && (
                  <div className="mb-4 md:mb-6">
                    <Image
                      src={machine.afbeelding}
                      alt={machine.naam}
                      width={300}
                      height={200}
                      className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
                
                {/* Hydraulische Inputs */}
                <div className="space-y-2 md:space-y-3">
                  <h3 className="font-semibold text-gray-700 text-sm sm:text-base mb-2 md:mb-3">Hydraulische Inputs</h3>
                  {hydraulicInputs.map((input) => (
                    <div key={input.id} className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                      {getKleurDisplay(input.kleur, 'w-8 h-8 sm:w-10 sm:h-10')}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base text-blue-800">Input {input.input_nummer}</p>
                        <p className="text-xs sm:text-sm text-blue-600 capitalize truncate">{input.kleur} aansluiting</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Midden: Verbindingen Overzicht */}
          <div className="md:col-span-2 lg:col-span-4">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  Kleur Verbindingen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connections.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Gevonden verbindingen op basis van kleurcodering:
                    </p>
                    {connections.map((conn, index) => {
                      const isChecked = connectionStatuses[conn.id] || false;
                      return (
                        <div key={index} className={`relative p-2 lg:p-3 rounded-lg border-2 transition-all shadow-sm ${
                          isChecked 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-green-100' 
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}>
                          {/* Connection visual flow */}
                          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 lg:gap-3">
                            {/* Machine Input */}
                            <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1.5 sm:px-2.5 rounded-md border border-blue-200 min-w-0 flex-1 sm:flex-none sm:w-auto lg:min-w-[130px]">
                              {getKleurDisplay(conn.inputKleur, 'w-7 h-7 lg:w-8 lg:h-8')}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs sm:text-sm text-blue-800">Input {conn.inputNummer}</p>
                                <p className="text-xs text-blue-600 capitalize truncate">{conn.inputKleur}</p>
                              </div>
                            </div>
                            
                            {/* Connection Arrow */}
                            <div className="flex items-center justify-center shrink-0">
                              <div className={`p-1 lg:p-1.5 rounded-full transition-all ${
                                isChecked ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                                {/* Mobile: Arrow Down, Desktop: Arrow Right */}
                                <ArrowDown className={`block sm:hidden w-3.5 h-3.5 lg:w-4 lg:h-4 ${
                                  isChecked ? 'text-white' : 'text-gray-600'
                                }`} />
                                <ArrowRight className={`hidden sm:block w-3.5 h-3.5 lg:w-4 lg:h-4 ${
                                  isChecked ? 'text-white' : 'text-gray-600'
                                }`} />
                              </div>
                            </div>
                            
                            {/* Attachment Hose */}
                            <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1.5 sm:px-2.5 rounded-md border border-orange-200 min-w-0 flex-1 sm:flex-none sm:w-auto lg:min-w-[130px]">
                              {getKleurDisplay(conn.hoseKleur, 'w-7 h-7 lg:w-8 lg:h-8')}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs sm:text-sm text-orange-800">Slang {conn.hoseVolgorde}</p>
                                <p className="text-xs text-orange-600 capitalize truncate">{conn.hoseKleur}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Status and Check Button */}
                          <div className="mt-2 lg:mt-3 flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 sm:justify-between">
                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                              isChecked 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isChecked ? '✓ Gecontroleerd' : 'Te controleren'}
                            </div>
                            
                            <Button
                              variant={isChecked ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleConnectionStatus(conn.id)}
                              className={`w-full sm:w-auto text-xs px-3 py-1.5 transition-all font-medium ${
                                isChecked 
                                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
                                  : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                              }`}
                            >
                              {isChecked ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  <span className="hidden sm:inline">OK</span>
                                  <span className="sm:hidden">OK</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-3.5 h-3.5 mr-1 rounded-full border-2 border-gray-400"></div>
                                  <span className="hidden sm:inline">Check</span>
                                  <span className="sm:hidden">Check</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Aansluiting Voltooid Knop */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <Dialog open={completionDialogOpen} onOpenChange={setCompletionDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className={`w-full min-h-[64px] flex items-center justify-center gap-3 p-4 text-sm sm:text-base font-medium transition-all rounded-xl ${
                              areAllConnectionsChecked(connections)
                                ? 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!areAllConnectionsChecked(connections)}
                            onClick={() => {
                              if (!areAllConnectionsChecked(connections)) return;
                              
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
                            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                            <div className="flex-1 text-center">
                              {areAllConnectionsChecked(connections) ? (
                                <div className="space-y-1">
                                  <div className="font-semibold text-base">Aansluiting Voltooid!</div>
                                  <div className="text-xs opacity-90">Tik om specificaties te bekijken</div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="font-medium text-base">Controleer alle verbindingen</div>
                                  <div className="text-xs opacity-90 flex items-center justify-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                      <span>{connections.filter(conn => connectionStatuses[conn.id]).length}</span>
                                    </div>
                                    <span>/</span>
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                      <span>{connections.length}</span>
                                    </div>
                                    <span>voltooid</span>
                                  </div>
                                </div>
                              )}
                            </div>
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
                                    <h5 className="font-semibold text-orange-800 mb-3">🔧 Aanbouwdeel Specificaties:</h5>
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="font-medium text-gray-700">Werkdruk:</span>
                                        <span className="font-bold text-orange-600">{selectedAttachment.werkdruk} bar</span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white p-2 rounded">
                                        <span className="font-medium text-gray-700">Max Druk:</span>
                                        <span className="font-bold text-orange-600">{selectedAttachment.max_druk} bar</span>
                                      </div>
                                      {selectedAttachment.debiet && (
                                        <div className="flex justify-between items-center bg-white p-2 rounded">
                                          <span className="font-medium text-gray-700">Debiet:</span>
                                          <span className="font-bold text-orange-600">{selectedAttachment.debiet} l/min</span>
                                        </div>
                                      )}
                                      {selectedAttachment.vermogen != null && selectedAttachment.vermogen > 0 && (
                                        <div className="flex justify-between items-center bg-white p-2 rounded">
                                          <span className="font-medium text-gray-700">Vermogen:</span>
                                          <span className="font-bold text-orange-600">{selectedAttachment.vermogen} kW</span>
                                        </div>
                                      )}
                                      {selectedAttachment.gewicht && (
                                        <div className="flex justify-between items-center bg-white p-2 rounded">
                                          <span className="font-medium text-gray-700">Gewicht:</span>
                                          <span className="font-bold text-orange-600">{selectedAttachment.gewicht} kg</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                                      <p className="text-sm text-orange-800 font-medium">
                                        ⚠️ Stel uw machine in volgens bovenstaande specificaties van het aanbouwdeel
                                      </p>
                                      <p className="text-xs text-orange-700 mt-1">
                                        Zorg ervoor dat de machine werkdruk minimaal {selectedAttachment.werkdruk} bar is voor optimale werking
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
          <div className="md:col-span-2 lg:col-span-4">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  Aanbouwdelen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attachments.length > 0 ? (
                  <div className="space-y-6">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="space-y-4">
                        {/* Aanbouwdeel Image */}
                        {attachment.afbeelding && (
                          <div className="mb-6">
                            <Image
                              src={attachment.afbeelding}
                              alt={attachment.naam}
                              width={300}
                              height={200}
                              className="w-full h-48 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        
                        <div>
                          <h3 className="text-lg font-bold">Aanbouwdeel: {attachment.naam}</h3>
                          <p className="text-gray-600">{attachment.type}</p>
                          
                          <div className="mt-4 space-y-3">
                            <h4 className="font-semibold text-gray-700 mb-3">Hydraulische Slangen</h4>
                            {attachment.hydraulic_hoses && attachment.hydraulic_hoses.length > 0 ? (
                              attachment.hydraulic_hoses.map((hose) => (
                                <div key={hose.id} className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-100">
                                  {getKleurDisplay(hose.kleur, 'w-10 h-10')}
                                  <div>
                                    <p className="font-medium text-lg">Slang {hose.volgorde}</p>
                                    <p className="text-sm text-gray-600 capitalize">{hose.kleur} aansluiting</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <p>Geen slangen geconfigureerd</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Separator between attachments if multiple */}
                        {attachments.length > 1 && attachment !== attachments[attachments.length - 1] && (
                          <hr className="border-gray-200 my-6" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Geen aanbouwdelen gekoppeld</h3>
                    <p className="text-sm">Deze machine heeft geen gekoppelde aanbouwdelen</p>
                  </div>
                )}
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