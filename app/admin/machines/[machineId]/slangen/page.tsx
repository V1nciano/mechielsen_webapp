import { Suspense } from 'react';
import SlangkoppelingConfig from '@/components/admin/SlangkoppelingConfig';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    machineId: string;
  }>;
}

async function SlangkoppelingPageContent({ params }: PageProps) {
  const { machineId } = await params;
  
  if (!machineId || typeof machineId !== 'string') {
    notFound();
  }

  return <SlangkoppelingConfig machineId={machineId} />;
}

export default function SlangkoppelingPage({ params }: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    }>
      <SlangkoppelingPageContent params={params} />
    </Suspense>
  );
} 