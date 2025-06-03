'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Machine {
  id: string;
  naam: string;
  type: string;
  hydraulische_inputs?: number;
  aansluiting_type?: string;
  layout_beschrijving?: string;
}

interface Ventiel {
  id: string;
  machine_id: string;
  ventiel_nummer: string;
  functie_naam: string;
  positie: 'voor' | 'achter';
  ventiel_type: 'enkel' | 'dubbelwerkend' | 'powerBeyond';
  omschrijving?: string;
  kleur_code?: string;
  poort_a_label: string;
  poort_b_label: string;
  volgorde: number;
  actief: boolean;
}

const KLEUREN = [
  { value: 'rood', label: 'Rood', color: 'bg-red-500' },
  { value: 'geel', label: 'Geel', color: 'bg-yellow-500' },
  { value: 'blauw', label: 'Blauw', color: 'bg-blue-500' },
  { value: 'groen', label: 'Groen', color: 'bg-green-500' },
  { value: 'oranje', label: 'Oranje', color: 'bg-orange-500' },
  { value: 'paars', label: 'Paars', color: 'bg-purple-500' },
  { value: 'zwart', label: 'Zwart', color: 'bg-black' },
  { value: 'wit', label: 'Wit', color: 'bg-white border' }
];

interface VentielenConfigProps {
  machineId: string;
}

export default function VentielenConfig({ machineId }: VentielenConfigProps) {
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [ventielen, setVentielen] = useState<Ventiel[]>([]);
  const [editingVentiel, setEditingVentiel] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ventiel>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newVentiel, setNewVentiel] = useState<Partial<Ventiel>>({
    ventiel_nummer: '',
    functie_naam: '',
    positie: 'achter',
    ventiel_type: 'dubbelwerkend',
    omschrijving: '',
    kleur_code: 'rood',
    poort_a_label: 'A',
    poort_b_label: 'B',
    volgorde: 1,
    actief: true
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAdminAndFetchData();
  }, [machineId]);

  useEffect(() => {
    if (addDialogOpen) {
      const maxVolgorde = Math.max(0, ...ventielen.map(v => v.volgorde || 0));
      setNewVentiel(v => ({ ...v, volgorde: maxVolgorde + 1 }));
    }
  }, [addDialogOpen, ventielen]);

  const checkAdminAndFetchData = async () => {
    try {
      console.log('🔍 Admin ventielen: Starting auth check...');
      
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        console.log('🎉 Admin ventielen: URL verification found! Proceeding...');
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
        .select('id, naam, type, hydraulische_inputs, aansluiting_type, layout_beschrijving')
        .eq('id', machineId)
        .single();

      if (machineError) {
        toast.error('Fout bij ophalen machine: ' + machineError.message);
        return;
      }

      setMachine(machineData);

      // Fetch ventielen for this machine via API
      const ventielenResponse = await fetch(`/api/machine-ventielen?machineId=${machineId}`);
      if (ventielenResponse.ok) {
        const ventielenData = await ventielenResponse.json();
        setVentielen(ventielenData || []);
      } else {
        console.error('Error fetching ventielen:', await ventielenResponse.text());
        setVentielen([]);
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (ventiel: Ventiel) => {
    setEditingVentiel(ventiel.id);
    setEditForm(ventiel);
  };

  const cancelEditing = () => {
    setEditingVentiel(null);
    setEditForm({});
  };

  const saveVentiel = async () => {
    if (!editingVentiel) return;

    try {
      const response = await fetch('/api/machine-ventielen', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: editingVentiel, ...editForm }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij opslaan: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Ventiel succesvol bijgewerkt!');
      setEditingVentiel(null);
      setEditForm({});
      checkAdminAndFetchData();
    } catch (error) {
      console.error('Error saving ventiel:', error);
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const addNewVentiel = async () => {
    try {
      const ventielData = {
        ...newVentiel,
        machine_id: machineId
      };

      const response = await fetch('/api/machine-ventielen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ventielData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij toevoegen ventiel: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Ventiel succesvol toegevoegd!');
      setAddDialogOpen(false);
      setNewVentiel({
        ventiel_nummer: '',
        functie_naam: '',
        positie: 'achter',
        ventiel_type: 'dubbelwerkend',
        omschrijving: '',
        kleur_code: 'rood',
        poort_a_label: 'A',
        poort_b_label: 'B',
        volgorde: 1,
        actief: true
      });
      checkAdminAndFetchData();
    } catch (error) {
      console.error('Error adding ventiel:', error);
      toast.error('Er is een fout opgetreden bij het toevoegen');
    }
  };

  const deleteVentiel = async (ventielId: string) => {
    if (!confirm('Weet je zeker dat je dit ventiel wilt verwijderen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/machine-ventielen?id=${ventielId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Fout bij verwijderen: ' + (data.error || 'Unknown error'));
        return;
      }

      toast.success('Ventiel succesvol verwijderd!');
      checkAdminAndFetchData();
    } catch (error) {
      console.error('Error deleting ventiel:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const getKleurBadge = (kleurCode?: string) => {
    const kleur = KLEUREN.find(k => k.value === kleurCode);
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
              <h1 className="text-3xl font-bold text-gray-900">Ventielen Configuratie</h1>
              <p className="text-gray-600">{machine.naam} ({machine.type})</p>
            </div>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nieuw Ventiel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nieuw Ventiel Toevoegen</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="ventiel_nummer">Ventiel Nummer</Label>
                  <Input
                    id="ventiel_nummer"
                    value={newVentiel.ventiel_nummer || ''}
                    onChange={(e) => setNewVentiel({...newVentiel, ventiel_nummer: e.target.value})}
                    placeholder="V1, V2, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="functie_naam">Functie Naam</Label>
                  <Input
                    id="functie_naam"
                    value={newVentiel.functie_naam || ''}
                    onChange={(e) => setNewVentiel({...newVentiel, functie_naam: e.target.value})}
                    placeholder="Hefarm werktuig, Grijper, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="positie">Positie</Label>
                  <Select 
                    value={newVentiel.positie || 'achter'} 
                    onValueChange={(value: 'voor' | 'achter') => setNewVentiel({...newVentiel, positie: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achter">Achterzijde</SelectItem>
                      <SelectItem value="voor">Voorzijde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ventiel_type">Ventiel Type</Label>
                  <Select 
                    value={newVentiel.ventiel_type || 'dubbelwerkend'} 
                    onValueChange={(value: 'enkel' | 'dubbelwerkend' | 'powerBeyond') => setNewVentiel({...newVentiel, ventiel_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enkel">Enkelwerkend</SelectItem>
                      <SelectItem value="dubbelwerkend">Dubbelwerkend</SelectItem>
                      <SelectItem value="powerBeyond">Power Beyond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kleur_code">Kleur</Label>
                  <Select 
                    value={newVentiel.kleur_code || 'rood'} 
                    onValueChange={(value) => setNewVentiel({...newVentiel, kleur_code: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KLEUREN.map((kleur) => (
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
                  <Label htmlFor="volgorde">Volgorde</Label>
                  <Input
                    id="volgorde"
                    type="number"
                    min="1"
                    value={newVentiel.volgorde || 1}
                    onChange={(e) => setNewVentiel({...newVentiel, volgorde: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="poort_a_label">Poort A Label</Label>
                  <Input
                    id="poort_a_label"
                    value={newVentiel.poort_a_label || 'A'}
                    onChange={(e) => setNewVentiel({...newVentiel, poort_a_label: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="poort_b_label">Poort B Label</Label>
                  <Input
                    id="poort_b_label"
                    value={newVentiel.poort_b_label || 'B'}
                    onChange={(e) => setNewVentiel({...newVentiel, poort_b_label: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="omschrijving">Omschrijving</Label>
                  <Textarea
                    id="omschrijving"
                    value={newVentiel.omschrijving || ''}
                    onChange={(e) => setNewVentiel({...newVentiel, omschrijving: e.target.value})}
                    placeholder="Beschrijving van de ventiel functie..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={addNewVentiel}>
                  Ventiel Toevoegen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Machine Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Machine Informatie</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Hydraulische Inputs</p>
              <p>{machine.hydraulische_inputs || 'Niet ingesteld'}</p>
            </div>
            <div>
              <p className="font-medium">Aansluiting Type</p>
              <p>{machine.aansluiting_type || 'Niet ingesteld'}</p>
            </div>
            <div className="col-span-2">
              <p className="font-medium">Layout Beschrijving</p>
              <p>{machine.layout_beschrijving || 'Niet ingesteld'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Ventielen Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ventielen.map((ventiel) => (
            <Card key={ventiel.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingVentiel === ventiel.id ? (
                      <Input
                        value={editForm.ventiel_nummer || ''}
                        onChange={(e) => setEditForm({...editForm, ventiel_nummer: e.target.value})}
                        className="w-20"
                      />
                    ) : (
                      <Badge variant="outline">{ventiel.ventiel_nummer}</Badge>
                    )}
                    {getKleurBadge(ventiel.kleur_code)}
                  </div>
                  <div className="flex gap-2">
                    {editingVentiel === ventiel.id ? (
                      <>
                        <Button size="sm" onClick={saveVentiel}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEditing(ventiel)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteVentiel(ventiel.id)}
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
                  <Label>Functie</Label>
                  {editingVentiel === ventiel.id ? (
                    <Input
                      value={editForm.functie_naam || ''}
                      onChange={(e) => setEditForm({...editForm, functie_naam: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-medium">{ventiel.functie_naam}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Positie</p>
                    <p className="capitalize">{ventiel.positie}</p>
                  </div>
                  <div>
                    <p className="font-medium">Type</p>
                    <p className="capitalize">{ventiel.ventiel_type.replace('dubbelwerkend', 'Dubbelwerkend')}</p>
                  </div>
                  <div>
                    <p className="font-medium">Poorten</p>
                    <p>{ventiel.poort_a_label} / {ventiel.poort_b_label}</p>
                  </div>
                  <div>
                    <p className="font-medium">Volgorde</p>
                    <p>#{ventiel.volgorde}</p>
                  </div>
                </div>

                {ventiel.omschrijving && (
                  <div>
                    <Label>Omschrijving</Label>
                    <p className="text-sm text-gray-600">{ventiel.omschrijving}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {ventielen.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nog geen ventielen geconfigureerd.</p>
            <p className="text-sm text-gray-400 mt-2">Voeg het eerste ventiel toe om te beginnen.</p>
          </div>
        )}
      </div>
    </div>
  );
} 