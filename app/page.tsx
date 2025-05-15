"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 p-4">
      <div className="bg-white rounded-xl shadow-lg p-10 max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold mb-4 text-blue-800">Mechielsen Hydraulic Solutions</h1>
        <p className="text-gray-700 mb-8">
          Welkom bij het platform voor het veilig en efficiënt installeren van hydraulische slangen met NFC-technologie.
        </p>
        <Button
          className="w-full text-lg py-6 bg-blue-700 hover:bg-blue-800"
          onClick={() => router.push("/login")}
        >
          Inloggen
        </Button>
      </div>
    </div>
  );
}
