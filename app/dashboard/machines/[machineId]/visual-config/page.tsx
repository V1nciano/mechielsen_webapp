'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Cable, Zap, CheckCircle, AlertCircle, Info, AlertTriangle, HelpCircle, BookOpen, Wrench } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Machine {
  id: string;
  naam: string;
  type: string;
  beschrijving?: string;
}

interface HydraulicInput {
  id: string;
  input_nummer: number;
  input_kleur: string;
  input_label: string;
  functie_beschrijving: string;
  volgorde: number;
}

interface Attachment {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  afbeelding?: string;
}

interface SlangConnection {
  id?: string;
  machine_id: string;
  hydraulic_input_id: string;
  attachment_id: string;
  slang_nummer: number;
  slang_kleur: string;
  slang_label: string;
  functie_beschrijving: string;
  instructie_tekst?: string;
  volgorde: number;
  connection_type?: 'single_acting' | 'double_acting' | 'high_flow' | 'low_flow';
  pressure_rating?: number;
  flow_rating?: number;
}

// Hydraulic Documentation Constants
const HYDRAULIC_DOCUMENTATION = {
  connection_types: {
    single_acting: {
      name: 'Enkelwerkend',
      description: 'Voor functies die alleen in één richting werken (bijv. kippen, heffen met zwaartekracht terugkeer)',
      pressure: '175-350 bar',
      flow: '20-80 l/min',
      connections: ['P (Druk)', 'T (Tank)'],
      safety_notes: 'Controleer dat terugkeer via zwaartekracht of veer mogelijk is',
      color_coding: 'Meestal gele of rode slangen'
    },
    double_acting: {
      name: 'Dubbelwerkend', 
      description: 'Voor functies die in beide richtingen hydraulisch werken (bijv. grijpers, rotators)',
      pressure: '175-350 bar',
      flow: '40-120 l/min',
      connections: ['A (Functie 1)', 'B (Functie 2)', 'P (Druk)', 'T (Tank)'],
      safety_notes: 'Beide leidingen onder druk - extra voorzichtigheid bij ontkoppeling',
      color_coding: 'Rode en blauwe slangen voor A/B poorten'
    },
    high_flow: {
      name: 'Hoge Doorstroming',
      description: 'Voor zware aanbouwdelen die veel hydraulische kracht vereisen',
      pressure: '175-350 bar', 
      flow: '80-200 l/min',
      connections: ['P (Druk)', 'T (Tank)', 'A', 'B'],
      safety_notes: 'Hogere druk en doorstroming - gebruik juiste slangdiameter',
      color_coding: 'Dikkere slangen, vaak met speciale markeringen'
    },
    low_flow: {
      name: 'Lage Doorstroming',
      description: 'Voor lichte aanbouwdelen of precisiewerk',
      pressure: '175-250 bar',
      flow: '10-40 l/min', 
      connections: ['P (Druk)', 'T (Tank)'],
      safety_notes: 'Lagere druk geschikt voor gevoelige aanbouwdelen',
      color_coding: 'Standaard slangkleuren'
    }
  },
  safety_procedures: {
    before_connection: [
      'Zet de machine uit en verwijder de sleutel',
      'Laat hydraulische druk volledig aflopen',
      'Reinig alle koppelingen van vuil en debris', 
      'Controleer slangen op beschadigingen',
      'Gebruik persoonlijke beschermingsmiddelen'
    ],
    during_connection: [
      'Volg de juiste volgorde: eerst drukleiding (P), dan tank (T)',
      'Voor dubbelwerkende: eerst A, dan B',
      'Draai koppelingen handvast, niet overtrekken',
      'Controleer dat O-ringen correct geplaatst zijn'
    ],
    after_connection: [
      'Start machine en laat warm draaien',
      'Test alle functies op lage snelheid',
      'Controleer op lekkages bij alle koppelingen',
      'Verifieer correcte werking van veiligheidssystemen'
    ]
  },
  troubleshooting: {
    'Geen beweging': [
      'Controleer of machine draait',
      'Verifieer hydraulische druk',
      'Check slangaansluitingen',
      'Controleer bedieningshendels'
    ],
    'Langzame beweging': [
      'Controleer hydraulische olie niveau',
      'Verifieer slangdiameter',
      'Check op geknipte slangen',
      'Controleer olie viscositeit'
    ],
    'Lekkage': [
      'Stop machine onmiddellijk',
      'Controleer alle koppelingen',
      'Vervang beschadigde O-ringen',
      'Draai koppelingen niet te vast aan'
    ]
  }
};

const SLANG_KLEUREN = [
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
  
  console.log('🏭 Visual Config Page - Machine ID:', { 
    machineId, 
    params, 
    type: typeof machineId,
    exists: !!machineId 
  });

  const [machine, setMachine] = useState<Machine | null>(null);
  const [hydraulicInputs, setHydraulicInputs] = useState<HydraulicInput[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [connections, setConnections] = useState<SlangConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<SlangConnection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGuidance, setShowGuidance] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Helper functions for hydraulic documentation
  const getConnectionTypeRecommendation = (attachmentType: string) => {
    const recommendations: Record<string, string> = {
      'grijper': 'double_acting',
      'hamer': 'high_flow', 
      'boor': 'high_flow',
      'veegmachine': 'single_acting',
      'knipper': 'double_acting',
      'rotator': 'double_acting',
      'hark': 'single_acting'
    };
    return recommendations[attachmentType.toLowerCase()] || 'double_acting';
  };

  const getFlowPressureRecommendation = (connectionType: string) => {
    const specs = HYDRAULIC_DOCUMENTATION.connection_types[connectionType as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types];
    if (!specs) return { pressure: 250, flow: 60 };
    
    const pressureRange = specs.pressure.split('-').map(p => parseInt(p));
    const flowRange = specs.flow.split('-').map(f => parseInt(f));
    
    return {
      pressure: Math.round((pressureRange[0] + pressureRange[1]) / 2),
      flow: Math.round((flowRange[0] + flowRange[1]) / 2)
    };
  };

  const getConnectionInstructions = (connectionType: string) => {
    const type = HYDRAULIC_DOCUMENTATION.connection_types[connectionType as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types];
    if (!type) return '';
    
    return `${type.description}\n\nVereiste aansluitingen: ${type.connections.join(', ')}\n\nVeiligheidsinstructie: ${type.safety_notes}\n\nKleurcodering: ${type.color_coding}`;
  };

  useEffect(() => {
    if (!machineId) return;
    fetchData();
  }, [machineId]);

  const fetchData = async () => {
    try {
      // Fetch machine info
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('id, naam, type, beschrijving')
        .eq('id', machineId)
        .single();

      if (machineError) {
        console.error('Error fetching machine:', machineError);
        router.push('/dashboard');
        return;
      }

      setMachine(machineData);

      // Fetch hydraulic inputs
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

      // Fetch attachments for this machine
      const response = await fetch(`/api/attachments?machineId=${machineId}`);
      const attachmentsData = await response.json();
      if (Array.isArray(attachmentsData)) {
        setAttachments(attachmentsData);
      }

      // Fetch existing connections via API
      const connectionsResponse = await fetch(`/api/slang-koppelingen?machineId=${machineId}`);
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json();
        setConnections(connectionsData || []);
      } else {
        console.error('Error fetching connections:', await connectionsResponse.text());
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKleurDisplay = (kleur: string) => {
    const kleurInfo = SLANG_KLEUREN.find(k => k.value === kleur);
    if (!kleurInfo) return null;
    
    return (
      <div className={`w-6 h-6 rounded-full ${kleurInfo.color} flex items-center justify-center shadow-sm`}>
        <span className={`text-xs font-bold ${kleurInfo.textColor}`}>
          {kleur === 'rood' ? 'R' : kleur === 'blauw' ? 'B' : kleur === 'geel' ? 'G' : 
           kleur === 'groen' ? 'GR' : kleur === 'zwart' ? 'Z' : kleur === 'wit' ? 'W' :
           kleur === 'oranje' ? 'O' : 'P'}
        </span>
      </div>
    );
  };

  const handleCreateConnection = (inputId: string, attachmentId: string) => {
    console.log('🔧 Creating connection with:', {
      machineId,
      inputId,
      attachmentId,
      machineIdType: typeof machineId,
      inputIdType: typeof inputId,
      attachmentIdType: typeof attachmentId
    });

    // Validate required fields
    if (!machineId || !inputId || !attachmentId) {
      console.error('❌ Missing required fields:', {
        machineId: !machineId,
        inputId: !inputId,
        attachmentId: !attachmentId
      });
      toast.error('Ontbrekende vereiste velden voor het maken van de verbinding');
      return;
    }

    const input = hydraulicInputs.find(i => i.id === inputId);
    const attachment = attachments.find(a => a.id === attachmentId);
    
    if (!input || !attachment) {
      console.error('❌ Input or attachment not found:', { input: !!input, attachment: !!attachment });
      return;
    }

    // Get automated recommendations
    const recommendedType = getConnectionTypeRecommendation(attachment.type);
    const { pressure, flow } = getFlowPressureRecommendation(recommendedType);
    const instructions = getConnectionInstructions(recommendedType);

    const newConnection: SlangConnection = {
      machine_id: machineId,
      hydraulic_input_id: inputId,
      attachment_id: attachmentId,
      slang_nummer: connections.length + 1,
      slang_kleur: input.input_kleur,
      slang_label: `${input.input_label} → ${attachment.naam}`,
      functie_beschrijving: `Verbinding tussen ${input.functie_beschrijving} en ${attachment.naam}`,
      instructie_tekst: instructions,
      volgorde: connections.length + 1,
      connection_type: recommendedType as 'single_acting' | 'double_acting' | 'high_flow' | 'low_flow',
      pressure_rating: pressure,
      flow_rating: flow
    };

    console.log('🔗 Created connection object:', newConnection);

    setSelectedConnection(newConnection);
    setIsEditing(true);
    toast.success(`Automatische aanbeveling: ${HYDRAULIC_DOCUMENTATION.connection_types[recommendedType as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types]?.name}`);
  };

  const handleSaveConnection = async () => {
    if (!selectedConnection) return;

    // Validate required fields
    if (!selectedConnection.machine_id || !selectedConnection.hydraulic_input_id || !selectedConnection.attachment_id) {
      console.error('❌ Missing required fields in save:', {
        machine_id: !selectedConnection.machine_id,
        hydraulic_input_id: !selectedConnection.hydraulic_input_id,
        attachment_id: !selectedConnection.attachment_id
      });
      toast.error('Ontbrekende vereiste velden voor het opslaan van de verbinding');
      return;
    }

    // Ensure all required fields are present
    const connectionData = {
      ...selectedConnection,
      machine_id: machineId,
      hydraulic_input_id: selectedConnection.hydraulic_input_id,
      attachment_id: selectedConnection.attachment_id,
      slang_nummer: selectedConnection.slang_nummer || connections.length + 1,
      slang_kleur: selectedConnection.slang_kleur,
      slang_label: selectedConnection.slang_label,
      functie_beschrijving: selectedConnection.functie_beschrijving,
      volgorde: selectedConnection.volgorde || connections.length + 1
    };

    console.log('🚀 Sending connection data to API:', JSON.stringify(connectionData, null, 2));

    try {
      const response = await fetch('/api/slang-koppelingen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionData),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ API Response Error:', data);
        toast.error('Fout bij opslaan: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Slangverbinding succesvol opgeslagen!');
      setConnections([...connections, data]);
      setSelectedConnection(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving connection:', error);
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const handleUpdateConnection = async (connection: SlangConnection) => {
    if (!connection.id) return;

    try {
      const response = await fetch('/api/slang-koppelingen', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connection),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij bijwerken: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Slangverbinding succesvol bijgewerkt!');
      setConnections(connections.map(c => c.id === connection.id ? connection : c));
      setSelectedConnection(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating connection:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken');
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Weet je zeker dat je deze slangverbinding wilt verwijderen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/slang-koppelingen?id=${connectionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij verwijderen: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Slangverbinding succesvol verwijderd!');
      setConnections(connections.filter(c => c.id !== connectionId));
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const getConnectionForInput = (inputId: string, attachmentId: string) => {
    return connections.find(c => c.hydraulic_input_id === inputId && c.attachment_id === attachmentId);
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

  return (
    <TooltipProvider>
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
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Visuele Slangconfiguratie</h1>
                <p className="text-gray-600">{machine?.naam} ({machine?.type})</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={showGuidance} onOpenChange={setShowGuidance}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Hydrauliek Gids
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wrench className="w-5 h-5" />
                      Hydraulische Aansluiting Gids
                    </DialogTitle>
                    <DialogDescription>
                      Uitgebreide gids voor hydraulische aansluitingen, veiligheidsprocedures en probleemoplossing voor uw machine.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="types" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="types">Aansluitingstypen</TabsTrigger>
                      <TabsTrigger value="safety">Veiligheid</TabsTrigger>
                      <TabsTrigger value="steps">Stap-voor-stap</TabsTrigger>
                      <TabsTrigger value="troubleshoot">Problemen oplossen</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="types" className="space-y-4">
                      {Object.entries(HYDRAULIC_DOCUMENTATION.connection_types).map(([key, type]) => (
                        <Card key={key}>
                          <CardHeader>
                            <CardTitle className="text-lg">{type.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-gray-600">{type.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Druk:</strong> {type.pressure}
                              </div>
                              <div>
                                <strong>Doorstroming:</strong> {type.flow}
                              </div>
                            </div>
                            <div className="text-sm">
                              <strong>Aansluitingen:</strong> {type.connections.join(', ')}
                            </div>
                            <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>{type.safety_notes}</AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="safety" className="space-y-4">
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-3">Voor het aansluiten</h3>
                          <ul className="space-y-2">
                            {HYDRAULIC_DOCUMENTATION.safety_procedures.before_connection.map((step, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                                <span className="text-sm">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-lg mb-3">Tijdens het aansluiten</h3>
                          <ul className="space-y-2">
                            {HYDRAULIC_DOCUMENTATION.safety_procedures.during_connection.map((step, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                                <span className="text-sm">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-3">Na het aansluiten</h3>
                          <ul className="space-y-2">
                            {HYDRAULIC_DOCUMENTATION.safety_procedures.after_connection.map((step, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                                <span className="text-sm">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="steps" className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Stap-voor-stap Aansluitingsprocedure</AlertTitle>
                        <AlertDescription>
                          Volg deze volgorde voor veilige hydraulische aansluitingen
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-4">
                        {[
                          'Selecteer het juiste aanbouwdeel en controleer compatibiliteit',
                          'Identificeer de hydraulische inputs op de machine', 
                          'Bepaal het aansluitingstype (enkelwerkend/dubbelwerkend)',
                          'Kies de juiste slangkleuren en labels',
                          'Sluit eerst de drukleiding (P) aan',
                          'Sluit daarna de tankleiding (T) aan', 
                          'Voor dubbelwerkend: sluit A en B leidingen aan',
                          'Test de verbinding op lage snelheid',
                          'Controleer op lekkages en correcte werking'
                        ].map((step, index) => (
                          <div key={index} className="flex items-start gap-4 p-3 bg-white rounded-lg border">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                            </div>
                            <p className="text-sm">{step}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="troubleshoot" className="space-y-4">
                      {Object.entries(HYDRAULIC_DOCUMENTATION.troubleshooting).map(([problem, solutions]) => (
                        <Card key={problem}>
                          <CardHeader>
                            <CardTitle className="text-lg text-red-600">{problem}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {solutions.map((solution, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <HelpCircle className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                                  <span className="text-sm">{solution}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Safety Alert */}
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Veiligheidswaarschuwing</AlertTitle>
            <AlertDescription className="text-red-700">
              Zorg altijd dat de machine uitstaat en de hydraulische druk is afgelaten voordat je slangen aansluit of loskoppelt.
              Draag altijd de juiste persoonlijke beschermingsmiddelen.
            </AlertDescription>
          </Alert>

        {/* Visual Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Machine Side */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Machine Hydraulische Inputs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hydraulicInputs.map((input) => (
                  <div key={input.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-3">
                      {getKleurDisplay(input.input_kleur)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Input {input.input_nummer}</p>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">
                                <strong>{input.input_label}</strong><br/>
                                {input.functie_beschrijving}<br/>
                                Kleur: {input.input_kleur}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-600">{input.input_label}</p>
                        <p className="text-xs text-gray-500">{input.functie_beschrijving}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {attachments.map((attachment) => {
                        const connection = getConnectionForInput(input.id, attachment.id);
                        const recommendedType = getConnectionTypeRecommendation(attachment.type);
                        const typeInfo = HYDRAULIC_DOCUMENTATION.connection_types[recommendedType as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types];
                        
                        return (
                          <div key={attachment.id} className="flex items-center gap-2">
                            {connection ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedConnection(connection);
                                        setIsEditing(true);
                                      }}
                                      className="text-xs"
                                    >
                                      Bewerk → {attachment.naam}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p><strong>Type:</strong> {connection.connection_type}</p>
                                      <p><strong>Druk:</strong> {connection.pressure_rating} bar</p>
                                      <p><strong>Flow:</strong> {connection.flow_rating} l/min</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCreateConnection(input.id, attachment.id)}
                                    className="text-xs"
                                  >
                                    + Verbind → {attachment.naam}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p><strong>Aanbevolen:</strong> {typeInfo?.name}</p>
                                    <p><strong>Druk:</strong> {typeInfo?.pressure}</p>
                                    <p><strong>Flow:</strong> {typeInfo?.flow}</p>
                                    <p className="text-xs text-gray-500">{typeInfo?.description}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attachments Side */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cable className="w-5 h-5 text-green-600" />
                Beschikbare Aanbouwdelen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{attachment.naam}</p>
                        <p className="text-sm text-gray-600">{attachment.type}</p>
                        <p className="text-xs text-gray-500">{attachment.beschrijving}</p>
                      </div>
                      {attachment.afbeelding && (
                        <div className="w-16 h-16 bg-white rounded border">
                          <img 
                            src={`/images/${attachment.afbeelding}`}
                            alt={attachment.naam}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Verbindingen: {connections.filter(c => c.attachment_id === attachment.id).length}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connection Details */}
        {isEditing && selectedConnection && (
          <Card className="mb-8 bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800">
                Slangverbinding Configureren
              </CardTitle>
              <DialogDescription>
                Configureer de hydraulische verbinding tussen de machine en het aanbouwdeel.
              </DialogDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basis Configuratie</TabsTrigger>
                  <TabsTrigger value="hydraulic">Hydraulische Specs</TabsTrigger>
                  <TabsTrigger value="instructions">Instructies</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="slang_nummer">Slang Nummer</Label>
                      <Input
                        id="slang_nummer"
                        type="number"
                        value={selectedConnection.slang_nummer}
                        onChange={(e) => setSelectedConnection({
                          ...selectedConnection,
                          slang_nummer: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="slang_kleur">Slang Kleur</Label>
                      <Select 
                        value={selectedConnection.slang_kleur} 
                        onValueChange={(value) => setSelectedConnection({
                          ...selectedConnection,
                          slang_kleur: value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SLANG_KLEUREN.map((kleur) => (
                            <SelectItem key={kleur.value} value={kleur.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${kleur.color}`}></div>
                                {kleur.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="slang_label">Slang Label</Label>
                      <Input
                        id="slang_label"
                        value={selectedConnection.slang_label}
                        onChange={(e) => setSelectedConnection({
                          ...selectedConnection,
                          slang_label: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="volgorde">Volgorde</Label>
                      <Input
                        id="volgorde"
                        type="number"
                        value={selectedConnection.volgorde}
                        onChange={(e) => setSelectedConnection({
                          ...selectedConnection,
                          volgorde: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="functie_beschrijving">Functie Beschrijving</Label>
                      <Textarea
                        id="functie_beschrijving"
                        value={selectedConnection.functie_beschrijving}
                        onChange={(e) => setSelectedConnection({
                          ...selectedConnection,
                          functie_beschrijving: e.target.value
                        })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hydraulic" className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Automatische Aanbevelingen</AlertTitle>
                    <AlertDescription>
                      Deze waarden zijn automatisch ingesteld op basis van het aanbouwdeel type. Wijzig alleen indien nodig.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="connection_type">Aansluiting Type</Label>
                      <Select 
                        value={selectedConnection.connection_type || 'double_acting'} 
                        onValueChange={(value) => {
                          const { pressure, flow } = getFlowPressureRecommendation(value);
                          setSelectedConnection({
                            ...selectedConnection,
                            connection_type: value as 'single_acting' | 'double_acting' | 'high_flow' | 'low_flow',
                            pressure_rating: pressure,
                            flow_rating: flow,
                            instructie_tekst: getConnectionInstructions(value)
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(HYDRAULIC_DOCUMENTATION.connection_types).map(([key, type]) => (
                            <SelectItem key={key} value={key}>
                              <div className="space-y-1">
                                <div className="font-medium">{type.name}</div>
                                <div className="text-xs text-gray-500">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="pressure_rating">Druk Rating (bar)</Label>
                      <Input
                        id="pressure_rating"
                        type="number"
                        value={selectedConnection.pressure_rating || 250}
                        onChange={(e) => setSelectedConnection({
                          ...selectedConnection,
                          pressure_rating: parseInt(e.target.value) || 250
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="flow_rating">Flow Rating (l/min)</Label>
                      <Input
                        id="flow_rating"
                        type="number"
                        value={selectedConnection.flow_rating || 60}
                        onChange={(e) => setSelectedConnection({
                          ...selectedConnection,
                          flow_rating: parseInt(e.target.value) || 60
                        })}
                      />
                    </div>
                    
                    <div>
                      <Label>Aanbevolen Specificaties</Label>
                      <div className="p-3 bg-blue-50 rounded text-sm">
                        {selectedConnection.connection_type && (
                          <div>
                            <p><strong>Type:</strong> {HYDRAULIC_DOCUMENTATION.connection_types[selectedConnection.connection_type as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types]?.name}</p>
                            <p><strong>Druk:</strong> {HYDRAULIC_DOCUMENTATION.connection_types[selectedConnection.connection_type as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types]?.pressure}</p>
                            <p><strong>Flow:</strong> {HYDRAULIC_DOCUMENTATION.connection_types[selectedConnection.connection_type as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types]?.flow}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedConnection.connection_type && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800">Veiligheidsinstructie</AlertTitle>
                      <AlertDescription className="text-yellow-700">
                        {HYDRAULIC_DOCUMENTATION.connection_types[selectedConnection.connection_type as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types]?.safety_notes}
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                <TabsContent value="instructions" className="space-y-4">
                  <div>
                    <Label htmlFor="instructie_tekst">Instructie Tekst</Label>
                    <Textarea
                      id="instructie_tekst"
                      value={selectedConnection.instructie_tekst || ''}
                      onChange={(e) => setSelectedConnection({
                        ...selectedConnection,
                        instructie_tekst: e.target.value
                      })}
                      placeholder="Speciale instructies voor deze slangverbinding..."
                      rows={8}
                    />
                  </div>
                  
                  <div>
                    <Label>Automatische instructies</Label>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      <p className="mb-2">Klik op een van de onderstaande opties om automatische instructies toe te voegen:</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedConnection({
                            ...selectedConnection,
                            instructie_tekst: (selectedConnection.instructie_tekst || '') + '\n\nVeiligheidsprocedure:\n' + HYDRAULIC_DOCUMENTATION.safety_procedures.before_connection.map((step, i) => `${i + 1}. ${step}`).join('\n')
                          })}
                        >
                          + Veiligheidsstappen
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedConnection({
                            ...selectedConnection,
                            instructie_tekst: (selectedConnection.instructie_tekst || '') + '\n\nAansluitingsprocedure:\n' + HYDRAULIC_DOCUMENTATION.safety_procedures.during_connection.map((step, i) => `${i + 1}. ${step}`).join('\n')
                          })}
                        >
                          + Aansluiting stappen
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedConnection({
                            ...selectedConnection,
                            instructie_tekst: (selectedConnection.instructie_tekst || '') + '\n\nTest procedure:\n' + HYDRAULIC_DOCUMENTATION.safety_procedures.after_connection.map((step, i) => `${i + 1}. ${step}`).join('\n')
                          })}
                        >
                          + Test stappen
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedConnection(null);
                    setIsEditing(false);
                  }}
                >
                  Annuleren
                </Button>
                <Button
                  onClick={() => {
                    if (selectedConnection.id) {
                      handleUpdateConnection(selectedConnection);
                    } else {
                      handleSaveConnection();
                    }
                  }}
                >
                  Opslaan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Connections */}
        {connections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Geconfigureerde Slangverbindingen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connections.map((connection) => {
                  const input = hydraulicInputs.find(i => i.id === connection.hydraulic_input_id);
                  const attachment = attachments.find(a => a.id === connection.attachment_id);
                  
                  return (
                    <div key={connection.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        {getKleurDisplay(connection.slang_kleur)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{connection.slang_label}</p>
                            {connection.connection_type && (
                              <Badge variant="secondary">
                                {HYDRAULIC_DOCUMENTATION.connection_types[connection.connection_type as keyof typeof HYDRAULIC_DOCUMENTATION.connection_types]?.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {input?.input_label} → {attachment?.naam}
                          </p>
                          <p className="text-xs text-gray-500">{connection.functie_beschrijving}</p>
                          {(connection.pressure_rating || connection.flow_rating) && (
                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                              {connection.pressure_rating && <span>Druk: {connection.pressure_rating} bar</span>}
                              {connection.flow_rating && <span>Flow: {connection.flow_rating} l/min</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedConnection(connection);
                                setIsEditing(true);
                              }}
                            >
                              Bewerken
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Bewerk slangverbinding configuratie</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => connection.id && handleDeleteConnection(connection.id)}
                            >
                              Verwijderen
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verwijder deze slangverbinding</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {connections.length === 0 && !isEditing && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Geen slangverbindingen geconfigureerd</p>
              <p className="text-sm text-gray-400 mt-2">
                Klik op &quot;Verbind&quot; bij een hydraulische input om te beginnen.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
} 