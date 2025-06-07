'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  identificatienummer?: string;
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
  
  // Search and filter states
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterConnection, setFilterConnection] = useState<'all' | 'connected' | 'unconnected'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  
  // Dialog search states
  const [machineSearch, setMachineSearch] = useState('');
  const [attachmentSearch, setAttachmentSearch] = useState('');
  
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
          identificatienummer,
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
          machine:machines(*),
          attachment:attachments(*)
        `);

      if (connectionsError) {
        toast.error('Fout bij ophalen koppelingen: ' + connectionsError.message);
        console.log('Connections error:', connectionsError);
        return;
      }

      console.log('Connections data:', connectionsData);

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
      
      console.log('Final connections state:', connectionsData || []);
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
    try {
      const { error } = await supabase
        .from('attachment_machines')
        .insert([{ machine_id: machineId, attachment_id: attachmentId }]);

      if (error) {
        toast.error('Fout bij verbinden: ' + error.message);
        return;
      }

      toast.success('Machine en aanbouwdeel succesvol verbonden!');
      setConnectDialogOpen(false);
      setSelectedMachine(null);
      setMachineSearch('');
      setAttachmentSearch('');
      fetchData();
    } catch {
      toast.error('Er is een fout opgetreden bij het verbinden');
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

  // Filter en zoek machines
  const filteredMachines = machines.filter(machine => {
    const searchMatch =
      machine.naam.toLowerCase().includes(search.toLowerCase()) ||
      (machine.kenteken || '').toLowerCase().includes(search.toLowerCase()) ||
      machine.type.toLowerCase().includes(search.toLowerCase());
    const typeMatch = filterType === 'all' ? true : machine.type === filterType;
    const gekoppeld = connections.some(c => c.machine_id === machine.id);
    const connectionMatch =
      filterConnection === 'all' ? true :
      filterConnection === 'connected' ? gekoppeld :
      !gekoppeld;
    return searchMatch && typeMatch && connectionMatch;
  });
  
  const totalPages = Math.ceil(filteredMachines.length / pageSize);
  const pagedMachines = filteredMachines.slice((page-1)*pageSize, page*pageSize);
  const allTypes = Array.from(new Set(machines.map(m => m.type)));

  // Filter connections based on the same criteria as machines
  const filteredConnections = connections.filter(connection => {
    if (!connection.machine) return true;
    
    const searchMatch =
      connection.machine.naam.toLowerCase().includes(search.toLowerCase()) ||
      (connection.machine.kenteken || '').toLowerCase().includes(search.toLowerCase()) ||
      connection.machine.type.toLowerCase().includes(search.toLowerCase()) ||
      (connection.attachment?.naam || '').toLowerCase().includes(search.toLowerCase()) ||
      (connection.attachment?.identificatienummer || '').toLowerCase().includes(search.toLowerCase()) ||
      (connection.attachment?.type || '').toLowerCase().includes(search.toLowerCase());
    
    const typeMatch = filterType === 'all' ? true : connection.machine.type === filterType;
    const gekoppeld = true; // connections are inherently connected
    const connectionMatch =
      filterConnection === 'all' ? true :
      filterConnection === 'connected' ? gekoppeld :
      !gekoppeld;
    
    return searchMatch && typeMatch && connectionMatch;
  });

  const openHydraulicConfigDialog = (connection: MachineAttachmentConnection) => {
    setSelectedConnection(connection);
    setHydraulicDialogOpen(true);
    setSelectedInput(null);
    setSelectedHose(null);
    setIsConnecting(false);
  };

  const closeHydraulicConfigDialog = () => {
    setSelectedConnection(null);
    setHydraulicDialogOpen(false);
    setSelectedInput(null);
    setSelectedHose(null);
    setIsConnecting(false);
  };

  const closeConnectDialog = () => {
    setConnectDialogOpen(false);
    setSelectedMachine(null);
    setMachineSearch('');
    setAttachmentSearch('');
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
    <div className="min-h-screen p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto">
        {/* Improved Header */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const verified = searchParams.get('verified') || 'true';
                  const email = searchParams.get('email') || 'admin@example.com';
                  router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
                }}
                className="flex items-center gap-2 w-fit hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Terug naar Admin
              </Button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Machine Configuratie</h1>
                <p className="text-gray-600 text-sm">Beheer koppelingen tussen machines en aanbouwdelen</p>
              </div>
            </div>
            
            <Dialog open={connectDialogOpen} onOpenChange={(open) => {
              if (!open) closeConnectDialog();
              else setConnectDialogOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-md">
                  <Link className="w-4 h-4" />
                  <span>Nieuwe Koppeling</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Machine en Aanbouwdeel Koppelen</DialogTitle>
                  <p className="text-gray-600 text-sm mt-2">Selecteer eerst een machine en daarna een aanbouwdeel om te koppelen</p>
                </DialogHeader>
                <div className="space-y-6 mt-6">
                  <div>
                    <label className="text-base font-medium mb-3 block">Selecteer Machine</label>
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Zoek machine op naam, kenteken of type..."
                        value={machineSearch}
                        onChange={e => setMachineSearch(e.target.value)}
                        className="w-full"
                      />
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        {filteredMachines
                          .filter(machine => 
                            machine.naam.toLowerCase().includes(machineSearch.toLowerCase()) ||
                            (machine.kenteken || '').toLowerCase().includes(machineSearch.toLowerCase()) ||
                            machine.type.toLowerCase().includes(machineSearch.toLowerCase())
                          )
                          .map((machine) => (
                            <div
                              key={machine.id}
                              className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                                selectedMachine === machine.id
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => setSelectedMachine(machine.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  selectedMachine === machine.id ? 'bg-blue-500' : 'bg-gray-300'
                                }`}></div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{machine.naam}</span>
                                    {machine.kenteken && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">{machine.kenteken}</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">{machine.type}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        {filteredMachines
                          .filter(machine => 
                            machine.naam.toLowerCase().includes(machineSearch.toLowerCase()) ||
                            (machine.kenteken || '').toLowerCase().includes(machineSearch.toLowerCase()) ||
                            machine.type.toLowerCase().includes(machineSearch.toLowerCase())
                          ).length === 0 && (
                          <div className="p-3 text-center text-gray-500">
                            Geen machines gevonden
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedMachine && (
                    <div>
                      <label className="text-base font-medium mb-3 block">Selecteer Aanbouwdeel</label>
                      <div className="space-y-3">
                        <Input
                          type="text"
                          placeholder="Zoek aanbouwdeel op naam, ID of type..."
                          value={attachmentSearch}
                          onChange={e => setAttachmentSearch(e.target.value)}
                          className="w-full"
                        />
                        <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                          {attachments
                            .filter(attachment =>
                              attachment.naam.toLowerCase().includes(attachmentSearch.toLowerCase()) ||
                              (attachment.identificatienummer || '').toLowerCase().includes(attachmentSearch.toLowerCase()) ||
                              attachment.type.toLowerCase().includes(attachmentSearch.toLowerCase())
                            )
                            .map((attachment) => {
                              const isConnected = connections.some(
                                c => c.machine_id === selectedMachine && c.attachment_id === attachment.id
                              );
                              
                              return (
                                <div 
                                  key={attachment.id} 
                                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    isConnected 
                                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
                                      : 'hover:bg-blue-50 border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                  }`}
                                  onClick={() => {
                                    if (!isConnected) {
                                      connectMachineToAttachment(selectedMachine, attachment.id);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-base">{attachment.naam}</p>
                                      {attachment.identificatienummer && (
                                        <p className="text-sm text-blue-600 font-medium">ID: {attachment.identificatienummer}</p>
                                      )}
                                      <p className="text-sm text-gray-600">{attachment.type}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {attachment.aantal_slangen || 2} hydraulische slangen
                                      </p>
                                    </div>
                                    {isConnected && (
                                      <Badge variant="secondary" className="text-xs">Al gekoppeld</Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          {attachments
                            .filter(attachment =>
                              attachment.naam.toLowerCase().includes(attachmentSearch.toLowerCase()) ||
                              (attachment.identificatienummer || '').toLowerCase().includes(attachmentSearch.toLowerCase()) ||
                              attachment.type.toLowerCase().includes(attachmentSearch.toLowerCase())
                            ).length === 0 && (
                            <div className="p-4 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                              Geen aanbouwdelen gevonden
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 flex flex-col gap-4 bg-white/80 shadow-sm rounded-lg p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Zoek op naam, kenteken of type..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={filterType}
                onValueChange={(value) => { setFilterType(value); setPage(1); }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter op type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  {allTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterConnection}
                onValueChange={(value: 'all' | 'connected' | 'unconnected') => { setFilterConnection(value); setPage(1); }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter op koppeling" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All machines</SelectItem>
                  <SelectItem value="connected">Met aanbouwdelen</SelectItem>
                  <SelectItem value="unconnected">Zonder aanbouwdelen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {search && (
            <div className="text-sm text-gray-600">
              {filteredMachines.length} van {machines.length} machines gevonden
            </div>
          )}
        </div>

        {/* Overzicht: alle machines met gekoppelde aanbouwdelen */}
        {machines.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nog geen machines beschikbaar</p>
            <p className="text-sm text-gray-400 mt-2">
              Voeg eerst machines toe in Machine Beheer
            </p>
          </div>
        )}

        {machines.length > 0 && filteredMachines.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Geen machines gevonden</p>
            <p className="text-sm text-gray-400 mt-2">
              Probeer andere zoektermen of pas de filters aan
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setSearch('');
                setFilterType('all');
                setFilterConnection('all');
                setPage(1);
              }}
            >
              Filters wissen
            </Button>
          </div>
        )}

        {pagedMachines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-lg"></div>
              Machines Overzicht
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pagedMachines.map((machine) => {
                const gekoppelde = connections.filter(c => c.machine_id === machine.id && (c.attachment || c.attachment_id));
                return (
                  <Card key={machine.id} className="bg-white/90 backdrop-blur-sm border-2 border-blue-100 hover:border-blue-300 transition-all duration-200 hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-bold text-lg text-gray-900">{machine.naam}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-6">
                          {machine.kenteken && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-medium">{machine.kenteken}</Badge>
                          )}
                          <span className="text-sm text-gray-600 font-medium">{machine.type}</span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                        <div className="text-sm text-blue-800 font-semibold mb-2">Gekoppelde aanbouwdelen:</div>
                        {gekoppelde.length === 0 ? (
                          <div className="text-sm text-gray-500 italic">Geen aanbouwdelen gekoppeld</div>
                        ) : (
                          <div className="space-y-2">
                            {gekoppelde.map((c) => {
                              const attachment = c.attachment || attachments.find(a => a.id === c.attachment_id);
                              return (
                                <div key={c.id} className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="font-medium text-sm">{attachment?.naam}</span>
                                  {attachment?.identificatienummer && (
                                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                                      ID: {attachment.identificatienummer}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-500">{attachment?.type}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagedMachines.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mb-8">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Vorige
            </Button>
            <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded border">
              Pagina {page} van {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Volgende
            </Button>
          </div>
        )}

        {/* Active Connections Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-lg"></div>
            Actieve Koppelingen
            <Badge className="bg-green-100 text-green-800 border-green-300">
              {filteredConnections.length}
            </Badge>
            {filteredConnections.length !== connections.length && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs">
                van {connections.length} totaal
              </Badge>
            )}
          </h2>
          
          {filteredConnections.length === 0 && connections.length === 0 && (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Nog geen koppelingen</p>
              <p className="text-gray-400 text-sm mt-2">Maak de eerste koppeling tussen een machine en aanbouwdeel</p>
            </div>
          )}

          {filteredConnections.length === 0 && connections.length > 0 && (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg font-medium">Geen koppelingen gevonden</p>
              <p className="text-gray-400 text-sm mt-2">Pas je zoek- of filtercriteria aan</p>
            </div>
          )}

          {filteredConnections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredConnections.map((connection) => (
                <Card 
                  key={connection.id} 
                  className="bg-white/90 backdrop-blur-sm border-2 border-green-100 hover:border-green-300 cursor-pointer transition-all duration-200 hover:shadow-xl group"
                  onClick={() => openHydraulicConfigDialog(connection)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-bold text-base">{connection.machine?.naam}</span>
                          {connection.machine?.kenteken && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">{connection.machine.kenteken}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-6">
                          <div className="text-gray-400">↓</div>
                          <span className="font-semibold text-base">{connection.attachment?.naam}</span>
                          {connection.attachment?.identificatienummer && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                              ID: {connection.attachment.identificatienummer}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectMachineFromAttachment(connection.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:shadow-md"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-blue-600" />
                        <p className="text-sm font-semibold text-blue-800">Hydraulische Configuratie</p>
                      </div>
                      <p className="text-xs text-blue-600">
                        Klik om inputs en slangen te koppelen
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Hydraulic Configuration Dialog */}
        {selectedConnection && (
          <Dialog open={hydraulicDialogOpen} onOpenChange={closeHydraulicConfigDialog}>
            <DialogContent className="w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Hydraulische Configuratie: {selectedConnection.machine?.naam} ↔ {selectedConnection.attachment?.naam}
                </DialogTitle>
                <p className="text-gray-600 text-sm mt-2">Koppel machine inputs aan aanbouwdeel slangen</p>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                {/* Machine Inputs */}
                <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-blue-800">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    Machine Inputs
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const machine = machines.find(m => m.id === selectedConnection.machine_id);
                      return machine?.machine_hydraulic_inputs?.map((input) => {
                        const connection = getConnectionForInput(input.id);
                        const isSelected = selectedInput?.id === input.id;
                        const isConnected = !!connection;
                        
                        return (
                          <div 
                            key={input.id} 
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-100 shadow-lg' 
                                : isConnected
                                ? 'border-green-500 bg-green-100'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => handleInputClick(input)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {getKleurDisplay(input.kleur)}
                                <div>
                                  <p className="font-semibold text-lg">Input #{input.volgorde}</p>
                                  {isConnected && (
                                    <p className="text-sm text-green-600 font-medium">✓ Verbonden</p>
                                  )}
                                  {isSelected && (
                                    <p className="text-sm text-blue-600 font-medium">Geselecteerd</p>
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
                                  className="hover:shadow-md"
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
                <div className="bg-orange-50/50 rounded-xl p-6 border border-orange-200">
                  <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-orange-800">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    Aanbouwdeel Slangen
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const attachment = attachments.find(a => a.id === selectedConnection.attachment_id);
                      return attachment?.attachment_hydraulic_hoses?.map((hose) => {
                        const connection = getConnectionForHose(hose.id);
                        const isSelected = selectedHose?.id === hose.id;
                        const isConnected = !!connection;
                        
                        return (
                          <div 
                            key={hose.id} 
                            className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                              isSelected 
                                ? 'border-orange-500 bg-orange-100 shadow-lg' 
                                : isConnected
                                ? 'border-green-500 bg-green-100'
                                : isConnecting && selectedInput
                                ? 'border-orange-300 bg-orange-50 hover:border-orange-400'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => handleHoseClick(hose)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {getKleurDisplay(hose.kleur)}
                                <div>
                                  <p className="font-semibold text-lg">Slang #{hose.volgorde}</p>
                                  {isConnected && (
                                    <p className="text-sm text-green-600 font-medium">✓ Verbonden</p>
                                  )}
                                  {isSelected && (
                                    <p className="text-sm text-orange-600 font-medium">Geselecteerd</p>
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
                                  className="hover:shadow-md"
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

              {/* Connection Status */}
              <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 border rounded-xl">
                <h4 className="font-semibold text-lg text-gray-800 mb-4">Actieve Hydraulische Verbindingen</h4>
                {(() => {
                  const machine = machines.find(m => m.id === selectedConnection.machine_id);
                  const attachment = attachments.find(a => a.id === selectedConnection.attachment_id);
                  const relevantConnections = hydraulicConnections.filter(
                    conn => conn.machine_id === selectedConnection.machine_id && 
                            conn.attachment_id === selectedConnection.attachment_id
                  );
                  
                  if (relevantConnections.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <p className="text-gray-500 mb-2">Nog geen hydraulische verbindingen</p>
                        <p className="text-sm text-gray-400">Selecteer eerst een machine input om te beginnen</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {relevantConnections.map((conn) => {
                        const input = machine?.machine_hydraulic_inputs?.find(i => i.id === conn.machine_input_id);
                        const hose = attachment?.attachment_hydraulic_hoses?.find(h => h.id === conn.attachment_hose_id);
                        
                        if (!input || !hose) return null;
                        
                        return (
                          <div key={conn.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-3">
                                {getKleurDisplay(input.kleur)}
                                <span className="font-medium">Input #{input.volgorde}</span>
                              </div>
                              <div className="text-gray-400 text-xl">→</div>
                              <div className="flex items-center gap-3">
                                {getKleurDisplay(hose.kleur)}
                                <span className="font-medium">Slang #{hose.volgorde}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteHydraulicConnection(conn.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                            >
                              Verwijder
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-between gap-4 mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedInput(null);
                    setSelectedHose(null);
                    setIsConnecting(false);
                  }}
                  disabled={!isConnecting}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Selectie Wissen
                </Button>
                <Button 
                  variant="outline" 
                  onClick={closeHydraulicConfigDialog}
                  className="border-gray-300 hover:bg-gray-50"
                >
                  Sluiten
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 