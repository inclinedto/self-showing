import { pageMetadata } from "@/lib/metadata";
import { PricingView } from "./PricingView";

export const metadata = pageMetadata({
  title: "会员",
  description: "免费用户每天都有额度，会员可以获得更多 AI 工具和社区额度。",
  path: "/pricing",
});

export default function PricingPage() {
  return <PricingView />;
}
