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

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

  const fetchAttachmentsAndMachines = useCallback(async () => {
    try {
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select(`
          *,
          hydraulic_hoses:attachment_hydraulic_hoses(
            id,
            kleur,
            volgorde
          )
        `)
        .order('created_at', { ascending: true });

      if (attachmentsError) {
        toast.error('Fout bij ophalen aanbouwdelen: ' + attachmentsError.message);
        return;
      }

      setAttachments(attachmentsData || []);
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error('Error fetching attachments:', error);
      toast.error('Er is een fout opgetreden bij het ophalen van de data');
    }
  }, [supabase]);

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

      await fetchAttachmentsAndMachines();
    } catch {
      toast.error('Er is een fout opgetreden');
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, supabase]);

  useEffect(() => {
    checkAdminAndFetchData();
  }, [checkAdminAndFetchData]);

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
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Aanbouwdelen Beheren</h1>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Nieuw Aanbouwdeel
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-lg sm:text-xl">Nieuw Aanbouwdeel Toevoegen</DialogTitle>
                <p className="text-sm text-gray-600">Vul de onderstaande gegevens in om een nieuw aanbouwdeel toe te voegen.</p>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="naam" className="text-sm sm:text-base">Naam</Label>
                  <Input
                    id="naam"
                    value={newAttachment.naam || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, naam: e.target.value})}
                    className="w-full text-base"
                    placeholder="Voer de naam in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="identificatienummer" className="text-sm sm:text-base">Identificatienummer</Label>
                  <Input
                    id="identificatienummer"
                    value={newAttachment.identificatienummer || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, identificatienummer: e.target.value})}
                    className="w-full text-base"
                    placeholder="Voer het identificatienummer in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-sm sm:text-base">Type</Label>
                  <Input
                    id="type"
                    value={newAttachment.type || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, type: e.target.value})}
                    className="w-full text-base"
                    placeholder="Voer het type in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aantal_slangen" className="text-sm sm:text-base">Aantal Slangen</Label>
                  <Input
                    id="aantal_slangen"
                    type="number"
                    value={newAttachment.aantal_slangen || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, aantal_slangen: parseInt(e.target.value) || 0})}
                    className="w-full text-base"
                    min="0"
                    placeholder="Voer het aantal slangen in"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <Label htmlFor="beschrijving" className="text-sm sm:text-base">Beschrijving</Label>
                  <Textarea
                    id="beschrijving"
                    value={newAttachment.beschrijving || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, beschrijving: e.target.value})}
                    className="w-full min-h-[100px] text-base"
                    placeholder="Voer een beschrijving in"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gewicht" className="text-sm sm:text-base">Gewicht (kg)</Label>
                  <Input
                    id="gewicht"
                    type="number"
                    value={newAttachment.gewicht || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, gewicht: parseInt(e.target.value) || 0})}
                    className="w-full text-base"
                    min="0"
                    placeholder="Voer het gewicht in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="werkdruk" className="text-sm sm:text-base">Werkdruk (bar)</Label>
                  <Input
                    id="werkdruk"
                    type="number"
                    value={newAttachment.werkdruk || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, werkdruk: parseInt(e.target.value) || 0})}
                    className="w-full text-base"
                    min="0"
                    placeholder="Voer de werkdruk in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max_druk" className="text-sm sm:text-base">Max Druk (bar)</Label>
                  <Input
                    id="max_druk"
                    type="number"
                    value={newAttachment.max_druk || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, max_druk: parseInt(e.target.value) || 0})}
                    className="w-full text-base"
                    min="0"
                    placeholder="Voer de maximale druk in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="debiet" className="text-sm sm:text-base">Debiet (l/min)</Label>
                  <Input
                    id="debiet"
                    type="number"
                    value={newAttachment.debiet || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, debiet: parseInt(e.target.value) || 0})}
                    className="w-full text-base"
                    min="0"
                    placeholder="Voer het debiet in"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vermogen" className="text-sm sm:text-base">Vermogen (kW)</Label>
                  <Input
                    id="vermogen"
                    type="number"
                    value={newAttachment.vermogen || ''}
                    onChange={(e) => setNewAttachment({...newAttachment, vermogen: parseInt(e.target.value) || 0})}
                    className="w-full text-base"
                    min="0"
                    placeholder="Voer het vermogen in"
                  />
                </div>

                {/* Image Upload Section */}
                <div className="col-span-1 sm:col-span-2 space-y-3">
                  <Label className="text-sm sm:text-base">Foto van het Aanbouwdeel</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label htmlFor="attachment-image" className="flex-1">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors min-h-[120px] flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Tik om een foto te selecteren
                            </span>
                            <span className="text-xs text-gray-400">
                              JPG, PNG (max 5MB)
                            </span>
                          </div>
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
                          className="absolute top-2 right-2 h-8 w-8 p-0"
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
              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setAddDialogOpen(false)} 
                  className="w-full sm:w-auto h-11 text-base"
                >
                  Annuleren
                </Button>
                <Button 
                  onClick={addNewAttachment} 
                  className="w-full sm:w-auto h-11 text-base"
                >
                  Aanbouwdeel Toevoegen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="truncate font-semibold">{attachment.naam}</span>
                    {attachment.identificatienummer && (
                      <span className="text-xs text-gray-500">ID: {attachment.identificatienummer}</span>
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
                
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="secondary">{attachment.type}</Badge>
                  </div>
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

        {attachments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Nog geen aanbouwdelen toegevoegd</p>
            <p className="text-sm text-gray-400 mt-2">
              Klik op &apos;Nieuw Aanbouwdeel&apos; om te beginnen
            </p>
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
      </div>
    </div>
  );
}

export default AttachmentsAdmin; 