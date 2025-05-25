'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Save, X, Plus, Settings, Cable, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Machine {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  gewicht: number;
  werkdruk: number;
  max_druk: number;
  debiet: number;
  vermogen: number;
  kenteken?: string;
  hydraulische_inputs?: number;
  afbeelding?: string;
  aansluiting_type?: string;
  layout_beschrijving?: string;
  ventiel_layout?: {
    achter: string[];
    voor: string[];
  };
  hydraulic_inputs?: HydraulicInput[];
}

interface HydraulicInput {
  id: string;
  machine_id: string;
  input_nummer: number;
  input_kleur: string;
  input_label?: string;
  functie_beschrijving?: string;
  volgorde: number;
  druk_rating?: number;
  debiet_rating?: number;
}

const HYDRAULIC_KLEUREN = [
  { value: 'rood', label: 'Rood', color: 'bg-red-500', textColor: 'text-white', description: 'Hoofdfunctie/Heffen' },
  { value: 'blauw', label: 'Blauw', color: 'bg-blue-500', textColor: 'text-white', description: 'Hulpfunctie/Kantelen' },
  { value: 'geel', label: 'Geel', color: 'bg-yellow-400', textColor: 'text-black', description: 'Extra functie' },
  { value: 'groen', label: 'Groen', color: 'bg-green-500', textColor: 'text-white', description: 'Optionele functie' },
  { value: 'zwart', label: 'Zwart', color: 'bg-black', textColor: 'text-white', description: 'Retour/Tank' },
  { value: 'wit', label: 'Wit', color: 'bg-white border-2 border-gray-300', textColor: 'text-black', description: 'Neutraal' },
  { value: 'oranje', label: 'Oranje', color: 'bg-orange-500', textColor: 'text-white', description: 'Waarschuwing' },
  { value: 'paars', label: 'Paars', color: 'bg-purple-500', textColor: 'text-white', description: 'Speciale functie' }
];

export default function MachinesAdmin() {
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Machine>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newMachine, setNewMachine] = useState<Partial<Machine>>({
    naam: '',
    beschrijving: '',
    type: '',
    gewicht: 0,
    werkdruk: 0,
    max_druk: 0,
    debiet: 0,
    vermogen: 0,
    kenteken: '',
    hydraulische_inputs: 2,
    aansluiting_type: 'ISO A/B',
    layout_beschrijving: 'Standaard layout'
  });
  const [newHydraulicInput, setNewHydraulicInput] = useState<Partial<HydraulicInput>>({
    input_nummer: 1,
    input_kleur: 'rood',
    input_label: '',
    functie_beschrijving: '',
    volgorde: 1,
    druk_rating: 200,
    debiet_rating: 50
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAdminAndFetchMachines();
  }, []);

  const checkAdminAndFetchMachines = async () => {
    try {
      console.log('🔍 Admin machines: Starting auth check...');
      
      // Check for URL verification parameters first
      const verified = searchParams.get('verified');
      const emailParam = searchParams.get('email');
      
      if (verified === 'true' && emailParam) {
        console.log('🎉 Admin machines: URL verification found! Proceeding...');
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

      await fetchMachinesWithInputs();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const fetchMachinesWithInputs = async () => {
    // Fetch machines
    const { data: machinesData, error: machinesError } = await supabase
      .from('machines')
      .select('*')
      .order('naam', { ascending: true });

    if (machinesError) {
      toast.error('Fout bij ophalen machines: ' + machinesError.message);
      return;
    }

    // For each machine, fetch hydraulic inputs
    const enrichedMachines = await Promise.all(
      (machinesData || []).map(async (machine) => {
        const { data: hydraulicInputs } = await supabase
          .from('machine_hydraulic_inputs')
          .select('*')
          .eq('machine_id', machine.id)
          .order('volgorde', { ascending: true });

        return {
          ...machine,
          hydraulic_inputs: hydraulicInputs || []
        };
      })
    );

    setMachines(enrichedMachines);
  };

  const getKleurDisplay = (kleur: string, showDescription = false) => {
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
        <div>
          <span className="text-sm font-medium capitalize">{kleurInfo.label}</span>
          {showDescription && (
            <p className="text-xs text-gray-500">{kleurInfo.description}</p>
          )}
        </div>
      </div>
    );
  };

  const addHydraulicInput = async (machineId: string) => {
    try {
      const inputData = {
        ...newHydraulicInput,
        machine_id: machineId
      };

      const { error } = await supabase
        .from('machine_hydraulic_inputs')
        .insert([inputData]);

      if (error) {
        toast.error('Fout bij toevoegen hydraulische input: ' + error.message);
        return;
      }

      toast.success('Hydraulische input succesvol toegevoegd!');
      setNewHydraulicInput({
        input_nummer: 1,
        input_kleur: 'rood',
        input_label: '',
        functie_beschrijving: '',
        volgorde: 1,
        druk_rating: 200,
        debiet_rating: 50
      });
      fetchMachinesWithInputs();
    } catch (error) {
      console.error('Error adding hydraulic input:', error);
      toast.error('Er is een fout opgetreden bij het toevoegen');
    }
  };

  const deleteHydraulicInput = async (inputId: string) => {
    if (!confirm('Weet je zeker dat je deze hydraulische input wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('machine_hydraulic_inputs')
        .delete()
        .eq('id', inputId);

      if (error) {
        toast.error('Fout bij verwijderen input: ' + error.message);
        return;
      }

      toast.success('Hydraulische input succesvol verwijderd!');
      fetchMachinesWithInputs();
    } catch (error) {
      console.error('Error deleting hydraulic input:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const startEditing = (machine: Machine) => {
    setEditingMachine(machine.id);
    setEditForm(machine);
  };

  const cancelEditing = () => {
    setEditingMachine(null);
    setEditForm({});
  };

  const saveMachine = async () => {
    if (!editingMachine) return;

    try {
      // Only update fields that exist in the machines table
      const machineData = {
        naam: editForm.naam,
        beschrijving: editForm.beschrijving,
        type: editForm.type,
        gewicht: editForm.gewicht,
        werkdruk: editForm.werkdruk,
        max_druk: editForm.max_druk,
        debiet: editForm.debiet,
        vermogen: editForm.vermogen,
        kenteken: editForm.kenteken,
        hydraulische_inputs: editForm.hydraulische_inputs,
        afbeelding: editForm.afbeelding,
        aansluiting_type: editForm.aansluiting_type,
        layout_beschrijving: editForm.layout_beschrijving
      };
      
      const { error } = await supabase
        .from('machines')
        .update(machineData)
        .eq('id', editingMachine);

      if (error) {
        toast.error('Fout bij opslaan: ' + error.message);
        return;
      }

      toast.success('Machine succesvol bijgewerkt!');
      setEditingMachine(null);
      setEditForm({});
      fetchMachinesWithInputs();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const addNewMachine = async () => {
    try {
      const { data: machineData, error } = await supabase
        .from('machines')
        .insert([newMachine])
        .select()
        .single();

      if (error) {
        toast.error('Fout bij toevoegen machine: ' + error.message);
        return;
      }

      // Create default hydraulic inputs based on hydraulische_inputs count
      const inputCount = newMachine.hydraulische_inputs || 2;
      const defaultInputs = [];
      
      for (let i = 1; i <= inputCount; i++) {
        const kleur = i === 1 ? 'rood' : i === 2 ? 'blauw' : i === 3 ? 'geel' : 'groen';
        const functie = i === 1 ? 'Hoofdfunctie' : i === 2 ? 'Hulpfunctie' : `Extra functie ${i}`;
        
        defaultInputs.push({
          machine_id: machineData.id,
          input_nummer: i,
          input_kleur: kleur,
          input_label: `Input ${i}`,
          functie_beschrijving: functie,
          volgorde: i,
          druk_rating: 200,
          debiet_rating: 50
        });
      }

      if (defaultInputs.length > 0) {
        await supabase
          .from('machine_hydraulic_inputs')
          .insert(defaultInputs);
      }

      toast.success('Machine succesvol toegevoegd!');
      setAddDialogOpen(false);
      setNewMachine({
        naam: '',
        beschrijving: '',
        type: '',
        gewicht: 0,
        werkdruk: 0,
        max_druk: 0,
        debiet: 0,
        vermogen: 0,
        kenteken: '',
        hydraulische_inputs: 2,
        aansluiting_type: 'ISO A/B',
        layout_beschrijving: 'Standaard layout'
      });
      fetchMachinesWithInputs();
    } catch (error) {
      console.error('Error adding machine:', error);
      toast.error('Er is een fout opgetreden bij het toevoegen');
    }
  };

  const deleteMachine = async (machineId: string) => {
    if (!confirm('Weet je zeker dat je deze machine wilt verwijderen?')) {
      return;
    }

    try {
      // Delete related data first
      await supabase.from('machine_hydraulic_inputs').delete().eq('machine_id', machineId);
      await supabase.from('attachment_machines').delete().eq('machine_id', machineId);
      
      // Then delete the machine
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machineId);

      if (error) {
        toast.error('Fout bij verwijderen: ' + error.message);
        return;
      }

      toast.success('Machine succesvol verwijderd!');
      fetchMachinesWithInputs();
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast.error('Er is een fout opgetreden bij het verwijderen');
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
            <h1 className="text-3xl font-bold text-gray-900">Machines Beheren</h1>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nieuwe Machine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Machine Toevoegen</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="naam">Naam</Label>
                  <Input
                    id="naam"
                    value={newMachine.naam || ''}
                    onChange={(e) => setNewMachine({...newMachine, naam: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    value={newMachine.type || ''}
                    onChange={(e) => setNewMachine({...newMachine, type: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="kenteken">Kenteken</Label>
                  <Input
                    id="kenteken"
                    value={newMachine.kenteken || ''}
                    onChange={(e) => setNewMachine({...newMachine, kenteken: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="hydraulische_inputs">Hydraulische Inputs</Label>
                  <Select 
                    value={newMachine.hydraulische_inputs?.toString() || '2'} 
                    onValueChange={(value) => setNewMachine({...newMachine, hydraulische_inputs: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Input</SelectItem>
                      <SelectItem value="2">2 Inputs</SelectItem>
                      <SelectItem value="3">3 Inputs</SelectItem>
                      <SelectItem value="4">4 Inputs</SelectItem>
                      <SelectItem value="6">6 Inputs</SelectItem>
                      <SelectItem value="8">8 Inputs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Visual Preview of Hydraulic Inputs */}
                <div className="col-span-2">
                  <Label>Visuele Preview - Hydraulische Inputs</Label>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600 mb-3">
                      Preview van {newMachine.hydraulische_inputs || 2} hydraulische input(s):
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: newMachine.hydraulische_inputs || 2 }, (_, index) => {
                        const inputNum = index + 1;
                        const kleur = inputNum === 1 ? 'rood' : inputNum === 2 ? 'blauw' : 
                                     inputNum === 3 ? 'geel' : inputNum === 4 ? 'groen' :
                                     inputNum === 5 ? 'oranje' : inputNum === 6 ? 'paars' :
                                     inputNum === 7 ? 'zwart' : 'wit';
                        const kleurInfo = HYDRAULIC_KLEUREN.find(k => k.value === kleur);
                        const functie = inputNum === 1 ? 'Hoofdfunctie' : inputNum === 2 ? 'Hulpfunctie' : `Extra functie ${inputNum}`;
                        
                        return (
                          <div key={inputNum} className="flex flex-col items-center p-3 bg-white rounded-lg border">
                            <div className={`w-12 h-12 rounded-full ${kleurInfo?.color} flex items-center justify-center shadow-lg mb-2`}>
                              <span className={`text-sm font-bold ${kleurInfo?.textColor}`}>
                                {inputNum}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-center">Input {inputNum}</span>
                            <span className="text-xs text-gray-500 text-center capitalize">{kleur}</span>
                            <span className="text-xs text-gray-400 text-center">{functie}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      💡 Deze inputs worden automatisch aangemaakt met standaard kleuren en functies
                    </p>
                  </div>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="beschrijving">Beschrijving</Label>
                  <Textarea
                    id="beschrijving"
                    value={newMachine.beschrijving || ''}
                    onChange={(e) => setNewMachine({...newMachine, beschrijving: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="gewicht">Gewicht (kg)</Label>
                  <Input
                    id="gewicht"
                    type="number"
                    value={newMachine.gewicht || 0}
                    onChange={(e) => setNewMachine({...newMachine, gewicht: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="werkdruk">Werkdruk (bar)</Label>
                  <Input
                    id="werkdruk"
                    type="number"
                    value={newMachine.werkdruk || 0}
                    onChange={(e) => setNewMachine({...newMachine, werkdruk: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="max_druk">Max Druk (bar)</Label>
                  <Input
                    id="max_druk"
                    type="number"
                    value={newMachine.max_druk || 0}
                    onChange={(e) => setNewMachine({...newMachine, max_druk: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="debiet">Debiet (l/min)</Label>
                  <Input
                    id="debiet"
                    type="number"
                    value={newMachine.debiet || 0}
                    onChange={(e) => setNewMachine({...newMachine, debiet: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="vermogen">Vermogen (kW)</Label>
                  <Input
                    id="vermogen"
                    type="number"
                    value={newMachine.vermogen || 0}
                    onChange={(e) => setNewMachine({...newMachine, vermogen: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="aansluiting_type">Aansluiting Type</Label>
                  <Select 
                    value={newMachine.aansluiting_type || 'ISO A/B'} 
                    onValueChange={(value) => setNewMachine({...newMachine, aansluiting_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ISO A/B">ISO A/B</SelectItem>
                      <SelectItem value="SAE J1926">SAE J1926</SelectItem>
                      <SelectItem value="BSP">BSP</SelectItem>
                      <SelectItem value="Metric">Metric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={addNewMachine}>
                  Machine Toevoegen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Card key={machine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {editingMachine === machine.id ? (
                    <Input
                      value={editForm.naam || ''}
                      onChange={(e) => setEditForm({...editForm, naam: e.target.value})}
                      className="mr-2"
                    />
                  ) : (
                    <span className="truncate">{machine.naam}</span>
                  )}
                  <div className="flex gap-2">
                    {editingMachine === machine.id ? (
                      <>
                        <Button size="sm" onClick={saveMachine}>
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEditing(machine)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteMachine(machine.id)}
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
                  <Label>Type & Kenteken</Label>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{machine.type}</Badge>
                    {machine.kenteken && <Badge variant="outline">{machine.kenteken}</Badge>}
                  </div>
                </div>

                {/* Hydraulische Inputs Configuratie */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Hydraulische Inputs ({machine.hydraulische_inputs || 2})</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-1" />
                          Configureren
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Hydraulische Inputs voor {machine.naam}</DialogTitle>
                        </DialogHeader>
                        
                        {/* Existing Inputs */}
                        <div className="space-y-3">
                          {machine.hydraulic_inputs?.map((input) => (
                            <div key={input.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                              <div className="flex items-center gap-4">
                                {getKleurDisplay(input.input_kleur, true)}
                                <div>
                                  <p className="font-medium">Input {input.input_nummer}</p>
                                  <p className="text-sm text-gray-600">{input.input_label}</p>
                                  <p className="text-xs text-gray-500">{input.functie_beschrijving}</p>
                                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                    <span>Druk: {input.druk_rating} bar</span>
                                    <span>Debiet: {input.debiet_rating} l/min</span>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteHydraulicInput(input.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Add New Input */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Nieuwe Hydraulische Input Toevoegen</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Input Nummer</Label>
                              <Input
                                type="number"
                                min="1"
                                value={newHydraulicInput.input_nummer || 1}
                                onChange={(e) => setNewHydraulicInput({...newHydraulicInput, input_nummer: parseInt(e.target.value)})}
                              />
                            </div>
                            <div>
                              <Label>Kleur</Label>
                              <Select 
                                value={newHydraulicInput.input_kleur || 'rood'} 
                                onValueChange={(value) => setNewHydraulicInput({...newHydraulicInput, input_kleur: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {HYDRAULIC_KLEUREN.map((kleur) => (
                                    <SelectItem key={kleur.value} value={kleur.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full ${kleur.color}`}></div>
                                        <div>
                                          <span>{kleur.label}</span>
                                          <p className="text-xs text-gray-500">{kleur.description}</p>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Label</Label>
                              <Input
                                value={newHydraulicInput.input_label || ''}
                                onChange={(e) => setNewHydraulicInput({...newHydraulicInput, input_label: e.target.value})}
                                placeholder="bijv. Input 1, Hoofdfunctie"
                              />
                            </div>
                            <div>
                              <Label>Volgorde</Label>
                              <Input
                                type="number"
                                min="1"
                                value={newHydraulicInput.volgorde || 1}
                                onChange={(e) => setNewHydraulicInput({...newHydraulicInput, volgorde: parseInt(e.target.value)})}
                              />
                            </div>
                            <div>
                              <Label>Druk Rating (bar)</Label>
                              <Input
                                type="number"
                                value={newHydraulicInput.druk_rating || 200}
                                onChange={(e) => setNewHydraulicInput({...newHydraulicInput, druk_rating: parseInt(e.target.value)})}
                              />
                            </div>
                            <div>
                              <Label>Debiet Rating (l/min)</Label>
                              <Input
                                type="number"
                                value={newHydraulicInput.debiet_rating || 50}
                                onChange={(e) => setNewHydraulicInput({...newHydraulicInput, debiet_rating: parseInt(e.target.value)})}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label>Functie Beschrijving</Label>
                              <Input
                                value={newHydraulicInput.functie_beschrijving || ''}
                                onChange={(e) => setNewHydraulicInput({...newHydraulicInput, functie_beschrijving: e.target.value})}
                                placeholder="Beschrijving van de functie"
                              />
                            </div>
                          </div>
                          <Button 
                            className="mt-3"
                            onClick={() => addHydraulicInput(machine.id)}
                          >
                            Input Toevoegen
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Visual display of hydraulic inputs */}
                  <div className="mt-2">
                    {machine.hydraulic_inputs && machine.hydraulic_inputs.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {machine.hydraulic_inputs.map((input) => (
                            <div key={input.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                              {getKleurDisplay(input.input_kleur)}
                              <div className="flex-1">
                                <span className="text-sm font-semibold">#{input.input_nummer}</span>
                                <p className="text-xs text-gray-600">{input.input_label}</p>
                                <p className="text-xs text-gray-500">{input.functie_beschrijving}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Quick visual overview */}
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                          <span className="text-xs font-medium text-gray-700">Quick view:</span>
                          <div className="flex gap-1">
                            {machine.hydraulic_inputs.map((input) => {
                              const kleurInfo = HYDRAULIC_KLEUREN.find(k => k.value === input.input_kleur);
                              return (
                                <div key={input.id} 
                                     className={`w-6 h-6 rounded-full ${kleurInfo?.color} flex items-center justify-center border-2 border-white shadow-sm`}
                                     title={`Input ${input.input_nummer} - ${input.input_kleur} - ${input.functie_beschrijving}`}>
                                  <span className={`text-xs font-bold ${kleurInfo?.textColor}`}>
                                    {input.input_nummer}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">⚠️ Geen hydraulische inputs geconfigureerd</p>
                        <p className="text-xs text-yellow-600">Klik op &apos;Configureren&apos; om inputs toe te voegen</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Gewicht</p>
                    <p>{machine.gewicht} kg</p>
                  </div>
                  <div>
                    <p className="font-medium">Werkdruk</p>
                    <p>{machine.werkdruk} bar</p>
                  </div>
                  <div>
                    <p className="font-medium">Max druk</p>
                    <p>{machine.max_druk} bar</p>
                  </div>
                  <div>
                    <p className="font-medium">Debiet</p>
                    <p>{machine.debiet} l/min</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const verified = searchParams.get('verified') || 'true';
                      const email = searchParams.get('email') || 'admin@example.com';
                      router.push(`/admin/machines/${machine.id}/ventielen?verified=${verified}&email=${encodeURIComponent(email)}`);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Ventielen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const verified = searchParams.get('verified') || 'true';
                      const email = searchParams.get('email') || 'admin@example.com';
                      router.push(`/admin/machines/${machine.id}/slangen?verified=${verified}&email=${encodeURIComponent(email)}`);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Cable className="w-4 h-4" />
                    Slangen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {machines.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nog geen machines toegevoegd.</p>
            <p className="text-sm text-gray-400 mt-2">Voeg de eerste machine toe om te beginnen.</p>
          </div>
        )}
      </div>
    </div>
  );
} 