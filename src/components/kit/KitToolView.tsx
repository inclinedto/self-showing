"use client";

import dynamic from "next/dynamic";
import { Loading } from "@/components/ui/Notice";

const loading = () => <Loading />;

// Each tool is its own chunk so a page only loads the code (and libraries) it needs.
const TOOLS: Record<string, React.ComponentType> = {
  wordcount: dynamic(() => import("./tools/wordcount"), { loading }),
  diff: dynamic(() => import("./tools/diff"), { loading }),
  encode: dynamic(() => import("./tools/encode"), { loading }),
  daxie: dynamic(() => import("./tools/daxie"), { loading }),
  json: dynamic(() => import("./tools/json"), { loading }),
  timestamp: dynamic(() => import("./tools/timestamp"), { loading }),
  regex: dynamic(() => import("./tools/regex"), { loading }),
  hash: dynamic(() => import("./tools/hash"), { loading }),
  radix: dynamic(() => import("./tools/radix"), { loading }),
  password: dynamic(() => import("./tools/password"), { loading }),
  qrcode: dynamic(() => import("./tools/qrcode"), { loading }),
  grid: dynamic(() => import("./tools/grid"), { loading }),
  watermark: dynamic(() => import("./tools/watermark"), { loading }),
  color: dynamic(() => import("./tools/color"), { loading }),
  datecalc: dynamic(() => import("./tools/datecalc"), { loading }),
  unit: dynamic(() => import("./tools/unit"), { loading }),
  loan: dynamic(() => import("./tools/loan"), { loading }),
  decide: dynamic(() => import("./tools/decide"), { loading }),
};

export function KitToolView({ slug }: { slug: string }) {
  const Tool = TOOLS[slug];
  return Tool ? <Tool /> : null;
}
