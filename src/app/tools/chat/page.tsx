import { RequireLogin } from "@/components/session/RequireLogin";
import { ChatTool } from "@/components/tools/ChatTool";
import { pageMetadata } from "@/lib/metadata";
import { getTool } from "@/resources/site";

const tool = getTool("chat");

export const metadata = pageMetadata({ title: tool.name, description: tool.description, path: tool.path });

export default function ChatPage() {
  return (
    <RequireLogin allowDemoGuest description="登录后即可和 AI 小助手聊天，免费用户每天也有额度。">
      <ChatTool />
    </RequireLogin>
  );
}
