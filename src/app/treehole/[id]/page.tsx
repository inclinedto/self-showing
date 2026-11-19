import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { PostDetail } from "./PostDetail";

// Anonymous posts are personal; keep individual threads out of search engines.
export const metadata = pageMetadata({
  title: "树洞",
  description: "匿名树洞里的一条心事。",
  path: "/treehole",
  noIndex: true,
});

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId < 1) notFound();
  return <PostDetail id={postId} />;
}
