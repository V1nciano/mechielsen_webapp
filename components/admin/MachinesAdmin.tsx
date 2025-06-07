'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, X, Plus, Trash2, Upload, QrCode, Link } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
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
  attachment_machines?: { attachments: Attachment }[];
  imageFile?: File;
}

interface Attachment {
  id: string;
  naam: string;
  type: string;
  identificatienummer?: string;
  aantal_slangen?: number;
  gewicht: number;
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
  const [search, setSearch] = useState('');
  const [machineType, setMachineType] = useState('all');
  const [machineName, setMachineName] = useState('all');
  const [availableNames, setAvailableNames] = useState<string[]>([]);

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
  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false);
  const [selectedMachineAttachments, setSelectedMachineAttachments] = useState<Attachment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalMachines, setTotalMachines] = useState(0);
  
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

  const showConnectedAttachments = (machine: Machine) => {
    const attachments = machine.attachment_machines?.map(am => am.attachments) || [];
    setSelectedMachineAttachments(attachments);
    setAttachmentsDialogOpen(true);
  };

  const fetchAvailableNames = useCallback(async () => {
    try {
      const { data: namesData, error } = await supabase
        .from('machines')
        .select('naam')
        .order('naam', { ascending: true });

      if (error) {
        console.error('Error fetching machine names:', error);
        return;
      }

      const uniqueNames = [...new Set((namesData || []).map(m => m.naam))].filter(Boolean);
      setAvailableNames(uniqueNames);
    } catch (error) {
      console.error('Error fetching available names:', error);
    }
  }, [supabase]);

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

      await fetchAvailableNames();
      await fetchMachinesWithInputs(1, '');
    } catch {
      toast.error('Er is een fout opgetreden');
    }
  }, [router, searchParams, supabase, fetchAvailableNames]);

  // Handle search with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1); // Reset to first page on search
    const timeoutId = setTimeout(() => {
      fetchMachinesWithInputs(1, value, machineType, machineName);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [machineType, machineName]);

  // Handle type filter change
  const handleTypeChange = useCallback((type: string) => {
    setMachineType(type);
    setCurrentPage(1); // Reset to first page on filter change
    fetchMachinesWithInputs(1, search, type, machineName);
  }, [search, machineName]);

  // Handle name filter change
  const handleNameChange = useCallback((name: string) => {
    setMachineName(name);
    setCurrentPage(1); // Reset to first page on filter change
    fetchMachinesWithInputs(1, search, machineType, name);
  }, [search, machineType]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchMachinesWithInputs(page, search, machineType, machineName);
  }, [search, machineType, machineName]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page
    fetchMachinesWithInputs(1, search, machineType, machineName);
  }, [search, machineType, machineName]);

  useEffect(() => {
    checkAdminAndFetchMachines();
  }, [checkAdminAndFetchMachines]);

  // Scroll functionality for dialog
  useEffect(() => {
    if (!addDialogOpen) return;

    const handleScroll = () => {
      const scrollContainer = document.querySelector('.dialog-scroll-container');
      const scrollButton = document.querySelector('.scroll-to-top-btn');
      
      if (scrollContainer && scrollButton) {
        const scrollTop = scrollContainer.scrollTop;
        
        // Show button when scrolled down more than 200px
        if (scrollTop > 200) {
          scrollButton.classList.remove('opacity-0');
          scrollButton.classList.add('opacity-100');
        } else {
          scrollButton.classList.remove('opacity-100');
          scrollButton.classList.add('opacity-0');
        }
      }
    };

    const scrollContainer = document.querySelector('.dialog-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [addDialogOpen]);

  const fetchMachinesWithInputs = async (page: number = currentPage, searchTerm: string = search, typeFilter: string = machineType, nameFilter: string = machineName) => {
    setLoading(true);
    try {
      // First get total count for pagination
      let countQuery = supabase
        .from('machines')
        .select('*', { count: 'exact', head: true });

      // Apply filters to count query
      if (searchTerm) {
        countQuery = countQuery.or(`naam.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,kenteken.ilike.%${searchTerm}%,beschrijving.ilike.%${searchTerm}%`);
      }
      if (typeFilter !== 'all') {
        countQuery = countQuery.eq('type', typeFilter);
      }
      if (nameFilter !== 'all') {
        countQuery = countQuery.eq('naam', nameFilter);
      }

      const { count } = await countQuery;
      setTotalMachines(count || 0);

      // Fetch paginated machines with attachment relationships
      let machinesQuery = supabase
        .from('machines')
        .select(`
          *,
          attachment_machines(
            attachments(
              id,
              naam,
              type,
              identificatienummer,
              aantal_slangen,
              gewicht
            )
          )
        `)
        .order('naam', { ascending: true })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Apply same filters to data query
      if (searchTerm) {
        machinesQuery = machinesQuery.or(`naam.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,kenteken.ilike.%${searchTerm}%,beschrijving.ilike.%${searchTerm}%`);
      }
      if (typeFilter !== 'all') {
        machinesQuery = machinesQuery.eq('type', typeFilter);
      }
      if (nameFilter !== 'all') {
        machinesQuery = machinesQuery.eq('naam', nameFilter);
      }

      const { data: machinesData, error: machinesError } = await machinesQuery;

      if (machinesError) {
        toast.error('Fout bij ophalen machines: ' + machinesError.message);
        return;
      }

      // Batch fetch hydraulic inputs for all machines at once for better performance
      const machineIds = (machinesData || []).map(m => m.id);
      const { data: allHydraulicInputs } = await supabase
        .from('machine_hydraulic_inputs')
        .select('*')
        .in('machine_id', machineIds)
        .order('volgorde', { ascending: true });

      // Group hydraulic inputs by machine_id for efficient lookup
      const inputsByMachine = (allHydraulicInputs || []).reduce((acc, input) => {
        if (!acc[input.machine_id]) acc[input.machine_id] = [];
        acc[input.machine_id].push(input);
        return acc;
      }, {} as Record<string, HydraulicInput[]>);

      // Enrich machines with their hydraulic inputs
      const enrichedMachines = (machinesData || []).map(machine => ({
        ...machine,
        hydraulic_inputs: inputsByMachine[machine.id] || []
      }));

      setMachines(enrichedMachines);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Er is een fout opgetreden bij het ophalen van machines');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const verified = searchParams.get('verified') || 'true';
                  const email = searchParams.get('email') || 'admin@example.com';
                  router.push(`/admin?verified=${verified}&email=${encodeURIComponent(email)}`);
                }}
                className="w-fit border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Admin
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-black">
                  Machines Beheren
                </h1>
                <p className="text-gray-600 mt-1">Beheer uw machines en configureer hydraulische inputs</p>
              </div>
            </div>
            
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Machine
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[98vw] h-[95vh] sm:w-[90vw] sm:max-w-4xl sm:h-auto sm:max-h-[85vh] lg:max-w-5xl p-0 gap-0 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 sm:p-6 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl lg:text-2xl text-white">Nieuwe Machine</DialogTitle>
                      <p className="text-green-100 text-sm sm:text-base mt-1">
                        Voeg een nieuwe machine toe aan uw vloot
                      </p>
                    </DialogHeader>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-green-400 scrollbar-track-gray-100 hover:scrollbar-thumb-green-500 dialog-scroll-container">
                <div className="p-4 sm:p-6 lg:p-8">

                  {/* Basic Information Section */}
                  <div className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2 mb-4 lg:mb-6">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Basisinformatie</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="naam" className="text-sm sm:text-base font-medium">Naam <span className="text-red-500">*</span></Label>
                        <Input
                          id="naam"
                          value={newMachine.naam || ''}
                          onChange={(e) => setNewMachine({...newMachine, naam: e.target.value})}
                          className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                          placeholder="Bijv. John Deere 8400R"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="type" className="text-sm sm:text-base font-medium">Type <span className="text-red-500">*</span></Label>
                        <Input
                          id="type"
                          value={newMachine.type || ''}
                          onChange={(e) => setNewMachine({...newMachine, type: e.target.value})}
                          className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                          placeholder="Bijv. Trekker, Maaidorser, Combine"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="kenteken" className="text-sm sm:text-base font-medium">Kenteken</Label>
                        <Input
                          id="kenteken"
                          value={newMachine.kenteken || ''}
                          onChange={(e) => setNewMachine({...newMachine, kenteken: e.target.value})}
                          className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                          placeholder="Bijv. 12-ABC-3"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="hydraulische_inputs" className="text-sm sm:text-base font-medium">Hydraulische Inputs</Label>
                        <Select 
                          value={newMachine.hydraulische_inputs?.toString() || '2'} 
                          onValueChange={(value) => setNewMachine({...newMachine, hydraulische_inputs: parseInt(value)})}
                        >
                          <SelectTrigger className="w-full border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg">
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

                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1.5">
                        <Label htmlFor="beschrijving" className="text-sm sm:text-base font-medium">Beschrijving</Label>
                        <Textarea
                          id="beschrijving"
                          value={newMachine.beschrijving || ''}
                          onChange={(e) => setNewMachine({...newMachine, beschrijving: e.target.value})}
                          className="w-full min-h-[100px] text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                          placeholder="Voer een gedetailleerde beschrijving van de machine in..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technical Specifications Section */}
                  <div className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2 mb-4 lg:mb-6">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Technische Specificaties</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

                      <div className="space-y-1.5">
                        <Label htmlFor="gewicht" className="text-sm sm:text-base font-medium">Gewicht <span className="text-gray-500">(kg)</span></Label>
                        <Input
                          id="gewicht"
                          type="number"
                          value={newMachine.gewicht || ''}
                          onChange={(e) => setNewMachine({...newMachine, gewicht: parseInt(e.target.value) || 0})}
                          className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="werkdruk" className="text-sm sm:text-base font-medium">Werkdruk <span className="text-gray-500">(bar)</span></Label>
                        <Input
                          id="werkdruk"
                          type="number"
                          value={newMachine.werkdruk || ''}
                          onChange={(e) => setNewMachine({...newMachine, werkdruk: parseInt(e.target.value) || 0})}
                          className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="max_druk" className="text-sm sm:text-base font-medium">Max Druk <span className="text-gray-500">(bar)</span></Label>
                        <Input
                          id="max_druk"
                          type="number"
                          value={newMachine.max_druk || ''}
                          onChange={(e) => setNewMachine({...newMachine, max_druk: parseInt(e.target.value) || 0})}
                          className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="debiet" className="text-sm sm:text-base font-medium">Debiet <span className="text-gray-500">(l/min)</span></Label>
                        <Input
                          id="debiet"
                          type="number"
                          value={newMachine.debiet || ''}
                          onChange={(e) => setNewMachine({...newMachine, debiet: parseInt(e.target.value) || 0})}
                          className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="vermogen" className="text-sm sm:text-base font-medium">Vermogen <span className="text-gray-500">(kW)</span></Label>
                        <Input
                          id="vermogen"
                          type="number"
                          value={newMachine.vermogen || ''}
                          onChange={(e) => setNewMachine({...newMachine, vermogen: parseInt(e.target.value) || 0})}
                          className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photo Upload Section */}
                  <div className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2 mb-4 lg:mb-6">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Foto Upload</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 lg:p-8 transition-all hover:border-green-400 hover:bg-green-50/20">
                          <label htmlFor="machine-image" className="cursor-pointer block">
                            <div className="text-center">
                              <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                                <Upload className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
                              </div>
                              <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-1">
                                Foto uploaden
                              </p>
                              <p className="text-xs sm:text-sm lg:text-base text-gray-500">
                                JPG, PNG (maximaal 5MB)
                              </p>
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
                      </div>
                      
                      {imagePreview && (
                        <div className="relative rounded-xl overflow-hidden shadow-lg">
                          <Image
                            src={imagePreview}
                            alt="Preview"
                            width={400}
                            height={192}
                            className="w-full h-48 sm:h-56 lg:h-64 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20"></div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-3 right-3 h-8 w-8 p-0 shadow-lg"
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
              </div>

              {/* Scroll to top button - only visible when scrolled */}
              <div className="absolute bottom-24 right-4 z-20">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full w-10 h-10 p-0 bg-white/90 backdrop-blur-sm border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 scroll-to-top-btn opacity-0"
                  onClick={() => {
                    const scrollContainer = document.querySelector('.dialog-scroll-container');
                    if (scrollContainer) {
                      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                </Button>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200 rounded-b-lg flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Velden met * zijn verplicht</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setAddDialogOpen(false)} 
                      className="w-full sm:w-auto h-11 text-base font-medium border-gray-300 hover:bg-gray-100"
                    >
                      Annuleren
                    </Button>
                    <Button 
                      onClick={addNewMachine} 
                      className="w-full sm:w-auto h-11 text-base font-medium bg-green-600 hover:bg-green-700 shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Machine Toevoegen
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
          {/* Header with search */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 p-3 sm:p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-green-800 mb-1">Machines Zoeken & Filteren</h3>
                  <p className="text-xs text-green-600">Vind snel de machine die je zoekt</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-200/50 px-2 py-1 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="font-medium">{totalMachines} machines</span>
                </div>
              </div>
              
              {/* Search Bar with Name, Type and Per Page Filters */}
              <div className="space-y-3">
                {/* Mobile Layout - Full width search bar */}
                <div className="block sm:hidden">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Zoek machines..."
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                      className="pl-10 pr-4 py-3 text-sm bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg shadow-sm w-full"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSearchChange('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Mobile Layout - Filters in grid */}
                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Machine Naam</label>
                    <Select
                      value={machineName}
                      onValueChange={handleNameChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 h-10">
                        <SelectValue placeholder="Alle namen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle namen</SelectItem>
                        {availableNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Machine Type</label>
                    <Select
                      value={machineType}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 h-10">
                        <SelectValue placeholder="Alle types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle types</SelectItem>
                        <SelectItem value="6R 155">6R 155</SelectItem>
                        <SelectItem value="EWR150E">EWR150E</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mobile Layout - Items per page */}
                <div className="sm:hidden">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Items per pagina</label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
                  >
                    <SelectTrigger className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 items</SelectItem>
                      <SelectItem value="12">12 items</SelectItem>
                      <SelectItem value="24">24 items</SelectItem>
                      <SelectItem value="48">48 items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Desktop Layout - All in one row */}
                <div className="hidden sm:flex gap-3 items-end">
                  <div className="relative flex-1 min-w-0">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Zoeken</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <Input
                        type="text"
                        placeholder="Zoek op naam, type, kenteken of beschrijving..."
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="pl-10 pr-4 py-2.5 text-sm bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg shadow-sm"
                      />
                      {search && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSearchChange('')}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Naam</label>
                    <Select
                      value={machineName}
                      onValueChange={handleNameChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 w-44">
                        <SelectValue placeholder="Alle namen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle namen</SelectItem>
                        {availableNames.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
                    <Select
                      value={machineType}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 w-36">
                        <SelectValue placeholder="Alle types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle types</SelectItem>
                        <SelectItem value="6R 155">6R 155</SelectItem>
                        <SelectItem value="EWR150E">EWR150E</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Per pagina</label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-green-500 focus:ring-green-500 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 items</SelectItem>
                        <SelectItem value="12">12 items</SelectItem>
                        <SelectItem value="24">24 items</SelectItem>
                        <SelectItem value="48">48 items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Results and Pagination */}
          <div className="border-t border-gray-200 p-3 sm:p-4 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalMachines)}
                  </span>
                  <span className="text-gray-400 mx-1">van</span>
                  <span className="font-medium">{totalMachines}</span>
                  <span className="text-gray-400 ml-1">machines</span>
                </div>
                                 {(search || machineType !== 'all' || machineName !== 'all') && (
                   <div className="hidden sm:flex items-center gap-2">
                     <div className="w-1 h-4 bg-gray-300"></div>
                     <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                       Gefilterd
                     </span>
                   </div>
                 )}
              </div>
              
              {/* Pagination Controls */}
              {Math.ceil(totalMachines / itemsPerPage) > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 border-gray-300"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Vorige</span>
                  </Button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const totalPages = Math.ceil(totalMachines / itemsPerPage);
                      const pages: number[] = [];
                      
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        if (currentPage <= 3) {
                          pages.push(1, 2, 3, 4);
                          pages.push(-1);
                          pages.push(totalPages);
                        } else if (currentPage >= totalPages - 2) {
                          pages.push(1);
                          pages.push(-1);
                          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          pages.push(-1);
                          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                          pages.push(-2);
                          pages.push(totalPages);
                        }
                      }
                      
                      return pages.map((page, index) => (
                        page > 0 ? (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className={`w-9 h-9 p-0 text-sm ${
                              currentPage === page 
                                ? 'bg-green-600 hover:bg-green-700 border-green-600' 
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={`ellipsis-${index}`} className="px-2 text-gray-400 text-sm">...</span>
                        )
                      ));
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(totalMachines / itemsPerPage)}
                    className="px-3 border-gray-300"
                  >
                    <span className="hidden sm:inline">Volgende</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Machines Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-3 text-gray-600">Machines laden...</span>
          </div>
        ) : machines.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen machines gevonden</h3>
            <p className="text-gray-500 mb-6">
              {search || machineType !== 'all' || machineName !== 'all'
                ? 'Probeer andere zoektermen of filters.' 
                : 'Voeg je eerste machine toe om te beginnen.'
              }
            </p>
            <Button 
              onClick={() => setAddDialogOpen(true)} 
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Eerste Machine Toevoegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {machines.map((machine) => (
            <Card key={machine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="truncate font-semibold">{machine.naam}</span>
                    {machine.attachment_machines && machine.attachment_machines.length > 0 && (
                      <div className="mt-2">
                        {machine.attachment_machines.length === 1 ? (
                          <div className="flex items-center gap-2">
                            <Link className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">
                              {machine.attachment_machines[0].attachments.naam}
                            </span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showConnectedAttachments(machine)}
                            className="h-6 px-2 text-xs border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                          >
                            <Link className="w-3 h-3 mr-1" />
                            <span className="font-medium">{machine.attachment_machines.length} aanbouwdelen</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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

        {/* Connected Attachments Dialog */}
        <Dialog open={attachmentsDialogOpen} onOpenChange={setAttachmentsDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-3xl">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <Link className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Gekoppelde Aanbouwdelen</DialogTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedMachineAttachments.length} aanbouwdeel{selectedMachineAttachments.length !== 1 ? 'en' : ''} gekoppeld aan deze machine
                  </p>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedMachineAttachments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Geen aanbouwdelen gekoppeld</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Ga naar Machine Configuratie om aanbouwdelen te koppelen
                  </p>
                </div>
              ) : (
                selectedMachineAttachments.map((attachment, index) => (
                  <div 
                    key={attachment.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            {attachment.naam?.charAt(0).toUpperCase() || 'A'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{attachment.naam}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">
                              Type: <span className="font-medium">{attachment.type}</span>
                            </span>
                            {attachment.identificatienummer && (
                              <span className="text-sm text-gray-600">
                                ID: <span className="font-medium">{attachment.identificatienummer}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">
                              Slangen: <span className="font-medium">{attachment.aantal_slangen || 0}</span>
                            </span>
                            <span className="text-sm text-gray-600">
                              Gewicht: <span className="font-medium">{attachment.gewicht}kg</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Gekoppeld
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={() => setAttachmentsDialogOpen(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                Sluiten
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 