'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First check if the Flask server is running
      const serverResponse = await fetch('http://localhost:5000/');
      if (!serverResponse.ok) {
        throw new Error('Flask server is niet gestart');
      }

      // Then attempt to login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      if (!data?.session) {
        throw new Error('Geen sessie ontvangen');
      }

      toast.success('Succesvol ingelogd!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Flask server')) {
          toast.error('Flask server is niet gestart. Start de server en probeer opnieuw.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.');
        } else {
          toast.error(`Inloggen mislukt: ${error.message}`);
        }
      } else {
        toast.error('Inloggen mislukt. Probeer het later opnieuw.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Mechielsen</CardTitle>
          <CardDescription className="text-center">
            Log in om toegang te krijgen tot het systeem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
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
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Inloggen...' : 'Inloggen'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}