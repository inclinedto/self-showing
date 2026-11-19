"use client";

import { Button, Column, Dialog, Feedback, Text, useToast } from "@once-ui-system/core";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/community";
import styles from "./community.module.scss";

type Props = {
  target: { type: "post" | "comment" | "question"; id: number } | null;
  onClose: () => void;
};

export function ReportDialog({ target, onClose }: Props) {
  const { addToast } = useToast();
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const close = () => {
    setError(undefined);
    onClose();
  };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    setError(undefined);
    try {
      await api("/api/report", { body: { ...target, reason } });
      addToast({ variant: "success", message: "已收到举报，感谢你帮忙维护社区" });
      close();
    } catch (reportError) {
      setError(errorMessage(reportError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      isOpen={target !== null}
      onClose={close}
      title="举报内容"
      description="被多人举报的内容会先自动隐藏，等站长审核。"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            取消
          </Button>
          <Button variant="danger" onClick={submit} loading={busy}>
            提交举报
          </Button>
        </>
      }
    >
      <Column gap="12">
        <fieldset className={styles.reasons} style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="visually-hidden">举报原因</legend>
          {REPORT_REASONS.map((item) => (
            <label key={item} className={styles.reason}>
              <input
                type="radio"
                name="report-reason"
                value={item}
                checked={reason === item}
                onChange={() => setReason(item)}
              />
              <Text variant="body-default-s">{item}</Text>
            </label>
          ))}
        </fieldset>
        {error && <Feedback variant="danger" description={error} />}
      </Column>
    </Dialog>
  );
}
