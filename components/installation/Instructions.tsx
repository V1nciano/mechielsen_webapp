'use client';

export default function Instructions({ description }: { description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2">Instructies</h2>
      <p>{description}</p>
    </div>
  );
} 