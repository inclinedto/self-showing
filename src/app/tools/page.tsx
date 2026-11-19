import { Column } from "@once-ui-system/core";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/metadata";
import { kitTools } from "@/resources/kit";
import { tools } from "@/resources/site";
import { ToolsDirectory, ToolsDirectoryFromParams } from "./ToolsDirectory";

export const metadata = pageMetadata({
  title: "全部工具",
  description: `表格提取、文档问答、AI 小助手、格式转换，以及二维码、九宫格切图、JSON 格式化、房贷计算等 ${kitTools.length} 个免费小工具。`,
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <Column fillWidth>
      <PageHeader
        icon="grid"
        title="工具箱"
        description={`${tools.length + kitTools.length} 个小工具 🧰 AI 工具每天有免费额度，其余全部在你的浏览器里运行，文件不上传，免费不限次。`}
      />
      <Suspense fallback={<ToolsDirectory />}>
        <ToolsDirectoryFromParams />
      </Suspense>
    </Column>
  );
}
