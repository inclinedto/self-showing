import { ConvertTool } from "@/components/tools/convert/ConvertTool";
import { pageMetadata } from "@/lib/metadata";
import { getTool } from "@/resources/site";

const tool = getTool("convert");

export const metadata = pageMetadata({ title: tool.name, description: tool.description, path: tool.path });

export default function ConvertPage() {
  return <ConvertTool />;
}
