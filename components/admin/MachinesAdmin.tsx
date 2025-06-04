'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, X, Plus, Trash2, Upload, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import qrcode from 'qrcode-generator';

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
  imageFile?: File;
}

interface HydraulicInput {
  id: string;
  machine_id: string;
  input_nummer: number;
  kleur: string;
  volgorde: number;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentQrMachine, setCurrentQrMachine] = useState<Machine | null>(null);
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
    layout_beschrijving: 'Standaard layout'
  });
  const [newHydraulicInput, setNewHydraulicInput] = useState<Partial<HydraulicInput>>({
    input_nummer: 1,
    kleur: 'rood',
    volgorde: 1
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const generateQRCodeImage = (machine: Machine): string => {
    try {
      // Generate machine info JSON for QR code
      const machineInfo = {
        id: machine.id,
        naam: machine.naam,
        type: machine.type,
        kenteken: machine.kenteken,
        gewicht: machine.gewicht,
        werkdruk: machine.werkdruk,
        max_druk: machine.max_druk,
        debiet: machine.debiet,
        vermogen: machine.vermogen,
        hydraulic_inputs: machine.hydraulic_inputs?.map(input => ({
          input_nummer: input.input_nummer,
          kleur: input.kleur
        })) || []
      };

      // Create QR code instance
      const qr = qrcode(0, 'M');
      qr.addData(JSON.stringify(machineInfo));
      qr.make();

      // Create canvas and draw QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Canvas niet ondersteund');
        return '';
      }

      const moduleCount = qr.getModuleCount();
      const tileW = 8;
      const tileH = 8;
      const margin = 16;
      
      canvas.width = (moduleCount * tileW) + (margin * 2);
      canvas.height = (moduleCount * tileH) + (margin * 2);

      // Fill background white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw QR code
      ctx.fillStyle = '#000000';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(
              (col * tileW) + margin,
              (row * tileH) + margin,
              tileW,
              tileH
            );
          }
        }
      }

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Fout bij genereren QR-code');
      return '';
    }
  };

  const showQRCode = (machine: Machine) => {
    const qrImageData = generateQRCodeImage(machine);
    if (qrImageData) {
      setQrCodeData(qrImageData);
      setCurrentQrMachine(machine);
      setQrDialogOpen(true);
    }
  };

  const downloadQRCodeFromDialog = () => {
    if (!qrCodeData || !currentQrMachine) return;

    try {
      // Convert data URL to blob
      const byteCharacters = atob(qrCodeData.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${currentQrMachine.naam.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('QR-code gedownload!');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Fout bij downloaden QR-code');
    }
  };

  const checkAdminAndFetchMachines = useCallback(async () => {
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

      await fetchMachinesWithInputs();
    } catch {
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, supabase]);

  useEffect(() => {
    checkAdminAndFetchMachines();
  }, [checkAdminAndFetchMachines]);

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
        machine_id: machineId,
        input_nummer: newHydraulicInput.input_nummer || 1,
        kleur: newHydraulicInput.kleur || 'rood',
        volgorde: newHydraulicInput.input_nummer || 1
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
        kleur: 'rood',
        volgorde: 1
      });
      fetchMachinesWithInputs();
    } catch {
      toast.error('Er is een fout opgetreden bij het toevoegen');
    }
  };

  const updateInputColor = async (inputId: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('machine_hydraulic_inputs')
        .update({ kleur: newColor })
        .eq('id', inputId);

      if (error) {
        toast.error('Fout bij wijzigen kleur: ' + error.message);
        return;
      }

      toast.success('Kleur succesvol gewijzigd!');
      fetchMachinesWithInputs();
    } catch {
      toast.error('Er is een fout opgetreden bij het wijzigen');
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
    } catch {
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const startEditing = (machine: Machine) => {
    setEditingMachine(machine.id);
    setEditForm(machine);
    setEditImagePreview(machine.afbeelding || null);
    setEditDialogOpen(true);
  };

  const cancelEditing = () => {
    setEditingMachine(null);
    setEditForm({});
    setEditDialogOpen(false);
    setEditImagePreview(null);
  };

  const handleEditImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Selecteer alleen afbeeldingen');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Afbeelding mag maximaal 5MB zijn');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Store file for upload
      setEditForm({...editForm, imageFile: file});
    }
  };

  const saveMachine = async () => {
    if (!editingMachine) return;

    try {
      // Upload new image if selected
      let imageUrl = editForm.afbeelding;
      if (editForm.imageFile) {
        toast.info('Uploading foto...');
        const uploadedUrl = await uploadImage(editForm.imageFile, editingMachine);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          toast.error('Foto upload mislukt. Machine wordt opgeslagen zonder nieuwe foto.');
          // Continue without new image
        }
      }

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
        afbeelding: imageUrl,
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
      cancelEditing();
      fetchMachinesWithInputs();
    } catch {
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const uploadImage = async (file: File, machineId: string) => {
    try {
      setUploadingImage(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${machineId}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('machine-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        toast.error('Fout bij uploaden afbeelding: ' + uploadError.message);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('machine-images')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        toast.error('Kan publieke URL niet ophalen');
        return null;
      }

      return urlData.publicUrl;
    } catch {
      toast.error('Upload mislukt');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Selecteer alleen afbeeldingen');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Afbeelding mag maximaal 5MB zijn');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Store file for upload
      setNewMachine({...newMachine, imageFile: file});
    }
  };

  const addNewMachine = async () => {
    try {
      // First create the machine
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .insert([{
          naam: newMachine.naam,
          beschrijving: newMachine.beschrijving,
          type: newMachine.type,
          gewicht: newMachine.gewicht,
          werkdruk: newMachine.werkdruk,
          max_druk: newMachine.max_druk,
          debiet: newMachine.debiet,
          vermogen: newMachine.vermogen,
          kenteken: newMachine.kenteken,
          hydraulische_inputs: newMachine.hydraulische_inputs,
          layout_beschrijving: newMachine.layout_beschrijving
        }])
        .select()
        .single();

      if (machineError) {
        toast.error('Fout bij toevoegen machine: ' + machineError.message);
        return;
      }

      // Upload image if provided
      let imageUrl = null;
      if (newMachine.imageFile) {
        imageUrl = await uploadImage(newMachine.imageFile, machineData.id);
        
        // Update machine with image URL if upload successful
        if (imageUrl) {
          await supabase
            .from('machines')
            .update({ afbeelding: imageUrl })
            .eq('id', machineData.id);
        }
      }

      // Create default hydraulic inputs
      const defaultInputs = [];
      const inputCount = newMachine.hydraulische_inputs || 2;
      for (let i = 1; i <= inputCount; i++) {
        const kleur = i === 1 ? 'rood' : i === 2 ? 'blauw' : i === 3 ? 'geel' : i === 4 ? 'groen' : 'zwart';
        defaultInputs.push({
          machine_id: machineData.id,
          input_nummer: i,
          kleur: kleur,
          volgorde: i
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
        layout_beschrijving: 'Standaard layout'
      });
      setImagePreview(null);
      fetchMachinesWithInputs();
    } catch {
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
    } catch {
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
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const verified = searchParams.get('verified') || 'true';
                const email = searchParams.get('email') || 'admin@example.com';
                router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
              }}
              className="w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Machines Beheren</h1>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Machine
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nieuwe Machine Toevoegen</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
                    inputMode="numeric"
                    value={newMachine.gewicht || ''}
                    onChange={(e) => setNewMachine({...newMachine, gewicht: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="werkdruk">Werkdruk (bar)</Label>
                  <Input
                    id="werkdruk"
                    inputMode="numeric"
                    value={newMachine.werkdruk || ''}
                    onChange={(e) => setNewMachine({...newMachine, werkdruk: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="max_druk">Max Druk (bar)</Label>
                  <Input
                    id="max_druk"
                    inputMode="numeric"
                    value={newMachine.max_druk || ''}
                    onChange={(e) => setNewMachine({...newMachine, max_druk: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="debiet">Debiet (l/min)</Label>
                  <Input
                    id="debiet"
                    inputMode="numeric"
                    value={newMachine.debiet || ''}
                    onChange={(e) => setNewMachine({...newMachine, debiet: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="vermogen">Vermogen (kW)</Label>
                  <Input
                    id="vermogen"
                    inputMode="numeric"
                    value={newMachine.vermogen || ''}
                    onChange={(e) => setNewMachine({...newMachine, vermogen: parseInt(e.target.value) || 0})}
                  />
                </div>

                {/* Image Upload Section for Edit */}
                <div className="col-span-2">
                  <Label>Foto van de Machine</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label htmlFor="machine-image" className="flex-1">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Klik om een nieuwe foto te selecteren
                            </span>
                            <span className="text-xs text-gray-400">
                              JPG, PNG (max 5MB)
                            </span>
                          </div>
                        </div>
                        <input
                          id="machine-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {imagePreview && (
                      <div className="relative">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImagePreview(null);
                            setNewMachine({...newMachine, imageFile: undefined, afbeelding: ''});
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="w-full sm:w-auto">
                  Annuleren
                </Button>
                <Button onClick={addNewMachine} className="w-full sm:w-auto">
                  Machine Toevoegen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Machines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {machines.map((machine) => (
            <Card key={machine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="truncate font-semibold">{machine.naam}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => startEditing(machine)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => showQRCode(machine)}
                      title="Toon QR-code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteMachine(machine.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {machine.afbeelding && (
                  <div className="relative aspect-video">
                    <Image
                      src={machine.afbeelding}
                      alt={machine.naam}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium">Type & Kenteken</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary">{machine.type}</Badge>
                    {machine.kenteken && <Badge variant="outline">{machine.kenteken}</Badge>}
                  </div>
                </div>

                {/* Hydraulische Inputs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Hydraulische Inputs ({machine.hydraulische_inputs || 2})
                    </Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Plus className="w-3 h-3 mr-1" />
                          Configureren
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Hydraulische Inputs voor {machine.naam}</DialogTitle>
                          <p className="text-sm text-gray-600">Configureer de kleuren voor elke input</p>
                        </DialogHeader>
                        
                        <div className="space-y-3">
                          {machine.hydraulic_inputs?.map((input) => (
                            <div key={input.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border gap-3">
                              <div className="flex items-center gap-3">
                                {getKleurDisplay(input.kleur)}
                                <p className="font-medium">Input {input.input_nummer}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={input.kleur} 
                                  onValueChange={(value) => updateInputColor(input.id, value)}
                                >
                                  <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HYDRAULIC_KLEUREN.map((kleur) => (
                                      <SelectItem key={kleur.value} value={kleur.value}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-4 h-4 rounded-full ${kleur.color}`}></div>
                                          <span>{kleur.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteHydraulicInput(input.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Add New Input */}
                          <div className="border-t pt-4 mt-4">
                            <h4 className="font-medium mb-3">Nieuwe Input Toevoegen</h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="w-full sm:w-24">
                                <Label>Nummer</Label>
                                <Input
                                  type="number"
                                  value={newHydraulicInput.input_nummer || ''}
                                  onChange={(e) => setNewHydraulicInput({
                                    ...newHydraulicInput,
                                    input_nummer: parseInt(e.target.value) || 1
                                  })}
                                  min="1"
                                />
                              </div>
                              <div className="flex-1">
                                <Label>Kleur</Label>
                                <Select 
                                  value={newHydraulicInput.kleur || 'rood'} 
                                  onValueChange={(value) => setNewHydraulicInput({
                                    ...newHydraulicInput,
                                    kleur: value
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HYDRAULIC_KLEUREN.map((kleur) => (
                                      <SelectItem key={kleur.value} value={kleur.value}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-4 h-4 rounded-full ${kleur.color}`}></div>
                                          <span>{kleur.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                onClick={() => addHydraulicInput(machine.id)}
                                className="w-full sm:w-auto sm:self-end"
                              >
                                Toevoegen
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {machine.hydraulic_inputs && machine.hydraulic_inputs.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {machine.hydraulic_inputs.map((input) => (
                          <div key={input.id} 
                               className="flex items-center gap-2 p-2 bg-white rounded-lg border shadow-sm">
                            {getKleurDisplay(input.kleur)}
                            <span className="text-sm font-medium">
                              Input {input.input_nummer}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">⚠️ Geen inputs geconfigureerd</p>
                      <p className="text-xs text-yellow-600">Klik op configureren om te beginnen</p>
                    </div>
                  )}
                </div>

                {/* Technical Specs */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Gewicht</p>
                    <p>{machine.gewicht} kg</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Werkdruk</p>
                    <p>{machine.werkdruk} bar</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Max druk</p>
                    <p>{machine.max_druk} bar</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Debiet</p>
                    <p>{machine.debiet} l/min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {machines.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nog geen machines toegevoegd</p>
            <p className="text-sm text-gray-400 mt-2">
              Klik op &apos;Nieuwe Machine&apos; om te beginnen
            </p>
          </div>
        )}

        {/* Edit Machine Dialog */}
        {editingMachine && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Machine Bewerken: {editForm.naam}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="edit-naam">Naam</Label>
                  <Input
                    id="edit-naam"
                    value={editForm.naam || ''}
                    onChange={(e) => setEditForm({...editForm, naam: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type">Type</Label>
                  <Input
                    id="edit-type"
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-kenteken">Kenteken</Label>
                  <Input
                    id="edit-kenteken"
                    value={editForm.kenteken || ''}
                    onChange={(e) => setEditForm({...editForm, kenteken: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-hydraulische_inputs">Hydraulische Inputs</Label>
                  <Select 
                    value={editForm.hydraulische_inputs?.toString() || '2'} 
                    onValueChange={(value) => setEditForm({...editForm, hydraulische_inputs: parseInt(value)})}
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

                <div className="col-span-2">
                  <Label htmlFor="edit-beschrijving">Beschrijving</Label>
                  <Textarea
                    id="edit-beschrijving"
                    value={editForm.beschrijving || ''}
                    onChange={(e) => setEditForm({...editForm, beschrijving: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-gewicht">Gewicht (kg)</Label>
                  <Input
                    id="edit-gewicht"
                    inputMode="numeric"
                    value={editForm.gewicht || ''}
                    onChange={(e) => setEditForm({...editForm, gewicht: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-werkdruk">Werkdruk (bar)</Label>
                  <Input
                    id="edit-werkdruk"
                    inputMode="numeric"
                    value={editForm.werkdruk || ''}
                    onChange={(e) => setEditForm({...editForm, werkdruk: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max_druk">Max Druk (bar)</Label>
                  <Input
                    id="edit-max_druk"
                    inputMode="numeric"
                    value={editForm.max_druk || ''}
                    onChange={(e) => setEditForm({...editForm, max_druk: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-debiet">Debiet (l/min)</Label>
                  <Input
                    id="edit-debiet"
                    inputMode="numeric"
                    value={editForm.debiet || ''}
                    onChange={(e) => setEditForm({...editForm, debiet: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-vermogen">Vermogen (kW)</Label>
                  <Input
                    id="edit-vermogen"
                    inputMode="numeric"
                    value={editForm.vermogen || ''}
                    onChange={(e) => setEditForm({...editForm, vermogen: parseInt(e.target.value) || 0})}
                  />
                </div>

                {/* Image Upload Section for Edit */}
                <div className="col-span-2">
                  <Label>Foto van de Machine</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label htmlFor="edit-machine-image" className="flex-1">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Klik om een nieuwe foto te selecteren
                            </span>
                            <span className="text-xs text-gray-400">
                              JPG, PNG (max 5MB)
                            </span>
                          </div>
                        </div>
                        <input
                          id="edit-machine-image"
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {editImagePreview && (
                      <div className="relative">
                        <Image
                          src={editImagePreview}
                          alt="Preview"
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setEditImagePreview(null);
                            setEditForm({...editForm, imageFile: undefined, afbeelding: ''});
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={cancelEditing}>
                  Annuleren
                </Button>
                <Button onClick={saveMachine} disabled={uploadingImage}>
                  {uploadingImage ? 'Uploaden...' : 'Wijzigingen Opslaan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QR-code voor {currentQrMachine?.naam}</DialogTitle>
              <p className="text-sm text-gray-600">
                Scan deze QR-code om machine informatie te bekijken
              </p>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrCodeData && (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <Image
                    src={qrCodeData}
                    alt={`QR-code voor ${currentQrMachine?.naam}`}
                    width={250}
                    height={250}
                    className="rounded"
                  />
                </div>
              )}
              <div className="text-center">
                <p className="font-medium">{currentQrMachine?.naam}</p>
                <p className="text-sm text-gray-600">{currentQrMachine?.type}</p>
                {currentQrMachine?.kenteken && (
                  <p className="text-sm text-gray-600">Kenteken: {currentQrMachine.kenteken}</p>
                )}
              </div>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setQrDialogOpen(false)}
                  className="flex-1"
                >
                  Sluiten
                </Button>
                <Button 
                  onClick={downloadQRCodeFromDialog}
                  className="flex-1"
                >
                  Download PNG
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 