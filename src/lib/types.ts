import type { Quotas } from "@/resources/plans";

export type ExtractedTable = {
  id: string;
  title: string;
  /** Where the table came from, e.g. "第 3 页" or "第 2-3 页". */
  source: string;
  headers: string[];
  rows: string[][];
};

export type ExtractMode = "tables" | "fields";

export type ExtractResponse = {
  tables: Omit<ExtractedTable, "id" | "source">[];
  demo?: boolean;
};

export type Excerpt = {
  id: number;
  label: string;
  text: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ClaimVerdict = "supported" | "partial" | "unsupported";

export type VerifiedClaim = {
  claim: string;
  citations: number[];
  verdict: ClaimVerdict;
  reason: string;
};

export type VerifyResponse = {
  claims: VerifiedClaim[];
  demo?: boolean;
};

export type SessionUser = {
  id: number;
  username: string;
  isAdmin: boolean;
  isMember: boolean;
  memberUntil: string | null;
  createdAt: string;
  quotas: Quotas;
  usage: Partial<Quotas>;
};

export type SiteStatus = {
  /** Accounts and community need a database. */
  db: boolean;
  /** False while no AI key is configured and the tools return sample output. */
  ai: boolean;
  payments: boolean;
  inviteRequired: boolean;
};

export type MeResponse = { user: SessionUser | null; status: SiteStatus };

export type PostStatus = "visible" | "hidden" | "deleted";

export type PostItem = {
  id: number;
  alias: string;
  mood: string | null;
  content: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  liked: boolean;
  mine: boolean;
  status: PostStatus;
};

export type CommentItem = {
  id: number;
  alias: string;
  isAuthor: boolean;
  content: string;
  createdAt: string;
  mine: boolean;
};

export type QuestionStatus = "pending" | "answered" | "hidden";

export type QuestionItem = {
  id: number;
  content: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  isPublic: boolean;
  status: QuestionStatus;
};

export type OrderStatus = "pending" | "paid" | "cancelled";

export type OrderItem = {
  id: string;
  planId: string;
  planName: string;
  days: number;
  amountCents: number;
  provider: "afdian" | "redeem" | "manual";
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
};
