import { requireAdmin } from "@/lib/server/auth";
import { query } from "@/lib/server/db";
import { HttpError, json, readJson, route } from "@/lib/server/http";
import { randomCode } from "@/lib/server/password";

type Row = {
  code: string;
  days: number;
  note: string | null;
  created_at: Date;
  used_at: Date | null;
  used_by_name: string | null;
};

export const GET = route(async (request) => {
  await requireAdmin(request);
  const rows = await query<Row>(
    `SELECT redeem_codes.code, redeem_codes.days, redeem_codes.note, redeem_codes.created_at,
       redeem_codes.used_at, users.username AS used_by_name
     FROM redeem_codes LEFT JOIN users ON users.id = redeem_codes.used_by
     ORDER BY redeem_codes.created_at DESC, redeem_codes.code LIMIT 300`,
  );
  return json({
    codes: rows.map((row) => ({
      code: row.code,
      days: row.days,
      note: row.note,
      createdAt: new Date(row.created_at).toISOString(),
      usedAt: row.used_at ? new Date(row.used_at).toISOString() : null,
      usedBy: row.used_by_name,
    })),
  });
});

export const POST = route(async (request) => {
  await requireAdmin(request);
  const body = await readJson(request);
  const days = Number(body.days);
  const count = Number(body.count);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 100) : "";
  if (!Number.isInteger(days) || days < 1 || days > 3660) {
    throw new HttpError(400, "天数需为 1–3660 的整数。", "invalid");
  }
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    throw new HttpError(400, "一次最多生成 200 个兑换码。", "invalid");
  }

  const codes = Array.from({ length: count }, () => randomCode());
  const rows = await query<{ code: string }>(
    `INSERT INTO redeem_codes (code, days, note)
     SELECT code, $2, $3 FROM unnest($1::text[]) AS code
     ON CONFLICT (code) DO NOTHING RETURNING code`,
    [codes, days, note || null],
  );
  return json({ codes: rows.map((row) => row.code), days }, { status: 201 });
});
