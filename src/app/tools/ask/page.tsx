import { RequireLogin } from "@/components/session/RequireLogin";
import { AskTool } from "@/components/tools/AskTool";
import { pageMetadata } from "@/lib/metadata";
import { getTool } from "@/resources/site";

const tool = getTool("ask");

export const metadata = pageMetadata({ title: tool.name, description: tool.description, path: tool.path });

export default function AskPage() {
  return (
    <RequireLogin allowDemoGuest description="登录后即可使用文档问答，免费用户每天也有额度。">
      <AskTool />
    </RequireLogin>
  );
}
