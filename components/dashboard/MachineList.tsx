import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export interface Machine {
  id: string;
  naam: string;
  beschrijving: string;
  type: string;
  afbeelding?: string;
}

export interface MachineListProps {
  machines: Machine[];
  onSelect?: (machineId: string) => void;
}

export default function MachineList({ machines, onSelect }: MachineListProps) {
  const router = useRouter();

  const handleSelect = (machineId: string) => {
    if (onSelect) {
      onSelect(machineId);
    } else {
      router.push(`/dashboard/machines/${machineId}/attachments`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Kies een machine</h1>
      <ul>
        {machines.map((machine) => (
          <li
            key={machine.id}
            className="mb-4 border p-4 rounded cursor-pointer hover:bg-gray-100"
            onClick={() => handleSelect(machine.id)}
          >
            <div className="font-semibold">{machine.naam}</div>
            <div className="text-sm text-gray-600">{machine.beschrijving}</div>
            {machine.afbeelding && (
              <Image
                src={machine.afbeelding}
                alt={machine.naam}
                width={300}
                height={200}
                className="my-2"
                style={{ objectFit: 'contain' }}
                priority
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="text-xs text-gray-400">Type: {machine.type}</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 