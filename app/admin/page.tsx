import { Suspense } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';

function AdminDashboardPageContent() {
  return <AdminDashboard />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    }>
      <AdminDashboardPageContent />
    </Suspense>
  );
} 