import { Suspense } from 'react';
import UsersAdmin from '@/components/admin/UsersAdmin';

function UsersAdminPageContent() {
  return <UsersAdmin />;
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    }>
      <UsersAdminPageContent />
    </Suspense>
  );
} 