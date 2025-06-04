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
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import qrcode from 'qrcode-generator';

interface AttachmentSlang {
  id: string;
  attachment_id: string;
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
  machines?: Machine[];
  hydraulic_hoses?: AttachmentSlang[];
  imageFile?: File;
}

interface Machine {
  id: string;
  naam: string;
  type: string;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [currentQrAttachment, setCurrentQrAttachment] = useState<Attachment | null>(null);
  const [newAttachment, setNewAttachment] = useState<Partial<Attachment>>({
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
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();

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

  const fetchAttachmentsAndMachines = async () => {
    try {
      // Try to fetch attachments with hydraulic hoses relation
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
        
        // Fallback: try simpler query without relations
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('attachments')
          .select('*')
          .order('created_at', { ascending: true });

        if (fallbackError) {
          toast.error('Database fout: ' + fallbackError.message);
          return;
        }

        // Manually fetch hydraulic hoses for each attachment
        const attachmentsWithHoses = await Promise.all(
          (fallbackData || []).map(async (attachment) => {
            const { data: hoses } = await supabase
              .from('attachment_hydraulic_hoses')
              .select('*')
              .eq('attachment_id', attachment.id)
              .order('volgorde', { ascending: true });

            return {
              ...attachment,
              hydraulic_hoses: hoses || []
            };
          })
        );

        setAttachments(attachmentsWithHoses);
      } else {
        if (!attachmentsData || attachmentsData.length === 0) {
          setAttachments([]);
        } else {
          setAttachments(attachmentsData);
        }
      }

      // Fetch machines
      const { data: machinesData, error: machinesError } = await supabase
        .from('machines')
        .select('id, naam, type')
        .order('naam', { ascending: true });

      if (machinesError) {
        toast.error('Fout bij ophalen machines: ' + machinesError.message);
        return;
      }

      setMachines(machinesData || []);
    } catch {
      toast.error('Er is een fout opgetreden');
    }
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
        const uploadedUrl = await uploadAttachmentImage(editForm.imageFile, editingAttachment);
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
        afbeelding: imageUrl
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
          aantal_slangen: newAttachment.aantal_slangen
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

      // Create machine connections if any were selected
      if (selectedMachines.length > 0) {
        const connections = selectedMachines.map(machineId => ({
          machine_id: machineId,
          attachment_id: attachmentData.id
        }));

        const { error: connectionsError } = await supabase
          .from('attachment_machines')
          .insert(connections);

        if (connectionsError) {
          toast.error('Aanbouwdeel toegevoegd, maar fout bij koppelen machines: ' + connectionsError.message);
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
      setSelectedMachines([]);
      setImagePreview(null);
      fetchAttachmentsAndMachines();
    } catch {
      toast.error('Er is een fout opgetreden bij het toevoegen');
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

  const handleMachineSelection = (machineId: string, checked: boolean) => {
    if (checked) {
      setSelectedMachines([...selectedMachines, machineId]);
    } else {
      setSelectedMachines(selectedMachines.filter(id => id !== machineId));
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

  const updateHoseColor = async (hoseId: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('attachment_hydraulic_hoses')
        .update({ kleur: newColor })
        .eq('id', hoseId);

      if (error) {
        toast.error('Fout bij wijzigen kleur: ' + error.message);
        return;
      }

      toast.success('Kleur succesvol gewijzigd!');
      fetchAttachmentsAndMachines();
    } catch {
      toast.error('Er is een fout opgetreden bij het wijzigen');
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
          
          <div className="flex items-center gap-4">
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
                            {machine.naam} ({machine.type})
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
                                  {Array.from({ length: 2 }, (_, index) => {
                                    const kleur = index === 0 ? 'rood' : 'blauw';
                                    const kleurInfo = SLANG_KLEUREN.find(k => k.value === kleur);
                                    
                                    return (
                                      <div key={index} className={`w-4 h-4 rounded-full ${kleurInfo?.color} border`} 
                                           title={`Input ${index + 1} - ${kleur}`}>
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
                      inputMode="numeric"
                      value={newAttachment.gewicht || 0}
                      onChange={(e) => setNewAttachment({...newAttachment, gewicht: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="werkdruk">Werkdruk (bar)</Label>
                    <Input
                      id="werkdruk"
                      inputMode="numeric"
                      value={newAttachment.werkdruk || 0}
                      onChange={(e) => setNewAttachment({...newAttachment, werkdruk: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_druk">Max Druk (bar)</Label>
                    <Input
                      id="max_druk"
                      inputMode="numeric"
                      value={newAttachment.max_druk || 0}
                      onChange={(e) => setNewAttachment({...newAttachment, max_druk: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="debiet">Debiet (l/min)</Label>
                    <Input
                      id="debiet"
                      inputMode="numeric"
                      value={newAttachment.debiet || 0}
                      onChange={(e) => setNewAttachment({...newAttachment, debiet: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vermogen">Vermogen (W)</Label>
                    <Input
                      id="vermogen"
                      inputMode="numeric"
                      value={newAttachment.vermogen || 0}
                      onChange={(e) => setNewAttachment({...newAttachment, vermogen: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="aantal_slangen">Aantal Slangen</Label>
                    <Input
                      id="aantal_slangen"
                      inputMode="numeric"
                      value={newAttachment.aantal_slangen || 2}
                      onChange={(e) => setNewAttachment({...newAttachment, aantal_slangen: parseInt(e.target.value) || 2})}
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div className="col-span-2">
                    <Label>Foto van het Aanbouwdeel</Label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label htmlFor="attachment-image" className="flex-1">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="w-8 h-8 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Klik om een foto te selecteren
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
                            className="absolute top-2 right-2"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{attachment.naam}</span>
                  <div className="flex gap-2">
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
                  <div className="relative">
                    <Image
                      src={attachment.afbeelding}
                      alt={attachment.naam}
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div>
                  <Label>Type</Label>
                  <p className="text-sm text-gray-600">{attachment.type}</p>
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
                    <Label>Slangen ({attachment.aantal_slangen || 2})</Label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-1" />
                          Kleuren
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Slang Kleuren voor {attachment.naam}</DialogTitle>
                          <p className="text-sm text-gray-600">Wijzig de kleuren van elke slang</p>
                        </DialogHeader>
                        
                        {/* Color Configuration */}
                        <div className="space-y-4">
                          {attachment.hydraulic_hoses?.map((hose) => (
                            <div key={hose.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                              <div className="flex items-center gap-4">
                                {getKleurDisplay(hose.kleur)}
                                <div>
                                  <p className="font-medium">Slang {hose.volgorde}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={hose.kleur} 
                                  onValueChange={(value) => updateHoseColor(hose.id, value)}
                                >
                                  <SelectTrigger className="w-40">
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
                        
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">💡 Kleuren wijzigen:</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Selecteer voor elke slang de gewenste kleur. Dit helpt bij het herkennen tijdens installatie.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Visual display of slangen */}
                  <div className="mt-2">
                    {attachment.hydraulic_hoses && attachment.hydraulic_hoses.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {attachment.hydraulic_hoses.map((slang) => (
                            <div key={slang.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                              {getKleurDisplay(slang.kleur)}
                              <div className="flex-1">
                                <span className="text-sm font-semibold">Slang #{slang.volgorde}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Quick visual overview */}
                        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                          <span className="text-xs font-medium text-gray-700">Quick view:</span>
                          <div className="flex gap-1">
                            {attachment.hydraulic_hoses.map((slang) => {
                              const kleurInfo = SLANG_KLEUREN.find(k => k.value === slang.kleur);
                              return (
                                <div key={slang.id} 
                                     className={`w-6 h-6 rounded-full ${kleurInfo?.color} flex items-center justify-center border-2 border-white shadow-sm`}
                                     title={`Slang ${slang.volgorde} - ${slang.kleur}`}>
                                  <span className={`text-xs font-bold ${kleurInfo?.textColor}`}>
                                    {slang.volgorde}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">⚠️ Geen slangen geconfigureerd</p>
                        <p className="text-xs text-yellow-600">Slangen worden automatisch aangemaakt bij toevoegen</p>
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

        {/* Edit Attachment Dialog */}
        {editingAttachment && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Aanbouwdeel Bewerken: {editForm.naam}</DialogTitle>
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
                  <Label htmlFor="edit-vermogen">Vermogen (W)</Label>
                  <Input
                    id="edit-vermogen"
                    inputMode="numeric"
                    value={editForm.vermogen || ''}
                    onChange={(e) => setEditForm({...editForm, vermogen: parseInt(e.target.value) || 0})}
                  />
                </div>

                {/* Image Upload Section for Edit */}
                <div className="col-span-2">
                  <Label>Foto van het Aanbouwdeel</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label htmlFor="edit-attachment-image" className="flex-1">
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
                <Button onClick={saveAttachment} disabled={uploadingImage}>
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
              <DialogTitle>QR-code voor {currentQrAttachment?.naam}</DialogTitle>
              <p className="text-sm text-gray-600">
                Scan deze QR-code om aanbouwdeel informatie te bekijken
              </p>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4">
              {qrCodeData && (
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <Image
                    src={qrCodeData}
                    alt={`QR-code voor ${currentQrAttachment?.naam}`}
                    width={250}
                    height={250}
                    className="rounded"
                  />
                </div>
              )}
              <div className="text-center">
                <p className="font-medium">{currentQrAttachment?.naam}</p>
                <p className="text-sm text-gray-600">{currentQrAttachment?.type}</p>
                <p className="text-sm text-gray-600">
                  {currentQrAttachment?.aantal_slangen} slangen - {currentQrAttachment?.gewicht}kg
                </p>
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