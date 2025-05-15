import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const steps = [
  {
    description: "Lees de instructies en zorg voor een veilige werkplek.",
    nfc_required: false,
  },
  {
    description: "Sluit de aanvoerslang aan op de linkerkant van de kraan.",
    imageUrl: "/images/aanvoerslang.jpg",
    nfc_required: false,
  },
  {
    description: "Sluit de retourslang aan op de rechterkant van de kraan.",
    imageUrl: "/images/retourslang.jpg",
    nfc_required: false,
  },
  {
    description: "Scan de NFC-tag van de slang om te controleren.",
    nfc_required: true,
    nfc_position: "SUPPLY_LEFT"
  }
];
