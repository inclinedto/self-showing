import { Suspense } from "react";
import { Loading } from "@/components/ui/Notice";
import { pageMetadata } from "@/lib/metadata";
import { TreeholeFeed } from "./TreeholeFeed";

export const metadata = pageMetadata({
  title: "树洞",
  description: "匿名说说心里话。开心、难过、焦虑都可以说，用 #标签 找到同频的人，也可以给别人一个抱抱。",
  path: "/treehole",
});

export default function TreeholePage() {
  return (
    <Suspense fallback={<Loading />}>
      <TreeholeFeed />
    </Suspense>
  );
}
