import { FlowBuilder } from "@/components/builder/FlowBuilder";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FlowBuilderPage({ params }: PageProps) {
  const { id } = await params;
  return <FlowBuilder flowId={id} />;
}
