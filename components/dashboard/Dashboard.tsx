'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
}

export default function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const qrRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        setError('Authenticatie fout: ' + authError.message);
        return;
      }

      if (!session) {
        console.log('No session found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('User authenticated:', session.user.id);
    };

    const fetchMachines = async () => {
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .order('naam', { ascending: true });

        if (error) {
          console.error('Error fetching machines:', error);
          setError('Fout bij ophalen machines: ' + error.message);
          return;
        }

        if (!data || data.length === 0) {
          console.log('No machines found');
          setMachines([]);
          return;
        }

        console.log('Fetched machines:', data);
        setMachines(data);
      } catch (error) {
        console.error('Error:', error);
        setError('Er is een onbekende fout opgetreden');
      } finally {
        setLoading(false);
      }
    };

    checkAuth().then(fetchMachines);
  }, [router, supabase]);

  const handleMachineSelect = async (machine: Machine) => {
    try {
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        setError('Authenticatie fout: ' + authError.message);
        return;
      }

      if (!session) {
        console.log('No session found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('Starting installation for machine:', machine.id);
      console.log('User ID:', session.user.id);
      
      // Create a new installation
      const { data: installation, error } = await supabase
        .from('gebruikers_installaties')
        .insert([
          {
            machine_id: machine.id,
            status: 'in_progress',
            created_at: new Date().toISOString(),
            user_id: session.user.id
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Detailed installation error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setError(`Installatie fout: ${error.message} (Code: ${error.code})`);
        return;
      }

      if (!installation) {
        console.error('No installation data returned');
        setError('Kon geen installatie aanmaken: Geen data ontvangen');
        return;
      }

      console.log('Installation created successfully:', installation);
      
      // Navigate to the installation page
      router.push(`/installation/${installation.id}`);
    } catch (error) {
      console.error('Unexpected error in handleMachineSelect:', error);
      setError('Er is een onverwachte fout opgetreden bij het starten van de installatie');
    }
  };

  // Download QR as PNG
  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const img = new window.Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngFile;
        downloadLink.download = `qr-${selectedMachine?.naam || 'machine'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgString)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Machines worden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Hydraulische Machines Mechielsen</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Card 
              key={machine.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleMachineSelect(machine)}
            >
              <CardHeader>
                <CardTitle>{machine.naam}</CardTitle>
                <CardDescription>{machine.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{machine.beschrijving}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div>
                    <p className="font-medium">Vermogen</p>
                    <p>{machine.vermogen} W</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMachine(machine);
                      setQrDialogOpen(true);
                    }}
                  >
                    Toon QR-code
                  </Button>
                  <Button 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMachineSelect(machine);
                    }}
                  >
                    Start Installatie
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogTitle>QR Code voor {selectedMachine?.naam}</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            <QRCodeSVG
              ref={qrRef}
              value={`${window.location.origin}/installation/${selectedMachine?.id}`}
              size={256}
              level="H"
              includeMargin={true}
            />
            <Button onClick={handleDownloadQR}>Download QR Code</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 