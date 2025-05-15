'use client';
import Image from 'next/image';

interface PictureInstructionsProps {
  imageUrl: string;
}

export default function PictureInstructions({ imageUrl }: PictureInstructionsProps) {
  return (
    <div className="relative w-full aspect-video">
      <Image
        src={imageUrl}
        alt="Installatie instructie"
        fill
        className="object-contain rounded-lg"
        priority
      />
    </div>
  );
} 