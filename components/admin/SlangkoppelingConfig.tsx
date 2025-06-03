'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Save, X, Plus, Trash2, Cable, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Machine {
  id: string;
  naam: string;
  type: string;
}

interface Attachment {
  id: string;
  naam: string;
}

interface Ventiel {
  id: string;
  ventiel_nummer: string;
  functie_naam: string;
  kleur_code?: string;
  poort_a_label: string;
  poort_b_label: string;
}

interface SlangKoppeling {
  id: string;
  machine_id: string;
  attachment_id?: string;
  slang_nummer: number;
  slang_kleur: string;
  slang_label: string;
  ventiel_id: string;
  poort: 'A' | 'B' | 'P' | 'T';
  functie_beschrijving: string;
  instructie_tekst: string;
  volgorde: number;
  connection_type: 'single_acting' | 'double_acting' | 'high_flow' | 'low_flow';
  pressure_rating: number;
  flow_rating: number;
}

const SLANG_KLEUREN = [
  { value: 'rood', label: 'Rood', color: 'bg-red-500' },
  { value: 'blauw', label: 'Blauw', color: 'bg-blue-500' },
  { value: 'geel', label: 'Geel', color: 'bg-yellow-500' },
  { value: 'groen', label: 'Groen', color: 'bg-green-500' },
  { value: 'zwart', label: 'Zwart', color: 'bg-black' },
  { value: 'wit', label: 'Wit', color: 'bg-white border' },
  { value: 'oranje', label: 'Oranje', color: 'bg-orange-500' },
  { value: 'paars', label: 'Paars', color: 'bg-purple-500' }
];

interface SlangkoppelingConfigProps {
  machineId: string;
}

export default function SlangkoppelingConfig({ machineId }: SlangkoppelingConfigProps) {
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [ventielen, setVentielen] = useState<Ventiel[]>([]);
  const [slangkoppelingen, setSlangkoppelingen] = useState<SlangKoppeling[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [editingKoppeling, setEditingKoppeling] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SlangKoppeling>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKoppeling, setNewKoppeling] = useState<Partial<SlangKoppeling>>({
    slang_nummer: 1,
    slang_kleur: 'rood',
    slang_label: '',
    ventiel_id: '',
    poort: 'A',
    functie_beschrijving: '',
    instructie_tekst: '',
    volgorde: 1,
    connection_type: 'single_acting',
    pressure_rating: 250,
    flow_rating: 40
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAdminAndFetchData();
  }, [machineId]);

  useEffect(() => {
    if (selectedAttachment) {
      fetchSlangkoppelingen();
    }
  }, [selectedAttachment]);

  useEffect(() => {
    if (selectedAttachment) {
      const maxVolgorde = Math.max(0, ...slangkoppelingen.map(k => k.volgorde || 0));
      setNewKoppeling(k => ({ ...k, volgorde: maxVolgorde + 1 }));
    }
  }, [addDialogOpen, selectedAttachment, slangkoppelingen]);

  const checkAdminAndFetchData = async () => {
    try {
      console.log('🔍 Admin slangkoppeling: Starting auth check...');
      
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        console.log('🎉 Admin slangkoppeling: URL verification found! Proceeding...');
      } else {
        // Fall back to session check
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError || !session) {
          router.push('/login');
          return;
        }
        
        // Admin check
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

      // Fetch machine info
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('id, naam, type')
        .eq('id', machineId)
        .single();

      if (machineError) {
        toast.error('Fout bij ophalen machine: ' + machineError.message);
        return;
      }

      setMachine(machineData);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select('id, naam')
        .order('naam', { ascending: true });

      if (attachmentsError) {
        console.error('Error fetching attachments:', attachmentsError);
      } else {
        setAttachments(attachmentsData || []);
      }

      // Fetch ventielen for this machine via API
      const ventielenResponse = await fetch(`/api/machine-ventielen?machineId=${machineId}`);
      if (ventielenResponse.ok) {
        const ventielenData = await ventielenResponse.json();
        setVentielen(ventielenData || []);
      } else {
        console.error('Error fetching ventielen:', await ventielenResponse.text());
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlangkoppelingen = async () => {
    try {
      const response = await fetch(`/api/slang-koppelingen?machineId=${machineId}`);
      if (response.ok) {
        const data = await response.json();
        // Filter by attachment if selected (API returns all connections for machine)
        const filteredData = selectedAttachment 
          ? data.filter((item: any) => item.attachment_id === selectedAttachment)
          : data;
        setSlangkoppelingen(filteredData || []);
      } else {
        console.error('Error fetching slangkoppelingen:', await response.text());
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startEditing = (koppeling: SlangKoppeling) => {
    setEditingKoppeling(koppeling.id);
    setEditForm(koppeling);
  };

  const cancelEditing = () => {
    setEditingKoppeling(null);
    setEditForm({});
  };

  const saveKoppeling = async () => {
    if (!editingKoppeling) return;

    try {
      const response = await fetch('/api/slang-koppelingen', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: editingKoppeling, ...editForm }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij opslaan: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Slangkoppeling succesvol bijgewerkt!');
      setEditingKoppeling(null);
      setEditForm({});
      fetchSlangkoppelingen();
    } catch (error) {
      console.error('Error saving koppeling:', error);
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const addNewKoppeling = async () => {
    try {
      const koppelingData = {
        ...newKoppeling,
        machine_id: machineId,
        attachment_id: selectedAttachment || null
      };

      const response = await fetch('/api/slang-koppelingen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(koppelingData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij toevoegen slangkoppeling: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Slangkoppeling succesvol toegevoegd!');
      setAddDialogOpen(false);
      setNewKoppeling({
        slang_nummer: 1,
        slang_kleur: 'rood',
        slang_label: '',
        ventiel_id: '',
        poort: 'A',
        functie_beschrijving: '',
        instructie_tekst: '',
        volgorde: 1,
        connection_type: 'single_acting',
        pressure_rating: 250,
        flow_rating: 40
      });
      fetchSlangkoppelingen();
    } catch (error) {
      console.error('Error adding koppeling:', error);
      toast.error('Er is een fout opgetreden bij het toevoegen');
    }
  };

  const deleteKoppeling = async (koppelingId: string) => {
    if (!confirm('Weet je zeker dat je deze slangkoppeling wilt verwijderen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/slang-koppelingen?id=${koppelingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij verwijderen: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Slangkoppeling succesvol verwijderd!');
      fetchSlangkoppelingen();
    } catch (error) {
      console.error('Error deleting koppeling:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const getVentielInfo = (ventielId?: string) => {
    if (!ventielId) return null;
    return ventielen.find(v => v.id === ventielId);
  };

  const getKleurBadge = (kleurCode?: string) => {
    const kleur = SLANG_KLEUREN.find(k => k.value === kleurCode);
    if (!kleur) return null;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full ${kleur.color}`}></div>
        <span className="text-sm">{kleur.label}</span>
      </div>
    );
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

  if (!machine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Machine niet gevonden</p>
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
                router.push(`/admin/machines?verified=${verified}&email=${encodeURIComponent(email)}`);
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar Machines
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Slangkoppeling Instructies</h1>
              <p className="text-gray-600">{machine.naam} ({machine.type})</p>
            </div>
          </div>
          
          {selectedAttachment && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nieuwe Slangkoppeling
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nieuwe Slangkoppeling Toevoegen</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="slang_nummer">Slang Nummer</Label>
                    <Input
                      id="slang_nummer"
                      type="number"
                      min="1"
                      value={newKoppeling.slang_nummer || 1}
                      onChange={(e) => setNewKoppeling({...newKoppeling, slang_nummer: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slang_label">Slang Label</Label>
                    <Input
                      id="slang_label"
                      value={newKoppeling.slang_label || ''}
                      onChange={(e) => setNewKoppeling({...newKoppeling, slang_label: e.target.value})}
                      placeholder="Heffen, Kantelen, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="slang_kleur">Slang Kleur</Label>
                    <Select 
                      value={newKoppeling.slang_kleur || 'rood'} 
                      onValueChange={(value) => setNewKoppeling({...newKoppeling, slang_kleur: value})}
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
                    <Label htmlFor="ventiel_id">Ventiel</Label>
                    <Select 
                      value={newKoppeling.ventiel_id || ''} 
                      onValueChange={(value) => setNewKoppeling({...newKoppeling, ventiel_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer ventiel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ventielen.map((ventiel) => (
                          <SelectItem key={ventiel.id} value={ventiel.id}>
                            {ventiel.ventiel_nummer} - {ventiel.functie_naam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="poort">Poort</Label>
                    <Select 
                      value={newKoppeling.poort || 'A'} 
                      onValueChange={(value: 'A' | 'B' | 'P' | 'T') => setNewKoppeling({...newKoppeling, poort: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Poort A</SelectItem>
                        <SelectItem value="B">Poort B</SelectItem>
                        <SelectItem value="P">Poort P (Druk)</SelectItem>
                        <SelectItem value="T">Poort T (Tank)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="connection_type">Verbindingssoort</Label>
                    <Select 
                      value={newKoppeling.connection_type || 'single_acting'} 
                      onValueChange={(value: 'single_acting' | 'double_acting' | 'high_flow' | 'low_flow') => 
                        setNewKoppeling({...newKoppeling, connection_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_acting">Enkelwerkend</SelectItem>
                        <SelectItem value="double_acting">Dubbelwerkend</SelectItem>
                        <SelectItem value="high_flow">Hoge Doorstroming</SelectItem>
                        <SelectItem value="low_flow">Lage Doorstroming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="pressure_rating">Druk Rating (bar)</Label>
                    <Input
                      id="pressure_rating"
                      type="number"
                      min="0"
                      max="350"
                      value={newKoppeling.pressure_rating || 250}
                      onChange={(e) => setNewKoppeling({...newKoppeling, pressure_rating: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="flow_rating">Debiet Rating (l/min)</Label>
                    <Input
                      id="flow_rating"
                      type="number"
                      min="0"
                      max="200"
                      value={newKoppeling.flow_rating || 40}
                      onChange={(e) => setNewKoppeling({...newKoppeling, flow_rating: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="functie_beschrijving">Functie</Label>
                    <Input
                      id="functie_beschrijving"
                      value={newKoppeling.functie_beschrijving || ''}
                      onChange={(e) => setNewKoppeling({...newKoppeling, functie_beschrijving: e.target.value})}
                      placeholder="omhoog, omlaag, open, dicht"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="instructie_tekst">Instructie Tekst</Label>
                    <Textarea
                      id="instructie_tekst"
                      value={newKoppeling.instructie_tekst || ''}
                      onChange={(e) => setNewKoppeling({...newKoppeling, instructie_tekst: e.target.value})}
                      placeholder="Gedetailleerde instructie voor de gebruiker..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={addNewKoppeling}>
                    Slangkoppeling Toevoegen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Attachment Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cable className="w-5 h-5" />
              Selecteer Aanbouwdeel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedAttachment || 'none'} 
              onValueChange={(value) => setSelectedAttachment(value === 'none' ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecteer een aanbouwdeel om slangkoppelingen te configureren..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Algemene machine configuratie</SelectItem>
                {attachments.map((attachment) => (
                  <SelectItem key={attachment.id} value={attachment.id}>
                    {attachment.naam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAttachment && (
              <p className="text-sm text-gray-600 mt-2">
                Configureer slangkoppelingen voor: {attachments.find(a => a.id === selectedAttachment)?.naam || 'Algemeen'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Slangkoppelingen */}
        {selectedAttachment !== null && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slangkoppelingen.map((koppeling) => {
              const ventielInfo = getVentielInfo(koppeling.ventiel_id);
              return (
                <Card key={koppeling.id} className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${SLANG_KLEUREN.find(k => k.value === koppeling.slang_kleur)?.color}`}></div>
                      <CardTitle className="text-lg">
                        {koppeling.slang_label}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {koppeling.connection_type === 'single_acting' ? 'Enkelwerkend' :
                         koppeling.connection_type === 'double_acting' ? 'Dubbelwerkend' :
                         koppeling.connection_type === 'high_flow' ? 'Hoge Doorstroming' :
                         'Lage Doorstroming'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(koppeling)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteKoppeling(koppeling.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Slang Nummer</Label>
                        <p className="text-sm font-medium">{koppeling.slang_nummer}</p>
                      </div>
                      <div>
                        <Label>Slang Kleur</Label>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${SLANG_KLEUREN.find(k => k.value === koppeling.slang_kleur)?.color}`}></div>
                          <p className="text-sm font-medium capitalize">{koppeling.slang_kleur}</p>
                        </div>
                      </div>
                      <div>
                        <Label>Ventiel</Label>
                        <p className="text-sm font-medium">
                          {ventielInfo ? `${ventielInfo.ventiel_nummer} - ${ventielInfo.functie_naam}` : 'Geen ventiel'}
                        </p>
                      </div>
                      <div>
                        <Label>Poort</Label>
                        <p className="text-sm font-medium">{koppeling.poort}</p>
                      </div>
                      <div>
                        <Label>Druk Rating</Label>
                        <p className="text-sm font-medium">{koppeling.pressure_rating} bar</p>
                      </div>
                      <div>
                        <Label>Debiet Rating</Label>
                        <p className="text-sm font-medium">{koppeling.flow_rating} l/min</p>
                      </div>
                    </div>
                    <div>
                      <Label>Functie</Label>
                      <p className="text-sm text-gray-600">{koppeling.functie_beschrijving}</p>
                    </div>
                    {koppeling.instructie_tekst && (
                      <div>
                        <Label>Instructie</Label>
                        <p className="text-sm text-gray-600">{koppeling.instructie_tekst}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedAttachment !== null && slangkoppelingen.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nog geen slangkoppelingen geconfigureerd.</p>
            <p className="text-sm text-gray-400 mt-2">Voeg de eerste slangkoppeling toe om te beginnen.</p>
          </div>
        )}

        {selectedAttachment === null && (
          <div className="text-center py-12">
            <p className="text-gray-500">Selecteer een aanbouwdeel om slangkoppelingen te configureren.</p>
          </div>
        )}
      </div>
    </div>
  );
} 