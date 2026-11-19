import { LIMITS } from "@/lib/community";
import { checkContent, extraBlockedWords } from "@/lib/moderation";
import type { CommentItem, PostItem, QuestionItem } from "@/lib/types";
import { HttpError } from "./http";

export type PostRow = {
  id: number;
  user_id: number;
  alias: string;
  mood: string | null;
  content: string;
  status: PostItem["status"];
  like_count: number;
  comment_count: number;
  report_count: number;
  created_at: Date;
  liked?: boolean;
};

export type CommentRow = {
  id: number;
  post_id: number;
  user_id: number;
  alias: string;
  is_author: boolean;
  content: string;
  status: string;
  report_count: number;
  created_at: Date;
};

export type QuestionRow = {
  id: number;
  user_id: number | null;
  content: string;
  is_public: boolean;
  status: QuestionItem["status"];
  answer: string | null;
  answered_at: Date | null;
  created_at: Date;
};

export const POST_COLUMNS =
  "posts.id, posts.user_id, posts.alias, posts.mood, posts.content, posts.status, posts.like_count, posts.comment_count, posts.report_count, posts.created_at";

export const QUESTION_COLUMNS =
  "id, user_id, content, is_public, status, answer, answered_at, created_at";

const iso = (value: Date) => new Date(value).toISOString();

export function toPostItem(row: PostRow, viewerId: number | null): PostItem {
  return {
    id: row.id,
    alias: row.alias,
    mood: row.mood,
    content: row.content,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: iso(row.created_at),
    liked: Boolean(row.liked),
    mine: viewerId !== null && row.user_id === viewerId,
    status: row.status,
  };
}

export function toCommentItem(row: CommentRow, viewerId: number | null): CommentItem {
  return {
    id: row.id,
    alias: row.alias,
    isAuthor: row.is_author,
    content: row.content,
    createdAt: iso(row.created_at),
    mine: viewerId !== null && row.user_id === viewerId,
  };
}

export function toQuestionItem(row: QuestionRow): QuestionItem {
  return {
    id: row.id,
    content: row.content,
    answer: row.answer,
    answeredAt: row.answered_at ? iso(row.answered_at) : null,
    createdAt: iso(row.created_at),
    isPublic: row.is_public,
    status: row.status,
  };
}

/** Validates length and runs the content rules; returns whether to show crisis resources. */
export function acceptText(value: unknown, kind: keyof typeof LIMITS, name: string): { text: string; crisis: boolean } {
  const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
  const { min, max } = LIMITS[kind];
  if (text.length < min) throw new HttpError(400, `${name}至少要 ${min} 个字。`, "invalid");
  if (text.length > max) throw new HttpError(400, `${name}最多 ${max} 个字。`, "invalid");
  const check = checkContent(text, extraBlockedWords());
  if (!check.ok) throw new HttpError(400, check.reason, "content_rejected");
  return { text: text.replace(/\n{3,}/g, "\n\n"), crisis: check.crisis };
}
