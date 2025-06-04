'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Machine {
  id: string;
  naam: string;
  type: string;
  hydraulische_inputs?: number;
  aansluiting_type?: string;
  layout_beschrijving?: string;
}

interface VentielData {
  id: string;
  ventiel_nummer: string;
  functie_naam: string;
  positie: 'voor' | 'achter';
  ventiel_type: 'enkel' | 'dubbelwerkend' | 'powerBeyond';
  omschrijving?: string;
  kleur_code?: string;
  poort_a_label: string;
  poort_b_label: string;
  volgorde: number;
  actief: boolean;
}

interface Ventiel {
  id: string;
  ventiel_nummer: string;
  functie_naam: string;
  positie: 'voor' | 'achter';
  ventiel_type: 'enkel' | 'dubbelwerkend' | 'powerBeyond';
  omschrijving?: string;
  kleur_code?: string;
  poort_a_label: string;
  poort_b_label: string;
  volgorde: number;
}

const KLEUREN = [
  { value: 'blauw', label: 'Blauw', color: 'bg-blue-500' },
  { value: 'rood', label: 'Rood', color: 'bg-red-500' },
  { value: 'geel', label: 'Geel', color: 'bg-yellow-400' },
  { value: 'groen', label: 'Groen', color: 'bg-green-500' },
  { value: 'zwart', label: 'Zwart', color: 'bg-black' },
  { value: 'wit', label: 'Wit', color: 'bg-white border border-gray-300' },
  { value: 'oranje', label: 'Oranje', color: 'bg-orange-500' },
  { value: 'paars', label: 'Paars', color: 'bg-purple-500' }
];

function VentielenViewPageContent() {
  const [loading, setLoading] = useState(true);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [ventielen, setVentielen] = useState<Ventiel[]>([]);
  const [ventielenVoor, setVentielenVoor] = useState<Ventiel[]>([]);
  const [ventielenAchter, setVentielenAchter] = useState<Ventiel[]>([]);
  
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();
  const machineId = params.machineId as string;

  const fetchData = useCallback(async () => {
    try {
      // Check authentication
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        router.push('/login');
        return;
      }

      // Fetch machine info
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('id, naam, type, hydraulische_inputs, aansluiting_type, layout_beschrijving')
        .eq('id', machineId)
        .single();

      if (machineError) {
        console.error('Error fetching machine:', machineError);
        router.push('/dashboard');
        return;
      }

      setMachine(machineData);

      // Fetch ventielen for this machine via API
      const ventielenResponse = await fetch(`/api/machine-ventielen?machineId=${machineId}`);
      if (ventielenResponse.ok) {
        const ventielenData: VentielData[] = await ventielenResponse.json();
        // Filter for active ventielen only
        const allVentielen = (ventielenData || []).filter((v) => v.actief);
        setVentielen(allVentielen);
        setVentielenVoor(allVentielen.filter((v) => v.positie === 'voor'));
        setVentielenAchter(allVentielen.filter((v) => v.positie === 'achter'));
      } else {
        console.error('Error fetching ventielen:', await ventielenResponse.text());
        setVentielen([]);
      }

    } catch (error) {
      console.error('Error:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [machineId, router, supabase.auth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getKleurBadge = (kleurCode?: string) => {
    const kleur = KLEUREN.find(k => k.value === kleurCode);
    if (!kleur) return <Circle className="w-4 h-4 text-gray-400" />;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full ${kleur.color}`}></div>
        <span className="text-sm font-medium">{kleur.label}</span>
      </div>
    );
  };

  const getVentielTypeLabel = (type: string) => {
    switch (type) {
      case 'dubbelwerkend': return 'Dubbelwerkend (DW)';
      case 'enkel': return 'Enkelwerkend';
      case 'powerBeyond': return 'Power Beyond';
      default: return type;
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

  if (!machine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Machine niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Ventielen Overzicht</h1>
            <p className="text-gray-600">{machine.naam} ({machine.type})</p>
          </div>
        </div>

        {/* Machine Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Machine Specificaties
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Hydraulische Inputs</p>
              <p className="text-lg">{machine.hydraulische_inputs || 'Niet ingesteld'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Aansluiting Type</p>
              <p className="text-lg">{machine.aansluiting_type || 'Niet ingesteld'}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Layout</p>
              <p className="text-sm text-gray-600">{machine.layout_beschrijving || 'Geen beschrijving'}</p>
            </div>
          </CardContent>
        </Card>

        {ventielen.length > 0 ? (
          <>
            {/* Ventielen Achterzijde */}
            {ventielenAchter.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Achterzijde Ventielen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {ventielenAchter.map((ventiel) => (
                    <Card key={ventiel.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                          <Badge variant="outline" className="text-sm">
                            {ventiel.ventiel_nummer}
                          </Badge>
                          {getKleurBadge(ventiel.kleur_code)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-medium text-gray-900">{ventiel.functie_naam}</p>
                          <p className="text-sm text-gray-600">{getVentielTypeLabel(ventiel.ventiel_type)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="font-medium">Poort {ventiel.poort_a_label}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="font-medium">Poort {ventiel.poort_b_label}</p>
                          </div>
                        </div>

                        {ventiel.omschrijving && (
                          <div>
                            <p className="text-xs text-gray-500">{ventiel.omschrijving}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Ventielen Voorzijde */}
            {ventielenVoor.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Voorzijde Ventielen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {ventielenVoor.map((ventiel) => (
                    <Card key={ventiel.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                          <Badge variant="outline" className="text-sm">
                            {ventiel.ventiel_nummer}
                          </Badge>
                          {getKleurBadge(ventiel.kleur_code)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="font-medium text-gray-900">{ventiel.functie_naam}</p>
                          <p className="text-sm text-gray-600">{getVentielTypeLabel(ventiel.ventiel_type)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="font-medium">Poort {ventiel.poort_a_label}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <p className="font-medium">Poort {ventiel.poort_b_label}</p>
                          </div>
                        </div>

                        {ventiel.omschrijving && (
                          <div>
                            <p className="text-xs text-gray-500">{ventiel.omschrijving}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Instructies */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Hoe te gebruiken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Ventiel Types:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><strong>Dubbelwerkend (DW):</strong> Heeft twee poorten (A & B) voor heen- en terugbeweging</li>
                    <li><strong>Enkelwerkend:</strong> Heeft één poort voor beweging, terugkeer door veer of gewicht</li>
                    <li><strong>Power Beyond:</strong> Voor doorvoer van hydraulische stroom naar volgende ventiel</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Kleurcodering:</h4>
                  <p className="text-sm text-gray-600">
                    Elke ventiel heeft een kleurcode die overeenkomt met de slangkleuren of stickers voor eenvoudige herkenning.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Geen ventielen geconfigureerd</p>
              <p className="text-sm text-gray-400 mt-2">
                De ventielenconfiguratie voor deze machine is nog niet ingesteld.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function VentielenViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    }>
      <VentielenViewPageContent />
    </Suspense>
  );
} 