"use client";

import { Button, Feedback, Input, Row } from "@once-ui-system/core";
import { useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

export function RedeemForm({ onRedeemed }: { onRedeemed?: () => void }) {
  const { refresh } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string }>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setResult(undefined);
    try {
      const data = await api<{ days: number; memberUntil: string | null }>("/api/pay/redeem", {
        body: { code },
      });
      setCode("");
      setResult({
        ok: true,
        message: `兑换成功，增加 ${data.days} 天会员${data.memberUntil ? `，有效期至 ${formatDate(data.memberUntil)}` : ""}。`,
      });
      await refresh();
      onRedeemed?.();
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Row gap="8" vertical="start" fillWidth s={{ direction: "column" }}>
        <Input
          id="redeem-code"
          label="兑换码"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="secondary" size="l" loading={busy} disabled={!code.trim()}>
          兑换
        </Button>
      </Row>
      {result && (
        <Row paddingTop="12">
          <Feedback variant={result.ok ? "success" : "danger"} description={result.message} />
        </Row>
      )}
    </form>
  );
}
