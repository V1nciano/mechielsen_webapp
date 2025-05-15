'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AttachmentList from '@/components/dashboard/AttachmentList';
import type { Attachment } from '@/components/dashboard/AttachmentList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AttachmentsPage() {
  const params = useParams();
  const machineId = params?.machineId as string;
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!machineId) return;
    fetch(`/api/attachments?machineId=${machineId}`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          setAttachments([]);
          return;
        }
        setAttachments(data);
        setLoading(false);
      });
  }, [machineId]);

  if (loading) return <div>Loading attachments...</div>;

  return (
    <div>
      <AttachmentList
        attachments={attachments}
        backButton={
          <div className="flex justify-center mb-8">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4" /> Terug naar dashboard
            </Button>
          </div>
        }
      />
    </div>
  );
}