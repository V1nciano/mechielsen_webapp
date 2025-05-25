'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Settings, LogOut } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@supabase/auth-helpers-nextjs';

interface ExtendedMachine {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  afbeelding?: string;
  kenteken?: string;
  hydraulische_inputs?: number;
  gewicht?: number;
  werkdruk?: number;
  max_druk?: number;
  debiet?: number;
  vermogen?: number;
}

export default function DashboardPage() {
  const [machines, setMachines] = useState<ExtendedMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<ExtendedMachine | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const qrRef = React.useRef<SVGSVGElement | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Dashboard: Starting session check...');
        
        // Try to get session multiple times if needed
        let session = null;
        let authError = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`🔍 Dashboard: Session attempt ${attempt}/3`);
          
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionData?.session) {
            session = sessionData.session;
            authError = null;
            console.log(`✅ Dashboard: Session found on attempt ${attempt}`);
            break;
          }
          
          if (sessionError) {
            console.log(`❌ Dashboard: Session error on attempt ${attempt}:`, sessionError);
            authError = sessionError;
          }
          
          if (attempt < 3) {
            console.log('⏳ Dashboard: Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (authError || !session) {
          console.log('❌ Dashboard: No valid session after 3 attempts, redirecting to login');
          console.log('Last error:', authError);
          
          // Clear any bad session data
          await supabase.auth.signOut();
          router.push('/login');
          return;
        }

        console.log('✅ Dashboard: Valid session found for:', session.user.email);
        setUser(session.user);

        // Check admin status - EMAIL CHECK FIRST!
        console.log('🔍 Checking if email contains admin:', session.user.email);
        
        if (session.user.email?.includes('admin')) {
          console.log('🎉 EMAIL ADMIN DETECTED! Setting admin status...');
          setIsAdmin(true);
          
          // Try to update database profile
          try {
            const { error } = await supabase
              .from('user_profiles')
              .upsert({ user_id: session.user.id, role: 'admin' });
            
            if (error) {
              console.log('Could not update profile:', error);
            } else {
              console.log('✅ Database profile updated to admin');
            }
          } catch (error) {
            console.log('Profile update error:', error);
          }
        } else {
          // Fallback: check database for admin role
          try {
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (profile && profile.role === 'admin') {
              console.log('🎉 Database admin found!');
              setIsAdmin(true);
            } else {
              console.log('No admin role found in database');
            }

            if (profileError) {
              console.log('Profile query error:', profileError);
            }
          } catch (error) {
            console.log('Admin check error:', error);
          }
        }

        // Fetch machines
        const response = await fetch('/api/machines');
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setMachines(data);
        } else {
          setMachines([]);
          console.error('Error fetching machines:', data?.error || data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setMachines([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  const handleShowQR = (machine: ExtendedMachine) => {
    setSelectedMachine(machine);
    setQrDialogOpen(true);
  };

  const handleSelectMachine = (machine: ExtendedMachine) => {
    router.push(`/dashboard/machines/${machine.id}/attachments`);
  };

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Hydraulische Machines Mechielsen</h1>
            {user && (
              <p className="text-gray-600 mt-1">Welkom {user.email}</p>
            )}
            {/* Debug info */}
            <p className="text-xs text-gray-400">
              Admin status: {isAdmin ? 'Admin ✅' : 'Regular User'} | User ID: {user?.id?.slice(0, 8)}...
            </p>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  console.log('🚀 Admin button clicked! Current session:', user?.email);
                  console.log('🚀 About to navigate to /admin...');
                  // Pass admin status via URL parameter as workaround
                  router.push(`/admin?verified=true&email=${encodeURIComponent(user?.email || '')}`);
                }}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Uitloggen
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Card
              key={machine.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectMachine(machine)}
            >
              <CardHeader>
                {machine.afbeelding && (
                  <Image
                    src={`/images/${machine.afbeelding}`}
                    alt={machine.naam}
                    width={400}
                    height={192}
                    className="w-full h-48 object-contain mb-4 rounded"
                    style={{ objectFit: 'contain' }}
                    priority
                  />
                )}
                <CardTitle>{machine.naam}</CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <span>{machine.type}</span>
                  {machine.kenteken && (
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {machine.kenteken}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{machine.beschrijving}</p>
                {machine.hydraulische_inputs && (
                  <p className="text-xs text-gray-500 mb-2">
                    {machine.hydraulische_inputs} hydraulische inputs
                  </p>
                )}
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={e => {
                    e.stopPropagation();
                    handleShowQR(machine);
                  }}
                >
                  Toon QR-code
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogTitle>QR Code voor {selectedMachine?.naam}</DialogTitle>
          <div className="flex flex-col items-center gap-4">
            {selectedMachine && (
              <QRCodeSVG
                ref={qrRef}
                value={`${window.location.origin}/dashboard/machines/${selectedMachine.id}/attachments`}
                size={256}
                level="H"
                includeMargin={true}
              />
            )}
            <Button onClick={handleDownloadQR}>Download QR Code</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 