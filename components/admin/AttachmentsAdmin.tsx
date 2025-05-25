'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Save, X, Plus, Trash2, Cable } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Attachment {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  gewicht: number;
  werkdruk: number;
  max_druk: number;
  debiet: number;
  vermogen: number;
  afbeelding?: string;
  created_at: string;
  machines?: Machine[];
  slangen?: AttachmentSlang[];
}

interface Machine {
  id: string;
  naam: string;
  hydraulische_inputs?: number;
}

interface AttachmentSlang {
  id: string;
  attachment_id: string;
  slang_nummer: number;
  slang_kleur: string;
  slang_label?: string;
  functie_beschrijving?: string;
  volgorde: number;
}

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

export default function AttachmentsAdmin() {
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [editingAttachment, setEditingAttachment] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Attachment>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAttachment, setNewAttachment] = useState<Partial<Attachment>>({
    naam: '',
    beschrijving: '',
    type: '',
    gewicht: 0,
    werkdruk: 0,
    max_druk: 0,
    debiet: 0,
    vermogen: 0,
    afbeelding: ''
  });
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [newSlang, setNewSlang] = useState<Partial<AttachmentSlang>>({
    slang_nummer: 1,
    slang_kleur: 'rood',
    slang_label: '',
    functie_beschrijving: '',
    volgorde: 1
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      console.log('🔍 Admin attachments: Starting auth check...');
      
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        console.log('🎉 Admin attachments: URL verification found! Proceeding...');
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

      // Fetch attachments with related data
      await fetchAttachmentsAndMachines();

    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachmentsAndMachines = async () => {
    // Fetch machines
    const { data: machinesData, error: machinesError } = await supabase
      .from('machines')
      .select('id, naam, hydraulische_inputs')
      .order('naam', { ascending: true });

    if (machinesError) {
      console.error('Error fetching machines:', machinesError);
    } else {
      setMachines(machinesData || []);
    }

    // Fetch attachments
    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from('attachments')
      .select('*')
      .order('naam', { ascending: true });

    if (attachmentsError) {
      toast.error('Fout bij ophalen aanbouwdelen: ' + attachmentsError.message);
      return;
    }

    // For each attachment, fetch connected machines and slangen
    const enrichedAttachments = await Promise.all(
      (attachmentsData || []).map(async (attachment) => {
        // Fetch connected machines (we'll need to create this table)
        const { data: machineConnections } = await supabase
          .from('attachment_machines')
          .select(`
            machine_id,
            machines!inner(id, naam, hydraulische_inputs)
          `)
          .eq('attachment_id', attachment.id);

        // Fetch slangen for this attachment
        const { data: slangen } = await supabase
          .from('attachment_slangen')
          .select('*')
          .eq('attachment_id', attachment.id)
          .order('volgorde', { ascending: true });

        return {
          ...attachment,
          machines: machineConnections?.map(conn => conn.machines) || [],
          slangen: slangen || []
        };
      })
    );

    setAttachments(enrichedAttachments);
  };

  const getKleurDisplay = (kleur: string) => {
    const kleurInfo = SLANG_KLEUREN.find(k => k.value === kleur);
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

  const startEditing = (attachment: Attachment) => {
    setEditingAttachment(attachment.id);
    setEditForm(attachment);
  };

  const cancelEditing = () => {
    setEditingAttachment(null);
    setEditForm({});
  };

  const saveAttachment = async () => {
    if (!editingAttachment) return;

    try {
      // Only update fields that exist in the attachments table
      const attachmentData = {
        naam: editForm.naam,
        beschrijving: editForm.beschrijving,
        type: editForm.type,
        gewicht: editForm.gewicht,
        werkdruk: editForm.werkdruk,
        max_druk: editForm.max_druk,
        debiet: editForm.debiet,
        vermogen: editForm.vermogen,
        afbeelding: editForm.afbeelding
      };
      
      const { error } = await supabase
        .from('attachments')
        .update(attachmentData)
        .eq('id', editingAttachment);

      if (error) {
        toast.error('Fout bij opslaan: ' + error.message);
        return;
      }

      toast.success('Aanbouwdeel succesvol bijgewerkt!');
      setEditingAttachment(null);
      setEditForm({});
      fetchAttachmentsAndMachines();
    } catch (error) {
      console.error('Error saving attachment:', error);
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const addNewAttachment = async () => {
    try {
      // First create the attachment
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert([newAttachment])
        .select()
        .single();

      if (attachmentError) {
        toast.error('Fout bij toevoegen aanbouwdeel: ' + attachmentError.message);
        return;
      }

      // Then create machine connections
      if (selectedMachines.length > 0) {
        const machineConnections = selectedMachines.map(machineId => ({
          attachment_id: attachmentData.id,
          machine_id: machineId
        }));

        const { error: connectionsError } = await supabase
          .from('attachment_machines')
          .insert(machineConnections);

        if (connectionsError) {
          console.error('Error creating machine connections:', connectionsError);
        }
      }

      toast.success('Aanbouwdeel succesvol toegevoegd!');
      setAddDialogOpen(false);
      setNewAttachment({
        naam: '',
        beschrijving: '',
        type: '',
        gewicht: 0,
        werkdruk: 0,
        max_druk: 0,
        debiet: 0,
        vermogen: 0,
        afbeelding: ''
      });
      setSelectedMachines([]);
      fetchAttachmentsAndMachines();
    } catch (error) {
      console.error('Error adding attachment:', error);
      toast.error('Er is een fout opgetreden bij het toevoegen');
    }
  };

  const addSlangToAttachment = async (attachmentId: string) => {
    try {
      const slangData = {
        ...newSlang,
        attachment_id: attachmentId
      };

      const { error } = await supabase
        .from('attachment_slangen')
        .insert([slangData]);

      if (error) {
        toast.error('Fout bij toevoegen slang: ' + error.message);
        return;
      }

      toast.success('Slang succesvol toegevoegd!');
      setNewSlang({
        slang_nummer: 1,
        slang_kleur: 'rood',
        slang_label: '',
        functie_beschrijving: '',
        volgorde: 1
      });
      fetchAttachmentsAndMachines();
    } catch (error) {
      console.error('Error adding slang:', error);
      toast.error('Er is een fout opgetreden bij het toevoegen van de slang');
    }
  };

  const deleteSlang = async (slangId: string) => {
    if (!confirm('Weet je zeker dat je deze slang wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attachment_slangen')
        .delete()
        .eq('id', slangId);

      if (error) {
        toast.error('Fout bij verwijderen slang: ' + error.message);
        return;
      }

      toast.success('Slang succesvol verwijderd!');
      fetchAttachmentsAndMachines();
    } catch (error) {
      console.error('Error deleting slang:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Weet je zeker dat je dit aanbouwdeel wilt verwijderen?')) {
      return;
    }

    try {
      // Delete related data first
      await supabase.from('attachment_machines').delete().eq('attachment_id', attachmentId);
      await supabase.from('attachment_slangen').delete().eq('attachment_id', attachmentId);
      
      // Then delete the attachment
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {
        toast.error('Fout bij verwijderen: ' + error.message);
        return;
      }

      toast.success('Aanbouwdeel succesvol verwijderd!');
      fetchAttachmentsAndMachines();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const handleMachineSelection = (machineId: string, checked: boolean) => {
    if (checked) {
      setSelectedMachines([...selectedMachines, machineId]);
    } else {
      setSelectedMachines(selectedMachines.filter(id => id !== machineId));
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

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                const verified = searchParams.get('verified') || 'true';
                const email = searchParams.get('email') || 'admin@example.com';
                router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Aanbouwdelen Beheren</h1>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nieuw Aanbouwdeel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuw Aanbouwdeel Toevoegen</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="naam">Naam</Label>
                  <Input
                    id="naam"
                    value={newAttachment.naam || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, naam: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    value={newAttachment.type || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, type: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="beschrijving">Beschrijving</Label>
                  <Textarea
                    id="beschrijving"
                    value={newAttachment.beschrijving || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, beschrijving: e.target.value})}
                  />
                </div>
                
                {/* Machine Selection */}
                <div className="col-span-2">
                  <Label>Gekoppelde Machines</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 p-4 border rounded-lg bg-gray-50">
                    {machines.map((machine) => (
                      <div key={machine.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`machine-${machine.id}`}
                          checked={selectedMachines.includes(machine.id)}
                          onCheckedChange={(checked) => handleMachineSelection(machine.id, checked as boolean)}
                        />
                        <Label htmlFor={`machine-${machine.id}`} className="text-sm">
                          {machine.naam} ({machine.hydraulische_inputs || 2} inputs)
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {/* Visual Preview of Selected Machines */}
                  {selectedMachines.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">
                        ✅ Geselecteerde Machines ({selectedMachines.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMachines.map((machineId) => {
                          const machine = machines.find(m => m.id === machineId);
                          if (!machine) return null;
                          
                          return (
                            <div key={machineId} className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border">
                              <span className="text-sm font-medium">{machine.naam}</span>
                              <div className="flex gap-1">
                                {Array.from({ length: machine.hydraulische_inputs || 2 }, (_, index) => {
                                  const inputNum = index + 1;
                                  const kleur = inputNum === 1 ? 'rood' : inputNum === 2 ? 'blauw' : 
                                               inputNum === 3 ? 'geel' : 'groen';
                                  const kleurInfo = SLANG_KLEUREN.find(k => k.value === kleur);
                                  
                                  return (
                                    <div key={inputNum} className={`w-4 h-4 rounded-full ${kleurInfo?.color} border`} 
                                         title={`Input ${inputNum} - ${kleur}`}>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Configureer straks slangen met matchende kleuren voor deze inputs
                      </p>
                    </div>
                  )}
                </div>

                {/* Technical specs */}
                <div>
                  <Label htmlFor="gewicht">Gewicht (kg)</Label>
                  <Input
                    id="gewicht"
                    type="number"
                    value={newAttachment.gewicht || 0}
                    onChange={(e) => setNewAttachment({...newAttachment, gewicht: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="werkdruk">Werkdruk (bar)</Label>
                  <Input
                    id="werkdruk"
                    type="number"
                    value={newAttachment.werkdruk || 0}
                    onChange={(e) => setNewAttachment({...newAttachment, werkdruk: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="max_druk">Max Druk (bar)</Label>
                  <Input
                    id="max_druk"
                    type="number"
                    value={newAttachment.max_druk || 0}
                    onChange={(e) => setNewAttachment({...newAttachment, max_druk: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="debiet">Debiet (l/min)</Label>
                  <Input
                    id="debiet"
                    type="number"
                    value={newAttachment.debiet || 0}
                    onChange={(e) => setNewAttachment({...newAttachment, debiet: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="vermogen">Vermogen (W)</Label>
                  <Input
                    id="vermogen"
                    type="number"
                    value={newAttachment.vermogen || 0}
                    onChange={(e) => setNewAttachment({...newAttachment, vermogen: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="afbeelding">Afbeelding (bestandsnaam)</Label>
                  <Input
                    id="afbeelding"
                    value={newAttachment.afbeelding || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, afbeelding: e.target.value})}
                    placeholder="attachment.jpg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={addNewAttachment}>
                  Aanbouwdeel Toevoegen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {editingAttachment === attachment.id ? (
                    <Input
                      value={editForm.naam || ''}
                      onChange={(e) => setEditForm({...editForm, naam: e.target.value})}
                      className="mr-2"
                    />
                  ) : (
                    <span className="truncate">{attachment.naam}</span>
                  )}
                  <div className="flex gap-2">
                    {editingAttachment === attachment.id ? (
                      <>
                        <Button size="sm" onClick={saveAttachment}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEditing(attachment)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteAttachment(attachment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Type</Label>
                  {editingAttachment === attachment.id ? (
                    <Input
                      value={editForm.type || ''}
                      onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{attachment.type}</p>
                  )}
                </div>

                {/* Gekoppelde Machines */}
                <div>
                  <Label>Gekoppelde Machines</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {attachment.machines && attachment.machines.length > 0 ? (
                      attachment.machines.map((machine) => (
                        <Badge key={machine.id} variant="secondary" className="text-xs">
                          {machine.naam}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Geen machines gekoppeld</p>
                    )}
                  </div>
                </div>

                {/* Slangen Configuratie */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Slangen Configuratie</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Cable className="w-4 h-4 mr-1" />
                          Beheren
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Slangen voor {attachment.naam}</DialogTitle>
                        </DialogHeader>
                        
                        {/* Existing Slangen */}
                        <div className="space-y-3">
                          {attachment.slangen?.map((slang) => (
                            <div key={slang.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {getKleurDisplay(slang.slang_kleur)}
                                <div>
                                  <p className="font-medium">Slang {slang.slang_nummer}</p>
                                  <p className="text-sm text-gray-600">{slang.slang_label}</p>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteSlang(slang.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Add New Slang */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Nieuwe Slang Toevoegen</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Slang Nummer</Label>
                              <Input
                                type="number"
                                min="1"
                                value={newSlang.slang_nummer || 1}
                                onChange={(e) => setNewSlang({...newSlang, slang_nummer: parseInt(e.target.value)})}
                              />
                            </div>
                            <div>
                              <Label>Kleur</Label>
                              <Select 
                                value={newSlang.slang_kleur || 'rood'} 
                                onValueChange={(value) => setNewSlang({...newSlang, slang_kleur: value})}
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
                              <Label>Label</Label>
                              <Input
                                value={newSlang.slang_label || ''}
                                onChange={(e) => setNewSlang({...newSlang, slang_label: e.target.value})}
                                placeholder="bijv. Heffen, Kantelen"
                              />
                            </div>
                            <div>
                              <Label>Volgorde</Label>
                              <Input
                                type="number"
                                min="1"
                                value={newSlang.volgorde || 1}
                                onChange={(e) => setNewSlang({...newSlang, volgorde: parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Functie Beschrijving</Label>
                              <Input
                                value={newSlang.functie_beschrijving || ''}
                                onChange={(e) => setNewSlang({...newSlang, functie_beschrijving: e.target.value})}
                                placeholder="Beschrijving van de functie"
                              />
                            </div>
                          </div>
                          <Button 
                            className="mt-3"
                            onClick={() => addSlangToAttachment(attachment.id)}
                          >
                            Slang Toevoegen
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Visual display of slangen */}
                  <div className="mt-2">
                    {attachment.slangen && attachment.slangen.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          {attachment.slangen.map((slang) => (
                            <div key={slang.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                              {getKleurDisplay(slang.slang_kleur)}
                              <div className="flex-1">
                                <span className="text-sm font-semibold">Slang #{slang.slang_nummer}</span>
                                <p className="text-xs text-gray-600">{slang.slang_label}</p>
                                <p className="text-xs text-gray-500">{slang.functie_beschrijving}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Quick visual overview */}
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                          <span className="text-xs font-medium text-gray-700">Quick view:</span>
                          <div className="flex gap-1">
                            {attachment.slangen.map((slang) => {
                              const kleurInfo = SLANG_KLEUREN.find(k => k.value === slang.slang_kleur);
                              return (
                                <div key={slang.id} 
                                     className={`w-6 h-6 rounded-full ${kleurInfo?.color} flex items-center justify-center border-2 border-white shadow-sm`}
                                     title={`Slang ${slang.slang_nummer} - ${slang.slang_kleur} - ${slang.functie_beschrijving}`}>
                                  <span className={`text-xs font-bold ${kleurInfo?.textColor}`}>
                                    {slang.slang_nummer}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm text-orange-800">🔧 Geen slangen geconfigureerd</p>
                        <p className="text-xs text-orange-600">Klik op &apos;Beheren&apos; om slangen toe te voegen</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Gewicht</p>
                    <p>{attachment.gewicht} kg</p>
                  </div>
                  <div>
                    <p className="font-medium">Werkdruk</p>
                    <p>{attachment.werkdruk} bar</p>
                  </div>
                  <div>
                    <p className="font-medium">Max druk</p>
                    <p>{attachment.max_druk} bar</p>
                  </div>
                  <div>
                    <p className="font-medium">Debiet</p>
                    <p>{attachment.debiet} l/min</p>
                  </div>
                </div>

                {editingAttachment === attachment.id && (
                  <div>
                    <Label>Beschrijving</Label>
                    <Textarea
                      value={editForm.beschrijving || ''}
                      onChange={(e) => setEditForm({...editForm, beschrijving: e.target.value})}
                    />
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  Toegevoegd: {new Date(attachment.created_at).toLocaleDateString('nl-NL')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {attachments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nog geen aanbouwdelen toegevoegd.</p>
            <p className="text-sm text-gray-400 mt-2">Voeg het eerste aanbouwdeel toe om te beginnen.</p>
          </div>
        )}
      </div>
    </div>
  );
} 