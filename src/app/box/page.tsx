import { pageMetadata } from "@/lib/metadata";
import { BoxView } from "./BoxView";

export const metadata = pageMetadata({
  title: "提问箱",
  description: "匿名向站长提问。站长回答后，公开的问题会展示在提问箱里。",
  path: "/box",
});

export default function BoxPage() {
  return <BoxView />;
}
