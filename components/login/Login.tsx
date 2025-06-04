'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, Building } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

export default function Login() {
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Handle email confirmation and other URL parameters
  useEffect(() => {
    const handleUrlParams = () => {
      try {
        // Use window.location.search instead of searchParams if available
        const urlParams = new URLSearchParams(window.location.search);
        
        const confirmed = urlParams.get('confirmed');
        const message = urlParams.get('message');
        const reset = urlParams.get('reset');
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        if (confirmed === 'true') {
          toast.success('Je account is succesvol bevestigd! Je kunt nu inloggen.');
          
          // Clean up URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        } else if (message === 'check-email') {
          toast.info('Controleer je e-mail voor een bevestigingslink.');
          
          // Clean up URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        } else if (reset === 'true' && accessToken && refreshToken && router) {
          // Handle password reset - redirect to dedicated reset password page
          router.push(`/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`);
        }
      } catch (error) {
        console.error('Error handling URL parameters:', error);
      }
    };

    // Run on mount
    handleUrlParams();
  }, []); // Empty dependency array to run only once on mount

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Bevestig eerst je e-mailadres voordat je inlogt.');
        } else {
          toast.error(`Inloggen mislukt: ${error.message}`);
        }
        return;
      }

      if (!data?.session) {
        toast.error('Geen sessie ontvangen.');
        return;
      }

      toast.success('Succesvol ingelogd!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Inloggen mislukt. Probeer het later opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });

      if (error) {
        toast.error(`Wachtwoord reset mislukt: ${error.message}`);
        return;
      }

      toast.success('Wachtwoord reset e-mail verzonden! Controleer je inbox.');
      setShowResetDialog(false);
      setResetEmail('');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Er is een fout opgetreden. Probeer het later opnieuw.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Mechielsen</CardTitle>
          <CardDescription className="text-gray-600">
            Hydraulische Machines & Installaties
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mailadres
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="voorbeeld@mechielsen.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Wachtwoord
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              disabled={loading}
            >
              {loading ? 'Inloggen...' : 'Inloggen'}
            </Button>
            
            <div className="text-center">
              <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-sm text-blue-600 hover:text-blue-700">
                    Wachtwoord vergeten?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Wachtwoord Resetten</DialogTitle>
                    <DialogDescription>
                      Voer je e-mailadres in om een wachtwoord reset link te ontvangen.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">E-mailadres</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="je@voorbeeld.nl"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        disabled={resetLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowResetDialog(false)}
                        disabled={resetLoading}
                        className="flex-1"
                      >
                        Annuleren
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={resetLoading}
                        className="flex-1"
                      >
                        {resetLoading ? 'Verzenden...' : 'Reset Link Verzenden'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Nog geen account?</span>
              </div>
            </div>
            
            <div className="text-center">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  Account Aanmaken
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 