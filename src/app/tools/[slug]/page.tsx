import { notFound } from "next/navigation";
import { KitShell } from "@/components/kit/KitShell";
import { KitToolView } from "@/components/kit/KitToolView";
import { pageMetadata } from "@/lib/metadata";
import { getKitTool, kitTools } from "@/resources/kit";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return kitTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: Params) {
  const tool = getKitTool((await params).slug);
  if (!tool) return {};
  return pageMetadata({ title: tool.name, description: `${tool.summary}。在浏览器本地运行，免费不限次。`, path: `/tools/${tool.slug}` });
}

export default async function KitToolPage({ params }: Params) {
  const tool = getKitTool((await params).slug);
  if (!tool) notFound();
  return (
    <KitShell tool={tool}>
      <KitToolView slug={tool.slug} />
    </KitShell>
  );
}
