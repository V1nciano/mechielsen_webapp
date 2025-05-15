import React, { useEffect, useState } from 'react';
import MachineList, { Machine } from './MachineList';
import AttachmentList, { Attachment } from './AttachmentList';

export default function MachineAttachmentFlow() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all machines from API or Supabase
    fetch('/api/machines')
      .then(res => res.json())
      .then(data => {
        setMachines(data);
        setLoading(false);
      });
  }, []);

  const handleSelectMachine = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId) || null;
    setSelectedMachine(machine);
    setLoading(true);
    // Fetch attachments for this machine
    fetch(`/api/attachments?machineId=${machineId}`)
      .then(res => res.json())
      .then(data => {
        setAttachments(data);
        setLoading(false);
      });
  };

  if (loading) return <div>Loading...</div>;

  if (!selectedMachine) {
    return <MachineList machines={machines} onSelect={handleSelectMachine} />;
  }

  return <AttachmentList attachments={attachments} />;
} 