import { RequireLogin } from "@/components/session/RequireLogin";
import { ExtractTool } from "@/components/tools/ExtractTool";
import { pageMetadata } from "@/lib/metadata";
import { getTool } from "@/resources/site";

const tool = getTool("extract");

export const metadata = pageMetadata({ title: tool.name, description: tool.description, path: tool.path });

export default function ExtractPage() {
  return (
    <RequireLogin allowDemoGuest description="登录后即可使用表格提取，免费用户每天也有额度。">
      <ExtractTool />
    </RequireLogin>
  );
}
