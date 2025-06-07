'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Settings, LogOut, QrCode, Search, CheckCircle, XCircle, Link, Tractor } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@supabase/auth-helpers-nextjs';
import { Badge } from '@/components/ui/badge';
import QRScanner from '@/components/ui/QRScanner';
import { toast } from 'sonner';

interface ExtendedMachine {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  afbeelding?: string;
  kenteken?: string;
  hydraulische_inputs?: number;
  gewicht?: number;
  werkdruk?: number;
  max_druk?: number;
  debiet?: number;
  vermogen?: number;
  machine_hydraulic_inputs?: HydraulicInput[];
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

interface Attachment {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  afbeelding?: string;
  gewicht: number;
  werkdruk: number;
  max_druk: number;
  debiet?: number;
  vermogen?: number;
  aantal_slangen?: number;
  identificatienummer?: string;
  attachment_hydraulic_hoses?: HydraulicHose[];
}

interface HydraulicHose {
  id: string;
  hose_nummer: number;
  hose_kleur: string;
  hose_label: string;
  functie_beschrijving: string;
  volgorde: number;
  druk_rating?: number;
  debiet_rating?: number;
}

interface AttachmentMachineConnection {
  id: string;
  machine_id: string;
  attachment_id: string;
  created_at?: string;
}

export default function DashboardPage() {
  const [machines, setMachines] = useState<ExtendedMachine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [connections, setConnections] = useState<AttachmentMachineConnection[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<ExtendedMachine | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Search states
  const [showMachineSearch, setShowMachineSearch] = useState(false);
  const [showAttachmentSearch, setShowAttachmentSearch] = useState(false);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  const [attachmentSearchTerm, setAttachmentSearchTerm] = useState('');
  
  // QR Scanner states
  const [showMachineScanner, setShowMachineScanner] = useState(false);
  const [showAttachmentScanner, setShowAttachmentScanner] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchData = useCallback(async () => {
    try {
      // Authentication check (simplified for space)
      let session = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          session = sessionData.session;
          break;
        }
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!session) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session) {
          session = refreshData.session;
        }
      }
      
      if (!session) {
        setMachines([]);
        setAttachments([]);
        setConnections([]);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Check admin status - both email-based and database role-based
      let adminStatus = false;
      
      // First check email for admin
      if (session.user.email?.includes('admin')) {
        adminStatus = true;
      } else {
        // Then check database role
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          if (profile && profile.role === 'admin') {
            adminStatus = true;
          }
        } catch (error) {
          console.log('Could not check database admin role:', error);
        }
      }
      
      setIsAdmin(adminStatus);

      // Fetch machines with hydraulic inputs
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select(`
          *,
          machine_hydraulic_inputs (*)
        `);

      if (!machinesError && machinesData) {
        setMachines(machinesData);
      }

      // Fetch attachments with hydraulic hoses
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select(`
          *,
          attachment_hydraulic_hoses (*)
        `);

      if (!attachmentsError && attachmentsData) {
        setAttachments(attachmentsData);
      }

      // Fetch machine-attachment connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('attachment_machines')
        .select('*');

      if (!connectionsError && connectionsData) {
        setConnections(connectionsData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const checkCompatibility = () => {
    if (!selectedMachine || !selectedAttachment) return null;
    
    // First check if the machine and attachment are coupled in the database
    const isCoupled = connections.some(conn => 
      conn.machine_id === selectedMachine.id && conn.attachment_id === selectedAttachment.id
    );
    
    if (!isCoupled) {
      return {
        compatible: false,
        isCoupled: false,
        machineInputs: selectedMachine.machine_hydraulic_inputs?.length || 0,
        attachmentHoses: selectedAttachment.attachment_hydraulic_hoses?.length || 0,
        pressureMatch: false
      };
    }
    
    const machineInputs = selectedMachine.machine_hydraulic_inputs || [];
    const attachmentHoses = selectedAttachment.attachment_hydraulic_hoses || [];
    
    // Basic compatibility check
    const hasMatchingConnections = machineInputs.length > 0 && attachmentHoses.length > 0;
    const pressureCompatible = (selectedMachine.max_druk || 0) >= selectedAttachment.werkdruk;
    
    return {
      compatible: hasMatchingConnections && pressureCompatible,
      isCoupled: true,
      machineInputs: machineInputs.length,
      attachmentHoses: attachmentHoses.length,
      pressureMatch: pressureCompatible
    };
  };

  const filteredMachines = machines.filter(machine =>
    machine.naam.toLowerCase().includes(machineSearchTerm.toLowerCase()) ||
    machine.type.toLowerCase().includes(machineSearchTerm.toLowerCase())
  );

  const filteredAttachments = attachments.filter(attachment =>
    attachment.naam.toLowerCase().includes(attachmentSearchTerm.toLowerCase()) ||
    attachment.type.toLowerCase().includes(attachmentSearchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const compatibility = checkCompatibility();

  const handleMachineScan = (qrData: string) => {
    try {
      // Try to parse QR data as JSON (machine info)
      const machineInfo = JSON.parse(qrData);
      
      // Find the machine by ID
      const machine = machines.find(m => m.id === machineInfo.id);
      if (machine) {
        setSelectedMachine(machine);
        setShowMachineScanner(false);
        setShowMachineSearch(false);
        toast.success(`Machine "${machine.naam}" geselecteerd!`);
      } else {
        toast.error('Machine niet gevonden in database');
      }
    } catch {
      // If not JSON, try to find by direct ID match
      const machine = machines.find(m => m.id === qrData);
      if (machine) {
        setSelectedMachine(machine);
        setShowMachineScanner(false);
        setShowMachineSearch(false);
        toast.success(`Machine "${machine.naam}" geselecteerd!`);
      } else {
        toast.error('Ongeldige QR-code voor machine');
      }
    }
  };

  const handleAttachmentScan = (qrData: string) => {
    try {
      // Try to parse QR data as JSON (attachment info)
      const attachmentInfo = JSON.parse(qrData);
      
      // Find the attachment by ID
      const attachment = attachments.find(a => a.id === attachmentInfo.id);
      if (attachment) {
        setSelectedAttachment(attachment);
        setShowAttachmentScanner(false);
        setShowAttachmentSearch(false);
        toast.success(`Aanbouwdeel "${attachment.naam}" geselecteerd!`);
      } else {
        toast.error('Aanbouwdeel niet gevonden in database');
      }
    } catch {
      // If not JSON, try to find by direct ID match
      const attachment = attachments.find(a => a.id === qrData);
      if (attachment) {
        setSelectedAttachment(attachment);
        setShowAttachmentScanner(false);
        setShowAttachmentSearch(false);
        toast.success(`Aanbouwdeel "${attachment.naam}" geselecteerd!`);
      } else {
        toast.error('Ongeldige QR-code voor aanbouwdeel');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 bg-white rounded-lg p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mechielsen Dashboard</h1>
            {user && (
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Welkom {user.email}</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => router.push(`/admin?verified=true&email=${encodeURIComponent(user?.email || '')}`)}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Settings className="w-4 h-4" />
                <span className="sm:inline">Admin Panel</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              <span className="sm:inline">Uitloggen</span>
            </Button>
          </div>
        </div>

        {/* Compatibility Status */}
        {(selectedMachine || selectedAttachment) && (
          <div className="mb-4 sm:mb-6">
            <Card className={`border-2 ${
              compatibility?.compatible 
                ? 'border-green-300 bg-green-50' 
                : selectedMachine && selectedAttachment 
                  ? 'border-red-300 bg-red-50'
                  : 'border-yellow-300 bg-yellow-50'
            }`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-start sm:items-center gap-3">
                    {compatibility?.compatible ? (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-1 sm:mt-0" />
                    ) : selectedMachine && selectedAttachment ? (
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-1 sm:mt-0" />
                    ) : (
                      <Link className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0 mt-1 sm:mt-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base leading-tight">
                        {compatibility?.compatible 
                          ? 'Compatibel! Deze combinatie kan worden gebruikt.' 
                          : selectedMachine && selectedAttachment 
                            ? compatibility?.isCoupled === false
                              ? 'Niet compatibel! Deze combinatie is niet mogelijk.'
                              : 'Niet compatibel - Controleer specificaties.'
                            : 'Selecteer een machine en aanbouwdeel om compatibiliteit te checken.'
                        }
                      </h3>
                      {compatibility && compatibility.isCoupled === false && (
                        <p className="text-xs sm:text-sm text-orange-600 mt-1 font-medium">
                          Als je dit wel zou willen moet je via admin de machine aan de aanbouwdeel koppelen.
                        </p>
                      )}
                      {compatibility && compatibility.isCoupled === true && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          Machine inputs: {compatibility.machineInputs} | 
                          Attachment hoses: {compatibility.attachmentHoses} | 
                          Druk: {compatibility.pressureMatch ? '✓' : '✗'}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedMachine && selectedAttachment && compatibility?.compatible && (
                    <Button 
                      onClick={() => router.push(`/dashboard/machines/${selectedMachine.id}/visual-config?attachmentId=${selectedAttachment.id}`)}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    >
                      Configureren
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Machines Section */}
          <Card className="h-fit">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Tractor className="w-4 h-4 sm:w-5 sm:h-5" />
                  Machines
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMachineSearch(!showMachineSearch)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto touch-btn"
                  >
                    <Search className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Geen QR code</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMachineScanner(true)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto touch-btn"
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Scan QR</span>
                  </Button>
                </div>
              </div>
              
              {showMachineSearch && (
                <div className="mt-3 sm:mt-4">
                  <Input
                    placeholder="Zoek machines..."
                    value={machineSearchTerm}
                    onChange={(e) => setMachineSearchTerm(e.target.value)}
                    className="w-full text-base"
                  />
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-3 sm:p-6">
              {!selectedMachine && !showMachineSearch && (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <QrCode className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">Geen machine geselecteerd</h3>
                  <p className="text-sm">Scan een QR code of zoek handmatig</p>
                </div>
              )}
              
              {selectedMachine && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    {selectedMachine.afbeelding && (
                      <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden bg-gray-100 mb-3 sm:mb-4">
                        <Image
                          src={selectedMachine.afbeelding}
                          alt={selectedMachine.naam}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">Geselecteerd</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold">{selectedMachine.naam}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{selectedMachine.type}</p>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-3">{selectedMachine.beschrijving}</p>
                    
                    <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                      {selectedMachine.hydraulische_inputs && (
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="font-medium">Inputs:</span> {selectedMachine.hydraulische_inputs}
                        </div>
                      )}
                      {selectedMachine.max_druk && (
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="font-medium">Max druk:</span> {selectedMachine.max_druk} bar
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedMachine(null)}
                    className="w-full touch-btn"
                  >
                    Andere machine selecteren
                  </Button>
                </div>
              )}
              
              {showMachineSearch && (
                <div className="grid grid-cols-1 gap-3 max-h-80 sm:max-h-96 overflow-y-auto mobile-scroll">
                  {filteredMachines.map((machine) => (
                    <Card
                      key={machine.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300 tap-target"
                      onClick={() => {
                        setSelectedMachine(machine);
                        setShowMachineSearch(false);
                        setMachineSearchTerm('');
                      }}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-row items-center gap-3">
                          {machine.afbeelding && (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image
                                src={machine.afbeelding}
                                alt={machine.naam}
                                width={64}
                                height={64}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm sm:text-base truncate">{machine.naam}</h4>
                              {machine.kenteken && (
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">{machine.kenteken}</Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{machine.type}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs text-gray-500">{machine.hydraulische_inputs} inputs</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Section */}
          <Card className="h-fit">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  Aanbouwdelen
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttachmentSearch(!showAttachmentSearch)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto touch-btn"
                  >
                    <Search className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Geen QR code</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttachmentScanner(true)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto touch-btn"
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Scan QR</span>
                  </Button>
                </div>
              </div>
              
              {showAttachmentSearch && (
                <div className="mt-3 sm:mt-4">
                  <Input
                    placeholder="Zoek aanbouwdelen..."
                    value={attachmentSearchTerm}
                    onChange={(e) => setAttachmentSearchTerm(e.target.value)}
                    className="w-full text-base"
                  />
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-3 sm:p-6">
              {!selectedAttachment && !showAttachmentSearch && (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                  <Settings className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">Geen aanbouwdeel geselecteerd</h3>
                  <p className="text-sm">Scan een QR code of zoek handmatig</p>
                </div>
              )}
              
              {selectedAttachment && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative">
                    {selectedAttachment.afbeelding && (
                      <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden bg-gray-100 mb-3 sm:mb-4">
                        <Image
                          src={selectedAttachment.afbeelding}
                          alt={selectedAttachment.naam}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">Geselecteerd</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold">{selectedAttachment.naam}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{selectedAttachment.type}</p>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-3">{selectedAttachment.beschrijving}</p>
                    
                    <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">Gewicht:</span> {selectedAttachment.gewicht} kg
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">Werkdruk:</span> {selectedAttachment.werkdruk} bar
                      </div>
                      {selectedAttachment.aantal_slangen && (
                        <div className="bg-gray-50 p-2 rounded sm:col-span-2">
                          <span className="font-medium">Slangen:</span> {selectedAttachment.aantal_slangen}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedAttachment(null)}
                    className="w-full touch-btn"
                  >
                    Ander aanbouwdeel selecteren
                  </Button>
                </div>
              )}
              
              {showAttachmentSearch && (
                <div className="grid grid-cols-1 gap-3 max-h-80 sm:max-h-96 overflow-y-auto mobile-scroll">
                  {filteredAttachments.map((attachment) => (
                    <Card
                      key={attachment.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300 tap-target"
                      onClick={() => {
                        setSelectedAttachment(attachment);
                        setShowAttachmentSearch(false);
                        setAttachmentSearchTerm('');
                      }}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-row items-center gap-3">
                          {attachment.afbeelding && (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image
                                src={attachment.afbeelding}
                                alt={attachment.naam}
                                width={64}
                                height={64}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm sm:text-base truncate">{attachment.naam}</h4>
                              {attachment.identificatienummer && (
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">ID: {attachment.identificatienummer}</Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{attachment.type}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs text-gray-500">{attachment.werkdruk} bar</span>
                              <span className="text-xs text-gray-500">{attachment.gewicht} kg</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Scanners */}
        {showMachineScanner && (
          <QRScanner
            onScan={handleMachineScan}
            onClose={() => setShowMachineScanner(false)}
            label="Scan Machine QR Code"
          />
        )}
        
        {showAttachmentScanner && (
          <QRScanner
            onScan={handleAttachmentScan}
            onClose={() => setShowAttachmentScanner(false)}
            label="Scan Aanbouwdeel QR Code"
          />
        )}
      </div>
    </div>
  );
} 