import NfcStatus from '../components/NfcStatus';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <main className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Mechielsen NFC Monitor
        </h1>
        <NfcStatus />
      </main>
    </div>
  );
}