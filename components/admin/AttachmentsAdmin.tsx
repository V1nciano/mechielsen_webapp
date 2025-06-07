'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, X, Plus, Trash2, Upload, QrCode, Search, Link, Tractor } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import qrcode from 'qrcode-generator';

interface HydraulicHose {
  id: string;
  kleur: string;
  volgorde: number;
}

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
  aantal_slangen?: number;
  afbeelding?: string;
  created_at: string;
  identificatienummer?: string;
  machines?: Machine[];
  hydraulic_hoses?: HydraulicHose[];
  attachment_machines?: { machines: Machine }[];
  imageFile?: File;
}

interface Machine {
  id: string;
  naam: string;
  type: string;
  kenteken?: string;
}

interface SupabaseError {
  message: string;
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

const AttachmentsAdmin: React.FC = () => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [newAttachment, setNewAttachment] = useState<Partial<Attachment>>({});
  const [editForm, setEditForm] = useState<Partial<Attachment>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentQrAttachment, setCurrentQrAttachment] = useState<Attachment | null>(null);
  const [search, setSearch] = useState('');
  const [attachmentName, setAttachmentName] = useState('all');
  const [attachmentType, setAttachmentType] = useState('all');
  const [availableNames, setAvailableNames] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [machinesDialogOpen, setMachinesDialogOpen] = useState(false);
  const [selectedAttachmentMachines, setSelectedAttachmentMachines] = useState<Machine[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalAttachments, setTotalAttachments] = useState(0);


  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const fetchAvailableNamesAndTypes = useCallback(async () => {
    try {
      const { data: attachmentsData, error } = await supabase
        .from('attachments')
        .select('naam, type')
        .order('naam', { ascending: true });

      if (error) {
        console.error('Error fetching attachment names and types:', error);
        return;
      }

      const uniqueNames = [...new Set((attachmentsData || []).map(a => a.naam))].filter(Boolean);
      const uniqueTypes = [...new Set((attachmentsData || []).map(a => a.type))].filter(Boolean);
      
      setAvailableNames(uniqueNames);
      setAvailableTypes(uniqueTypes);
    } catch (error) {
      console.error('Error fetching available names and types:', error);
    }
  }, [supabase]);

  const fetchAttachmentsAndMachines = useCallback(async (page: number = currentPage, searchTerm: string = search, nameFilter: string = attachmentName, typeFilter: string = attachmentType) => {
    setLoading(true);
    try {
      // First get total count for pagination
      let countQuery = supabase
        .from('attachments')
        .select('*', { count: 'exact', head: true });

      // Apply filters to count query
      if (searchTerm) {
        countQuery = countQuery.or(`naam.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,identificatienummer.ilike.%${searchTerm}%,beschrijving.ilike.%${searchTerm}%`);
      }
      if (nameFilter !== 'all') {
        countQuery = countQuery.eq('naam', nameFilter);
      }
      if (typeFilter !== 'all') {
        countQuery = countQuery.eq('type', typeFilter);
      }

      const { count } = await countQuery;
      setTotalAttachments(count || 0);

      // Fetch paginated attachments with relationships
      let attachmentsQuery = supabase
        .from('attachments')
        .select(`
          *,
          hydraulic_hoses:attachment_hydraulic_hoses(
            id,
            kleur,
            volgorde
          ),
          attachment_machines(
            machines(
              id,
              naam,
              type,
              kenteken
            )
          )
        `)
        .order('created_at', { ascending: true })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Apply same filters to data query
      if (searchTerm) {
        attachmentsQuery = attachmentsQuery.or(`naam.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,identificatienummer.ilike.%${searchTerm}%,beschrijving.ilike.%${searchTerm}%`);
      }
      if (nameFilter !== 'all') {
        attachmentsQuery = attachmentsQuery.eq('naam', nameFilter);
      }
      if (typeFilter !== 'all') {
        attachmentsQuery = attachmentsQuery.eq('type', typeFilter);
      }

      const { data: attachmentsData, error: attachmentsError } = await attachmentsQuery;

      if (attachmentsError) {
        toast.error('Fout bij ophalen aanbouwdelen: ' + attachmentsError.message);
        return;
      }

      setAttachments(attachmentsData || []);
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error('Error fetching attachments:', error);
      toast.error('Er is een fout opgetreden bij het ophalen van de data');
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, search, itemsPerPage]);

  const checkAdminAndFetchData = useCallback(async () => {
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

      await fetchAvailableNamesAndTypes();
      await fetchAttachmentsAndMachines(1, '');
    } catch {
      toast.error('Er is een fout opgetreden');
    }
  }, [router, searchParams, supabase, fetchAvailableNamesAndTypes]);

  // Handle search with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
    const timeoutId = setTimeout(() => {
      fetchAttachmentsAndMachines(1, value, attachmentName, attachmentType);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [attachmentName, attachmentType]);

  // Handle name filter change
  const handleNameChange = useCallback((name: string) => {
    setAttachmentName(name);
    setCurrentPage(1);
    fetchAttachmentsAndMachines(1, search, name, attachmentType);
  }, [search, attachmentType]);

  // Handle type filter change
  const handleTypeChange = useCallback((type: string) => {
    setAttachmentType(type);
    setCurrentPage(1);
    fetchAttachmentsAndMachines(1, search, attachmentName, type);
  }, [search, attachmentName]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchAttachmentsAndMachines(page, search, attachmentName, attachmentType);
  }, [search, attachmentName, attachmentType]);

  // Handle items per page change
  const handleItemsPerPageChange = useCallback((items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
    fetchAttachmentsAndMachines(1, search, attachmentName, attachmentType);
  }, [search, attachmentName, attachmentType]);

  useEffect(() => {
    checkAdminAndFetchData();
  }, [checkAdminAndFetchData]);

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
    setEditingAttachment(attachment);
    setEditForm(attachment);
    setEditImagePreview(attachment.afbeelding || null);
    setEditDialogOpen(true);
  };

  const cancelEditing = () => {
    setEditingAttachment(null);
    setEditForm({});
    setEditDialogOpen(false);
    setEditImagePreview(null);
  };

  const saveAttachment = async () => {
    if (!editingAttachment) return;

    try {
      // Upload new image if selected
      let imageUrl = editForm.afbeelding;
      if (editForm.imageFile) {
        toast.info('Uploading foto...');
        const uploadedUrl = await uploadAttachmentImage(editForm.imageFile, editingAttachment.id);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const attachmentData = {
        naam: editForm.naam,
        beschrijving: editForm.beschrijving,
        type: editForm.type,
        gewicht: editForm.gewicht,
        werkdruk: editForm.werkdruk,
        max_druk: editForm.max_druk,
        debiet: editForm.debiet,
        vermogen: editForm.vermogen,
        aantal_slangen: editForm.aantal_slangen,
        identificatienummer: editForm.identificatienummer,
        afbeelding: imageUrl
      };
      
      const { error } = await supabase
        .from('attachments')
        .update(attachmentData)
        .eq('id', editingAttachment.id);

      if (error) {
        toast.error('Fout bij opslaan: ' + error.message);
        return;
      }

      toast.success('Aanbouwdeel succesvol bijgewerkt!');
      cancelEditing();
      fetchAttachmentsAndMachines();
    } catch {
      toast.error('Er is een fout opgetreden bij het opslaan');
    }
  };

  const addNewAttachment = async () => {
    try {
      // First create the attachment
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert([{
          naam: newAttachment.naam,
          beschrijving: newAttachment.beschrijving,
          type: newAttachment.type,
          gewicht: newAttachment.gewicht,
          werkdruk: newAttachment.werkdruk,
          max_druk: newAttachment.max_druk,
          debiet: newAttachment.debiet,
          vermogen: newAttachment.vermogen,
          aantal_slangen: newAttachment.aantal_slangen,
          identificatienummer: newAttachment.identificatienummer
        }])
        .select()
        .single();

      if (attachmentError) {
        toast.error('Fout bij toevoegen aanbouwdeel: ' + attachmentError.message);
        return;
      }

      // Upload image if provided
      let imageUrl = null;
      if (newAttachment.imageFile) {
        imageUrl = await uploadAttachmentImage(newAttachment.imageFile, attachmentData.id);
        
        if (imageUrl) {
          await supabase
            .from('attachments')
            .update({ afbeelding: imageUrl })
            .eq('id', attachmentData.id);
        }
      }

      // Create automatic hydraulic hoses based on aantal_slangen
      const getAutoColor = (slangNummer: number) => {
        const colorMap = ['rood', 'blauw', 'geel', 'groen', 'zwart', 'wit', 'oranje', 'paars'];
        return colorMap[(slangNummer - 1) % colorMap.length];
      };

      const defaultSlangen = [];
      const aantalSlangen = newAttachment.aantal_slangen || 2;
      for (let i = 1; i <= aantalSlangen; i++) {
        const kleur = getAutoColor(i);
        defaultSlangen.push({
          attachment_id: attachmentData.id,
          kleur: kleur,
          volgorde: i
        });
      }

      if (defaultSlangen.length > 0) {
        const { error } = await supabase
          .from('attachment_hydraulic_hoses')
          .insert(defaultSlangen);
          
        if (error) {
          // Fallback: try inserting one by one
          let successCount = 0;
          for (const slang of defaultSlangen) {
            const { error: singleError } = await supabase
              .from('attachment_hydraulic_hoses')
              .insert([slang]);
              
            if (!singleError) {
              successCount++;
            }
          }
          
          if (successCount > 0) {
            toast.success(`${successCount}/${defaultSlangen.length} slangen automatisch aangemaakt`);
          }
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
        aantal_slangen: 2
      });
      setImagePreview(null);
      fetchAttachmentsAndMachines();
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error('Error adding attachment:', error);
      toast.error('Fout bij toevoegen: ' + error.message);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Weet je zeker dat je dit aanbouwdeel wilt verwijderen?')) {
      return;
    }

    try {
      // Delete related data first
      await supabase.from('attachment_hydraulic_hoses').delete().eq('attachment_id', attachmentId);
      await supabase.from('attachment_machines').delete().eq('attachment_id', attachmentId);
      
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
    } catch {
      toast.error('Er is een fout opgetreden bij het verwijderen');
    }
  };

  const uploadAttachmentImage = async (file: File, attachmentId: string) => {
    try {
      setUploadingImage(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${attachmentId}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('attachment-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        toast.error('Fout bij uploaden afbeelding: ' + error.message);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attachment-images')
        .getPublicUrl(fileName);

      if (urlData.publicUrl) {
        return urlData.publicUrl;
      }
      
      return null;
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
      setNewAttachment({...newAttachment, imageFile: file});
    }
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

  const updateHoseColor = async (hoseId: string, color: string) => {
    try {
      const { error } = await supabase
        .from('attachment_hydraulic_hoses')
        .update({ kleur: color })
        .eq('id', hoseId);

      if (error) throw error;
      await fetchAttachmentsAndMachines();
      toast.success('Kleur bijgewerkt');
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error('Error updating hose color:', error);
      toast.error('Fout bij bijwerken van kleur');
    }
  };

  const generateQRCodeImage = (attachment: Attachment): string => {
    try {
      // Generate attachment info JSON for QR code
      const attachmentInfo = {
        id: attachment.id,
        naam: attachment.naam,
        type: attachment.type,
        gewicht: attachment.gewicht,
        werkdruk: attachment.werkdruk,
        max_druk: attachment.max_druk,
        debiet: attachment.debiet,
        vermogen: attachment.vermogen,
        aantal_slangen: attachment.aantal_slangen,
        hydraulic_hoses: attachment.hydraulic_hoses?.map(hose => ({
          kleur: hose.kleur,
          volgorde: hose.volgorde
        })) || [],
        compatible_machines: attachment.machines?.map(machine => ({
          id: machine.id,
          naam: machine.naam,
          type: machine.type
        })) || []
      };

      // Create QR code instance
      const qr = qrcode(0, 'M');
      qr.addData(JSON.stringify(attachmentInfo));
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

  const showQRCode = (attachment: Attachment) => {
    const qrImageData = generateQRCodeImage(attachment);
    if (qrImageData) {
      setQrCodeData(qrImageData);
      setCurrentQrAttachment(attachment);
      setQrDialogOpen(true);
    }
  };

  const showConnectedMachines = (attachment: Attachment) => {
    const machines = attachment.attachment_machines?.map(am => am.machines) || [];
    setSelectedAttachmentMachines(machines);
    setMachinesDialogOpen(true);
  };

  const downloadQRCodeFromDialog = () => {
    if (!qrCodeData || !currentQrAttachment) return;

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
      link.download = `qr-code-${currentQrAttachment.naam.replace(/\s+/g, '-').toLowerCase()}.png`;
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
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
                className="w-fit border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Admin
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-black">
                  Aanbouwdelen Beheren
                </h1>
                <p className="text-gray-600 mt-1">Beheer uw aanbouwdelen en configureer hydraulische slangen</p>
              </div>
            </div>
          
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuw Aanbouwdeel
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[98vw] h-[95vh] sm:w-[90vw] sm:max-w-4xl sm:h-auto sm:max-h-[85vh] lg:max-w-5xl p-0 gap-0 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl lg:text-2xl text-white">Nieuw Aanbouwdeel</DialogTitle>
                      <p className="text-blue-100 text-sm sm:text-base mt-1">
                        Voeg een nieuw aanbouwdeel toe aan uw inventaris
                      </p>
                    </DialogHeader>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-100 hover:scrollbar-thumb-blue-500 dialog-scroll-container">
                <div className="p-4 sm:p-6 lg:p-8">

                  {/* Basic Information Section */}
                  <div className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2 mb-4 lg:mb-6">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Basisinformatie</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                                    <div className="space-y-1.5">
                      <Label htmlFor="naam" className="text-sm sm:text-base font-medium">Naam <span className="text-red-500">*</span></Label>
                      <Input
                        id="naam"
                        value={newAttachment.naam || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, naam: e.target.value})}
                        className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        placeholder="Bijv. Cultivator XL"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="identificatienummer" className="text-sm sm:text-base font-medium">Identificatienummer</Label>
                      <Input
                        id="identificatienummer"
                        value={newAttachment.identificatienummer || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, identificatienummer: e.target.value})}
                        className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        placeholder="Bijv. CUL-2024-001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="type" className="text-sm sm:text-base font-medium">Type <span className="text-red-500">*</span></Label>
                      <Input
                        id="type"
                        value={newAttachment.type || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, type: e.target.value})}
                        className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        placeholder="Bijv. Cultivator, Ploeg, Spuit"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="aantal_slangen" className="text-sm sm:text-base font-medium">Aantal Slangen</Label>
                      <Input
                        id="aantal_slangen"
                        type="number"
                        value={newAttachment.aantal_slangen || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, aantal_slangen: parseInt(e.target.value) || 0})}
                        className="w-full text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 space-y-1.5">
                        <Label htmlFor="beschrijving" className="text-sm sm:text-base font-medium">Beschrijving</Label>
                        <Textarea
                          id="beschrijving"
                          value={newAttachment.beschrijving || ''}
                          onChange={(e) => setNewAttachment({...newAttachment, beschrijving: e.target.value})}
                          className="w-full min-h-[100px] text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          placeholder="Voer een gedetailleerde beschrijving in..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technical Specifications Section */}
                  <div className="mb-6 lg:mb-8">
                    <div className="flex items-center gap-2 mb-4 lg:mb-6">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Technische Specificaties</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">

                    <div className="space-y-1.5">
                      <Label htmlFor="gewicht" className="text-sm sm:text-base font-medium">Gewicht <span className="text-gray-500">(kg)</span></Label>
                      <Input
                        id="gewicht"
                        type="number"
                        value={newAttachment.gewicht || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, gewicht: parseInt(e.target.value) || 0})}
                        className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="werkdruk" className="text-sm sm:text-base font-medium">Werkdruk <span className="text-gray-500">(bar)</span></Label>
                      <Input
                        id="werkdruk"
                        type="number"
                        value={newAttachment.werkdruk || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, werkdruk: parseInt(e.target.value) || 0})}
                        className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="max_druk" className="text-sm sm:text-base font-medium">Max Druk <span className="text-gray-500">(bar)</span></Label>
                      <Input
                        id="max_druk"
                        type="number"
                        value={newAttachment.max_druk || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, max_druk: parseInt(e.target.value) || 0})}
                        className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="debiet" className="text-sm sm:text-base font-medium">Debiet <span className="text-gray-500">(l/min)</span></Label>
                      <Input
                        id="debiet"
                        type="number"
                        value={newAttachment.debiet || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, debiet: parseInt(e.target.value) || 0})}
                        className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vermogen" className="text-sm sm:text-base font-medium">Vermogen <span className="text-gray-500">(kW)</span></Label>
                      <Input
                        id="vermogen"
                        type="number"
                        value={newAttachment.vermogen || ''}
                        onChange={(e) => setNewAttachment({...newAttachment, vermogen: parseInt(e.target.value) || 0})}
                        className="w-full text-base border-gray-300 focus:border-green-500 focus:ring-green-500 rounded-lg"
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
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 lg:p-8 transition-all hover:border-blue-400 hover:bg-blue-50/20">
                          <label htmlFor="attachment-image" className="cursor-pointer block">
                            <div className="text-center">
                              <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Upload className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
                              </div>
                              <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-1">
                                Foto uploaden
                              </p>
                              <p className="text-xs sm:text-sm lg:text-base text-gray-500">
                                JPG, PNG (maximaal 5MB)
                              </p>
                            </div>
                            <input
                              id="attachment-image"
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
                              setNewAttachment({...newAttachment, imageFile: undefined});
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
                      onClick={addNewAttachment} 
                      className="w-full sm:w-auto h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Aanbouwdeel Toevoegen
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search Section */}
        {/* Search and Filter Section */}
        <div className="mb-6 bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
          {/* Header with search */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 p-3 sm:p-4">
            <div className="flex flex-col space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-blue-800 mb-1">Aanbouwdelen Zoeken & Filteren</h3>
                  <p className="text-xs text-blue-600">Vind snel het aanbouwdeel dat je zoekt</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-200/50 px-2 py-1 rounded">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="font-medium">{totalAttachments} aanbouwdelen</span>
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
                      placeholder="Zoek aanbouwdelen..."
                      value={search}
                      onChange={e => handleSearchChange(e.target.value)}
                      className="pl-10 pr-4 py-3 text-sm bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm w-full"
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
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Aanbouwdeel Naam</label>
                    <Select
                      value={attachmentName}
                      onValueChange={handleNameChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10">
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
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Aanbouwdeel Type</label>
                    <Select
                      value={attachmentType}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10">
                        <SelectValue placeholder="Alle types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle types</SelectItem>
                        {availableTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
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
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 w-full">
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
                        placeholder="Zoek op naam, type, identificatienummer of beschrijving..."
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="pl-10 pr-4 py-2.5 text-sm bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg shadow-sm"
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
                      value={attachmentName}
                      onValueChange={handleNameChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-44">
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
                      value={attachmentType}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-36">
                        <SelectValue placeholder="Alle types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle types</SelectItem>
                        {availableTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Per pagina</label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-28">
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
                    {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalAttachments)}
                  </span>
                  <span className="text-gray-400 mx-1">van</span>
                  <span className="font-medium">{totalAttachments}</span>
                  <span className="text-gray-400 ml-1">aanbouwdelen</span>
                </div>
                                 {(search || attachmentName !== 'all' || attachmentType !== 'all') && (
                   <div className="hidden sm:flex items-center gap-2">
                     <div className="w-1 h-4 bg-gray-300"></div>
                     <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                       Gefilterd
                     </span>
                   </div>
                 )}
              </div>
              
              {/* Pagination Controls */}
              {Math.ceil(totalAttachments / itemsPerPage) > 1 && (
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
                      const totalPages = Math.ceil(totalAttachments / itemsPerPage);
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
                                ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' 
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
                    disabled={currentPage === Math.ceil(totalAttachments / itemsPerPage)}
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

        {/* Attachments Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Aanbouwdelen laden...</span>
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen aanbouwdelen gevonden</h3>
            <p className="text-gray-500 mb-6">
              {search || attachmentName !== 'all' || attachmentType !== 'all'
                ? 'Probeer andere zoektermen of filters.' 
                : 'Voeg je eerste aanbouwdeel toe om te beginnen.'
              }
            </p>
            <Button 
              onClick={() => setAddDialogOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Eerste Aanbouwdeel Toevoegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {attachments.map((attachment) => (
            <Card key={attachment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="truncate font-semibold">{attachment.naam}</span>
                    {attachment.attachment_machines && attachment.attachment_machines.length > 0 && (
                      <div className="mt-2">
                        {attachment.attachment_machines.length === 1 ? (
                          <div className="flex items-center gap-2">
                            <Link className="w-3 h-3 text-blue-600" />
                            <span className="text-xs text-blue-600 font-medium">
                              {attachment.attachment_machines[0].machines.naam}
                            </span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showConnectedMachines(attachment)}
                            className="h-6 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Link className="w-3 h-3 mr-1" />
                            <Tractor className="w-3 h-3 mr-1" />
                            {attachment.attachment_machines.length} machines
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => startEditing(attachment)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => showQRCode(attachment)}
                      title="Toon QR-code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => deleteAttachment(attachment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {attachment.afbeelding && (
                  <div className="relative aspect-video">
                    <Image
                      src={attachment.afbeelding}
                      alt={attachment.naam}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="secondary">{attachment.type}</Badge>
                    </div>
                  </div>
                  {attachment.identificatienummer && (
                    <div>
                      <Label className="text-sm font-medium">ID</Label>
                      <div className="mt-1">
                        <Badge variant="outline">{attachment.identificatienummer}</Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hydraulic Hoses */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Hydraulische Slangen ({attachment.aantal_slangen || 0})
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
                          <DialogTitle>Hydraulische Slangen voor {attachment.naam}</DialogTitle>
                          <p className="text-sm text-gray-600">Configureer de kleuren voor elke slang</p>
                        </DialogHeader>
                        
                        <div className="space-y-3">
                          {attachment.hydraulic_hoses?.map((hose) => (
                            <div key={hose.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border gap-3">
                              <div className="flex items-center gap-3">
                                {getKleurDisplay(hose.kleur)}
                                <p className="font-medium">Slang {hose.volgorde}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={hose.kleur} 
                                  onValueChange={(value) => updateHoseColor(hose.id, value)}
                                >
                                  <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SLANG_KLEUREN.map((kleur) => (
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
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {attachment.hydraulic_hoses && attachment.hydraulic_hoses.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {attachment.hydraulic_hoses.map((hose) => (
                          <div key={hose.id} 
                               className="flex items-center gap-2 p-2 bg-white rounded-lg border shadow-sm">
                            {getKleurDisplay(hose.kleur)}
                            <span className="text-sm font-medium">
                              Slang {hose.volgorde}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">⚠️ Geen slangen geconfigureerd</p>
                      <p className="text-xs text-yellow-600">Klik op configureren om te beginnen</p>
                    </div>
                  )}
                </div>

                {/* Technical Specs */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Gewicht</p>
                    <p>{attachment.gewicht} kg</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Werkdruk</p>
                    <p>{attachment.werkdruk} bar</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Max druk</p>
                    <p>{attachment.max_druk} bar</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">Debiet</p>
                    <p>{attachment.debiet} l/min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {/* Edit Attachment Dialog */}
        {editingAttachment && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Aanbouwdeel Bewerken: {editForm.naam}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                <div>
                  <Label htmlFor="edit-naam" className="text-sm sm:text-base">Naam</Label>
                  <Input
                    id="edit-naam"
                    value={editForm.naam || ''}
                    onChange={(e) => setEditForm({...editForm, naam: e.target.value})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-identificatienummer" className="text-sm sm:text-base">Identificatienummer</Label>
                  <Input
                    id="edit-identificatienummer"
                    value={editForm.identificatienummer || ''}
                    onChange={(e) => setEditForm({...editForm, identificatienummer: e.target.value})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type" className="text-sm sm:text-base">Type</Label>
                  <Input
                    id="edit-type"
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                    className="text-base"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <Label htmlFor="edit-beschrijving" className="text-sm sm:text-base">Beschrijving</Label>
                  <Textarea
                    id="edit-beschrijving"
                    value={editForm.beschrijving || ''}
                    onChange={(e) => setEditForm({...editForm, beschrijving: e.target.value})}
                    className="text-base"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-gewicht" className="text-sm sm:text-base">Gewicht (kg)</Label>
                  <Input
                    id="edit-gewicht"
                    inputMode="numeric"
                    value={editForm.gewicht || ''}
                    onChange={(e) => setEditForm({...editForm, gewicht: parseInt(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-werkdruk" className="text-sm sm:text-base">Werkdruk (bar)</Label>
                  <Input
                    id="edit-werkdruk"
                    inputMode="numeric"
                    value={editForm.werkdruk || ''}
                    onChange={(e) => setEditForm({...editForm, werkdruk: parseInt(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max_druk" className="text-sm sm:text-base">Max Druk (bar)</Label>
                  <Input
                    id="edit-max_druk"
                    inputMode="numeric"
                    value={editForm.max_druk || ''}
                    onChange={(e) => setEditForm({...editForm, max_druk: parseInt(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-debiet" className="text-sm sm:text-base">Debiet (l/min)</Label>
                  <Input
                    id="edit-debiet"
                    inputMode="numeric"
                    value={editForm.debiet || ''}
                    onChange={(e) => setEditForm({...editForm, debiet: parseInt(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-vermogen" className="text-sm sm:text-base">Vermogen (W)</Label>
                  <Input
                    id="edit-vermogen"
                    inputMode="numeric"
                    value={editForm.vermogen || ''}
                    onChange={(e) => setEditForm({...editForm, vermogen: parseInt(e.target.value) || 0})}
                    className="text-base"
                  />
                </div>

                {/* Image Upload Section for Edit */}
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-sm sm:text-base">Foto van het Aanbouwdeel</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label htmlFor="edit-attachment-image" className="flex-1">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center cursor-pointer hover:border-gray-400 transition-colors tap-target">
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                            <span className="text-xs sm:text-sm text-gray-600">
                              Klik om een nieuwe foto te selecteren
                            </span>
                            <span className="text-xs text-gray-400">
                              JPG, PNG (max 5MB)
                            </span>
                          </div>
                        </div>
                        <input
                          id="edit-attachment-image"
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
                          className="w-full h-40 sm:h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 tap-target"
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
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button variant="outline" onClick={cancelEditing} className="touch-btn">
                  Annuleren
                </Button>
                <Button onClick={saveAttachment} disabled={uploadingImage} className="touch-btn">
                  {uploadingImage ? 'Uploaden...' : 'Wijzigingen Opslaan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">QR-code voor {currentQrAttachment?.naam}</DialogTitle>
              <p className="text-sm text-gray-600">
                Scan deze QR-code om aanbouwdeel informatie te bekijken
              </p>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrCodeData && (
                <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200">
                  <Image
                    src={qrCodeData}
                    alt={`QR-code voor ${currentQrAttachment?.naam}`}
                    width={200}
                    height={200}
                    className="rounded w-48 h-48 sm:w-64 sm:h-64"
                  />
                </div>
              )}
              <div className="text-center">
                <p className="font-medium text-sm sm:text-base">{currentQrAttachment?.naam}</p>
                <p className="text-xs sm:text-sm text-gray-600">{currentQrAttachment?.type}</p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {currentQrAttachment?.aantal_slangen} slangen - {currentQrAttachment?.gewicht}kg
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => setQrDialogOpen(false)}
                  className="flex-1 touch-btn"
                >
                  Sluiten
                </Button>
                <Button 
                  onClick={downloadQRCodeFromDialog}
                  className="flex-1 touch-btn"
                >
                  Download PNG
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Connected Machines Dialog */}
        <Dialog open={machinesDialogOpen} onOpenChange={setMachinesDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-3xl">
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                  <Link className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Gekoppelde Machines</DialogTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedAttachmentMachines.length} machine{selectedAttachmentMachines.length !== 1 ? 's' : ''} gekoppeld aan dit aanbouwdeel
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {selectedAttachmentMachines.map((machine, index) => (
                <div key={machine.id} className="group">
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <Tractor className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{machine.naam}</h3>
                        <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          {machine.type}
                        </Badge>
                        {machine.kenteken && (
                          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                            {machine.kenteken}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                Alle koppelingen actief
              </div>
              <Button 
                onClick={() => setMachinesDialogOpen(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Sluiten
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default AttachmentsAdmin; 