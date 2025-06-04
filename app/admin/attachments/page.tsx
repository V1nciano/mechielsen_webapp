import { Suspense } from 'react';
import AttachmentsAdmin from '@/components/admin/AttachmentsAdmin';

function AttachmentsAdminPageContent() {
  return <AttachmentsAdmin />;
}

export default function AdminAttachmentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Laden...</p>
        </div>
      </div>
    }>
      <AttachmentsAdminPageContent />
    </Suspense>
  );
} 