'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings, Link, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Machine {
  id: string;
  naam: string;
  type: string;
  kenteken?: string;
  machine_hydraulic_inputs?: HydraulicInput[];
  attachments?: Attachment[];
}

interface HydraulicInput {
  id: string;
  machine_id: string;
  input_nummer: number;
  kleur: string;
  volgorde: number;
}

interface Attachment {
  id: string;
  naam: string;
  type: string;
  aantal_slangen?: number;
  attachment_hydraulic_hoses?: AttachmentHose[];
}

interface AttachmentHose {
  id: string;
  attachment_id: string;
  kleur: string;
  volgorde: number;
}

interface MachineAttachmentConnection {
  id: string;
  machine_id: string;
  attachment_id: string;
  machine?: Machine;
  attachment?: Attachment;
}

interface HydraulicConnection {
  id: string;
  machine_id: string;
  attachment_id: string;
  machine_input_id: string;
  attachment_hose_id: string;
  functie_beschrijving?: string;
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

export default function MachineConfigAdmin() {
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [connections, setConnections] = useState<MachineAttachmentConnection[]>([]);
  const [hydraulicConnections, setHydraulicConnections] = useState<HydraulicConnection[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [hydraulicDialogOpen, setHydraulicDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<MachineAttachmentConnection | null>(null);
  
  // New state for hydraulic connections
  const [selectedInput, setSelectedInput] = useState<HydraulicInput | null>(null);
  const [selectedHose, setSelectedHose] = useState<AttachmentHose | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const checkAdminAccess = useCallback(async () => {
    try {
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        // URL verification found, proceed
      } else {
        // Fall back to session check
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          router.push('/login');
          return;
        }
        
        let isAdmin = false;
        if (session.user.email?.includes('admin')) {
          isAdmin = true;
        } else {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          if (profile && profile.role === 'admin') {
            isAdmin = true;
          }
        }
        
        if (!isAdmin) {
          router.push('/dashboard');
          return;
        }
      }

      await fetchData();
    } catch {
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, supabase]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const fetchData = async () => {
    try {
      // Fetch machines with their hydraulic inputs
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          *,
          machine_hydraulic_inputs(id, input_nummer, kleur, volgorde)
        `)
        .order('naam', { ascending: true });

      if (machinesError) {
        toast.error('Fout bij ophalen machines: ' + machinesError.message);
        return;
      }

      // Fetch attachments with their hydraulic hoses
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select(`
          *,
          attachment_hydraulic_hoses(id, kleur, volgorde)
        `)
        .order('naam', { ascending: true });

      if (attachmentsError) {
        toast.error('Fout bij ophalen aanbouwdelen: ' + attachmentsError.message);
        return;
      }

      // Debug logging to check data structure
      console.log('Machines data:', machinesData);
      console.log('Attachments data:', attachmentsData);

      // Fetch existing connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('attachment_machines')
        .select(`
          *,
          machines(naam),
          attachments(naam)
        `);

      if (connectionsError) {
        toast.error('Fout bij ophalen koppelingen: ' + connectionsError.message);
        return;
      }

      // Fetch hydraulic connections
      const { data: hydraulicConnectionsData, error: hydraulicConnectionsError } = await supabase
        .from('hydraulic_connections')
        .select('*');

      if (hydraulicConnectionsError) {
        // Table might not exist yet, that's okay
        setHydraulicConnections([]);
      } else {
        setHydraulicConnections(hydraulicConnectionsData || []);
      }

      setMachines(machinesData || []);
      setAttachments(attachmentsData || []);
      setConnections(connectionsData || []);
    } catch {
      toast.error('Er is een fout opgetreden bij het ophalen van gegevens');
    }
  };

  const getKleurDisplay = (kleur: string) => {
    const kleurInfo = HYDRAULIC_KLEUREN.find(k => k.value === kleur);
    if (!kleurInfo) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full ${kleurInfo.color} flex items-center justify-center`}>
          <span className={`text-xs font-bold ${kleurInfo.textColor}`}>
            {kleur === 'rood' ? 'R' : kleur === 'blauw' ? 'B' : kleur === 'geel' ? 'G' : 
             kleur === 'groen' ? 'GR' : kleur === 'zwart' ? 'Z' : kleur === 'wit' ? 'W' :
             kleur === 'oranje' ? 'O' : 'P'}
          </span>
        </div>
        <span className="text-sm capitalize">{kleurInfo.label}</span>
      </div>
    );
  };

  const connectMachineToAttachment = async (machineId: string, attachmentId: string) => {
    if (!machineId || !attachmentId) {
      toast.error('Selecteer zowel een machine als een aanbouwdeel');
      return;
    }

    try {
      const { error } = await supabase
        .from('attachment_machines')
        .insert([{
          machine_id: machineId,
          attachment_id: attachmentId
        }]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast.error('Deze koppeling bestaat al');
        } else {
          toast.error('Fout bij koppelen: ' + error.message);
        }
        return;
      }

      toast.success('Machine succesvol gekoppeld aan aanbouwdeel!');
      setSelectedMachine(null);
      setConnectDialogOpen(false);
      fetchData();
    } catch {
      toast.error('Er is een fout opgetreden bij het koppelen');
    }
  };

  const disconnectMachineFromAttachment = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('attachment_machines')
        .delete()
        .eq('id', connectionId);

      if (error) {
        toast.error('Fout bij ontkoppelen: ' + error.message);
        return;
      }

      toast.success('Koppeling succesvol verwijderd!');
      fetchData();
    } catch {
      toast.error('Er is een fout opgetreden bij het ontkoppelen');
    }
  };

  const createHydraulicConnection = async (inputId: string, hoseId: string) => {
    if (!selectedConnection) return;

    try {
      const { error } = await supabase
        .from('hydraulic_connections')
        .insert([{
          machine_id: selectedConnection.machine_id,
          attachment_id: selectedConnection.attachment_id,
          machine_input_id: inputId,
          attachment_hose_id: hoseId,
          functie_beschrijving: 'Automatisch gekoppeld'
        }]);

      if (error) {
        toast.error('Fout bij maken verbinding: ' + error.message);
        return;
      }

      toast.success('Hydraulische verbinding succesvol gemaakt!');
      fetchData();
    } catch {
      toast.error('Er is een fout opgetreden bij het maken van de verbinding');
    }
  };

  const deleteHydraulicConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('hydraulic_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        toast.error('Fout bij verwijderen verbinding: ' + error.message);
        return;
      }

      toast.success('Hydraulische verbinding verwijderd!');
      fetchData();
    } catch {
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const handleInputClick = (input: HydraulicInput) => {
    if (!isConnecting) {
      setSelectedInput(input);
      setSelectedHose(null);
      setIsConnecting(true);
    } else if (selectedInput?.id === input.id) {
      // Deselect if clicking the same input
      setSelectedInput(null);
      setIsConnecting(false);
    } else {
      // Select different input
      setSelectedInput(input);
      setSelectedHose(null);
    }
  };

  const handleHoseClick = (hose: AttachmentHose) => {
    if (isConnecting && selectedInput) {
      // Check if connection already exists
      const existingConnection = hydraulicConnections.find(
        conn => conn.machine_input_id === selectedInput.id && conn.attachment_hose_id === hose.id
      );

      if (existingConnection) {
        toast.error('Deze verbinding bestaat al');
        return;
      }

      // Create new connection
      createHydraulicConnection(selectedInput.id, hose.id);
      setSelectedInput(null);
      setSelectedHose(null);
      setIsConnecting(false);
    } else {
      setSelectedHose(hose);
    }
  };

  const getConnectionForInput = (inputId: string) => {
    return hydraulicConnections.find(conn => conn.machine_input_id === inputId);
  };

  const getConnectionForHose = (hoseId: string) => {
    return hydraulicConnections.find(conn => conn.attachment_hose_id === hoseId);
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
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => {
                const verified = searchParams.get('verified') || 'true';
                const email = searchParams.get('email') || 'admin@example.com';
                router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
              }}
              className="flex items-center gap-2 w-fit touch-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Machine-Aanbouwdeel Configuratie</h1>
            </div>
          </div>
          
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 w-full sm:w-auto touch-btn">
                <Link className="w-4 h-4" />
                <span className="sm:inline">Nieuwe Verbinding</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-2xl mobile-scroll">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Machine en Aanbouwdeel Verbinden</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-sm sm:text-base">Selecteer Machine</Label>
                  <Select value={selectedMachine || ''} onValueChange={setSelectedMachine}>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Kies een machine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((machine) => (
                        <SelectItem key={machine.id} value={machine.id}>
                          {machine.naam} ({machine.kenteken || machine.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedMachine && (
                  <div>
                    <Label className="text-sm sm:text-base">Selecteer Aanbouwdeel</Label>
                    <div className="grid grid-cols-1 gap-3 mt-2 max-h-60 overflow-y-auto mobile-scroll">
                      {attachments.map((attachment) => {
                        const isConnected = connections.some(
                          c => c.machine_id === selectedMachine && c.attachment_id === attachment.id
                        );
                        
                        return (
                          <div 
                            key={attachment.id} 
                            className={`p-3 border rounded-lg cursor-pointer transition-colors tap-target ${
                              isConnected 
                                ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                            onClick={() => {
                              if (!isConnected) {
                                connectMachineToAttachment(selectedMachine, attachment.id);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm sm:text-base">{attachment.naam}</p>
                                <p className="text-xs sm:text-sm text-gray-600">{attachment.type}</p>
                                <p className="text-xs text-gray-500">
                                  {attachment.aantal_slangen || 2} slangen
                                </p>
                              </div>
                              {isConnected && (
                                <Badge variant="secondary" className="text-xs">Al verbonden</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Existing Connections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {connections.map((connection) => (
            <Card key={connection.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <span className="text-base sm:text-lg line-clamp-2">
                    {connection.machine?.naam} ↔ {connection.attachment?.naam}
                  </span>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => disconnectMachineFromAttachment(connection.id)}
                    className="tap-target"
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                <div>
                  <Label className="text-xs sm:text-sm">Machine Details</Label>
                  <div className="text-xs sm:text-sm text-gray-600">
                    <p>{connection.machine?.type}</p>
                    {connection.machine?.kenteken && (
                      <p>Kenteken: {connection.machine.kenteken}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Aanbouwdeel Details</Label>
                  <div className="text-xs sm:text-sm text-gray-600">
                    <p>{connection.attachment?.type}</p>
                    <p>{connection.attachment?.aantal_slangen || 2} slangen</p>
                  </div>
                </div>

                {/* Machine Hydraulic Inputs */}
                <div>
                  <Label className="text-xs sm:text-sm">Machine Inputs</Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                    {(() => {
                      const machine = machines.find(m => m.id === connection.machine_id);
                      return machine?.machine_hydraulic_inputs?.map((input) => (
                        <div key={input.id} className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${
                              HYDRAULIC_KLEUREN.find(k => k.value === input.kleur)?.color
                            } flex items-center justify-center`}>
                              <span className={`text-xs font-bold ${
                                HYDRAULIC_KLEUREN.find(k => k.value === input.kleur)?.textColor
                              }`}>
                                {input.kleur === 'rood' ? 'R' : input.kleur === 'blauw' ? 'B' : 
                                 input.kleur === 'geel' ? 'G' : input.kleur === 'groen' ? 'GR' : 
                                 input.kleur === 'zwart' ? 'Z' : input.kleur === 'wit' ? 'W' :
                                 input.kleur === 'oranje' ? 'O' : 'P'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs">#{input.volgorde}</span>
                        </div>
                      )) || [];
                    })()}
                  </div>
                </div>

                {/* Attachment Hydraulic Hoses */}
                <div>
                  <Label className="text-xs sm:text-sm">Aanbouwdeel Slangen</Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                    {(() => {
                      const attachment = attachments.find(a => a.id === connection.attachment_id);
                      return attachment?.attachment_hydraulic_hoses?.map((hose) => (
                        <div key={hose.id} className="flex items-center gap-1">
                          <div className="flex items-center gap-1">
                            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${
                              HYDRAULIC_KLEUREN.find(k => k.value === hose.kleur)?.color
                            } flex items-center justify-center`}>
                              <span className={`text-xs font-bold ${
                                HYDRAULIC_KLEUREN.find(k => k.value === hose.kleur)?.textColor
                              }`}>
                                {hose.kleur === 'rood' ? 'R' : hose.kleur === 'blauw' ? 'B' : 
                                 hose.kleur === 'geel' ? 'G' : hose.kleur === 'groen' ? 'GR' : 
                                 hose.kleur === 'zwart' ? 'Z' : hose.kleur === 'wit' ? 'W' :
                                 hose.kleur === 'oranje' ? 'O' : 'P'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs">#{hose.volgorde}</span>
                        </div>
                      )) || [];
                    })()}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedConnection(connection);
                      setHydraulicDialogOpen(true);
                    }}
                    className="w-full flex items-center gap-2 touch-btn"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Configureer Hydrauliek</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {connections.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 text-sm sm:text-base">Nog geen machine-aanbouwdeel verbindingen.</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">Voeg de eerste verbinding toe om te beginnen.</p>
          </div>
        )}

        {/* Hydraulic Configuration Dialog */}
        {selectedConnection && (
          <Dialog open={hydraulicDialogOpen} onOpenChange={setHydraulicDialogOpen}>
            <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto mobile-scroll">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Hydraulische Configuratie: {selectedConnection.machine?.naam} ↔ {selectedConnection.attachment?.naam}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mt-4">
                {/* Machine Inputs */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    Machine Inputs
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {(() => {
                      const machine = machines.find(m => m.id === selectedConnection.machine_id);
                      return machine?.machine_hydraulic_inputs?.map((input) => {
                        const connection = getConnectionForInput(input.id);
                        const isSelected = selectedInput?.id === input.id;
                        const isConnected = !!connection;
                        
                        return (
                          <div 
                            key={input.id} 
                            className={`p-3 sm:p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md tap-target ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                : isConnected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                            }`}
                            onClick={() => handleInputClick(input)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 sm:gap-4">
                                {getKleurDisplay(input.kleur)}
                                <div>
                                  <p className="font-semibold text-sm sm:text-lg">Input #{input.volgorde}</p>
                                  {isConnected && (
                                    <p className="text-xs sm:text-sm text-green-600 font-medium">✓ Verbonden</p>
                                  )}
                                  {isSelected && (
                                    <p className="text-xs sm:text-sm text-blue-600 font-medium">Geselecteerd</p>
                                  )}
                                </div>
                              </div>
                              {isConnected && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (connection) {
                                      deleteHydraulicConnection(connection.id);
                                    }
                                  }}
                                  className="opacity-70 hover:opacity-100 tap-target"
                                >
                                  ✕
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      }) || [];
                    })()}
                  </div>
                </div>

                {/* Attachment Hoses */}
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center gap-3">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    Aanbouwdeel Slangen
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {(() => {
                      const attachment = attachments.find(a => a.id === selectedConnection.attachment_id);
                      return attachment?.attachment_hydraulic_hoses?.map((hose) => {
                        const connection = getConnectionForHose(hose.id);
                        const isSelected = selectedHose?.id === hose.id;
                        const isConnected = !!connection;
                        
                        return (
                          <div 
                            key={hose.id} 
                            className={`p-3 sm:p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md tap-target ${
                              isSelected 
                                ? 'border-orange-500 bg-orange-50 shadow-lg' 
                                : isConnected
                                ? 'border-green-500 bg-green-50'
                                : isConnecting && selectedInput
                                ? 'border-orange-300 bg-orange-50 hover:border-orange-400'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                            }`}
                            onClick={() => handleHoseClick(hose)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 sm:gap-4">
                                {getKleurDisplay(hose.kleur)}
                                <div>
                                  <p className="font-semibold text-sm sm:text-lg">Slang #{hose.volgorde}</p>
                                  {isConnected && (
                                    <p className="text-xs sm:text-sm text-green-600 font-medium">✓ Verbonden</p>
                                  )}
                                  {isSelected && (
                                    <p className="text-xs sm:text-sm text-orange-600 font-medium">Geselecteerd</p>
                                  )}
                                </div>
                              </div>
                              {isConnected && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (connection) {
                                      deleteHydraulicConnection(connection.id);
                                    }
                                  }}
                                  className="opacity-70 hover:opacity-100 tap-target"
                                >
                                  ✕
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      }) || [];
                    })()}
                  </div>
                </div>
              </div>

              {/* Connection Lines Visualization */}
              <div className="mt-6 sm:mt-10 p-4 sm:p-6 bg-gray-50 border rounded-xl">
                <h4 className="font-semibold text-base sm:text-lg text-gray-800 mb-4">Actieve Verbindingen:</h4>
                {(() => {
                  const machine = machines.find(m => m.id === selectedConnection.machine_id);
                  const attachment = attachments.find(a => a.id === selectedConnection.attachment_id);
                  const relevantConnections = hydraulicConnections.filter(
                    conn => conn.machine_id === selectedConnection.machine_id && 
                            conn.attachment_id === selectedConnection.attachment_id
                  );
                  
                  if (relevantConnections.length === 0) {
                    return (
                      <p className="text-xs sm:text-sm text-gray-500 italic">
                        Nog geen verbindingen gemaakt. Klik op een machine input om te beginnen.
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {relevantConnections.map((conn) => {
                        const input = machine?.machine_hydraulic_inputs?.find(i => i.id === conn.machine_input_id);
                        const hose = attachment?.attachment_hydraulic_hoses?.find(h => h.id === conn.attachment_hose_id);
                        
                        if (!input || !hose) return null;
                        
                        return (
                          <div key={conn.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white border rounded-lg space-y-3 sm:space-y-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <div className="flex items-center gap-2">
                                {getKleurDisplay(input.kleur)}
                                <span className="text-xs sm:text-sm font-medium">Input #{input.volgorde}</span>
                              </div>
                              <div className="text-gray-400 self-center">→</div>
                              <div className="flex items-center gap-2">
                                {getKleurDisplay(hose.kleur)}
                                <span className="text-xs sm:text-sm font-medium">Slang #{hose.volgorde}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteHydraulicConnection(conn.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 touch-btn"
                            >
                              <span className="text-xs sm:text-sm">Verwijder</span>
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedInput(null);
                    setSelectedHose(null);
                    setIsConnecting(false);
                  }}
                  disabled={!isConnecting}
                  className="touch-btn"
                >
                  <span className="text-xs sm:text-sm">Selectie Wissen</span>
                </Button>
                <Button variant="outline" onClick={() => setHydraulicDialogOpen(false)} className="touch-btn">
                  <span className="text-xs sm:text-sm">Sluiten</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 