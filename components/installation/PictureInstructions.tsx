'use client';

export default function PictureInstructions({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold mb-2">Afbeelding</h2>
      <img src={imageUrl} alt="Instructie afbeelding" className="rounded shadow" />
    </div>
  );
} 