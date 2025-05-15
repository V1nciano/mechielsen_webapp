import { use } from "react";
import InstallationStepper from '@/components/installation/InstallationStepper';

export default function InstallationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InstallationStepper installationId={id} />;
}
