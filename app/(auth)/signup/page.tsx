'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Building, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Wachtwoorden komen niet overeen.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Wachtwoord moet minimaal 6 tekens lang zijn.');
      setLoading(false);
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error('Volle naam is verplicht.');
      setLoading(false);
      return;
    }

    try {
      // Create account with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?confirmed=true`,
          data: {
            full_name: formData.fullName.trim(),
            display_name: formData.fullName.trim()
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Er bestaat al een account met dit e-mailadres.');
        } else if (error.message.includes('Password should be at least 6 characters')) {
          toast.error('Wachtwoord moet minimaal 6 tekens lang zijn.');
        } else {
          toast.error(`Account aanmaken mislukt: ${error.message}`);
        }
        return;
      }

      if (data?.user && !data.session) {
        // Email confirmation required
        toast.success('Account succesvol aangemaakt! Controleer je e-mail voor een bevestigingslink.');
        router.push('/login?message=check-email');
      } else if (data?.session) {
        // Auto-logged in (email confirmation disabled)
        toast.success('Account succesvol aangemaakt en ingelogd!');
        router.push('/dashboard');
      }

    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Account aanmaken mislukt. Probeer het later opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">Account Aanmaken</CardTitle>
          <CardDescription className="text-gray-600">
            Maak een account aan voor Mechielsen
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Volledige Naam
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jan de Vries"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mailadres
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jan@bedrijf.nl"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
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
                  placeholder="Minimaal 6 tekens"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bevestig Wachtwoord</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Herhaal je wachtwoord"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
              disabled={loading}
            >
              {loading ? 'Account Aanmaken...' : 'Account Aanmaken'}
            </Button>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <Link href="/login">
                <Button variant="link" className="text-sm text-blue-600 hover:text-blue-700">
                  Heb je al een account? Inloggen
                </Button>
              </Link>
            </div>
            
            <div className="text-center">
              <Link href="/login">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Terug naar Inloggen
                </Button>
              </Link>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Door een account aan te maken ga je akkoord met onze voorwaarden. 
            Je ontvangt een bevestigingsmail om je account te activeren.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 