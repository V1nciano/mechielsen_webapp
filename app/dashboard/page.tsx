'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Machine {
  id: string;
  name: string;
  description: string;
  image: string;
  type: string;
}

export default function DashboardPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
    };

    const fetchMachines = async () => {
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('*');

        if (error) throw error;

        setMachines(data || []);
      } catch (error) {
        console.error('Fout bij ophalen machines:', error);
        toast.error('Fout bij ophalen machines');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    fetchMachines();
  }, [router, supabase]);

  const handleMachineSelect = (machine: Machine) => {
    router.push(`/installation/${machine.id}`);
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
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Kies een machine</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <Card key={machine.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{machine.name}</CardTitle>
                <CardDescription>{machine.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video mb-4">
                  <img
                    src={machine.image}
                    alt={machine.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleMachineSelect(machine)}
                >
                  Selecteer {machine.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 