"use client";

import { Column, IconButton, ProgressBar, Row, Text } from "@once-ui-system/core";
import { formatBytes } from "@/lib/convert";
import styles from "./convert.module.scss";

export type QueuedFile = { id: string; file: File };

let counter = 0;
export const queueFiles = (files: File[]): QueuedFile[] =>
  files.map((file) => ({ id: `f${Date.now().toString(36)}${(counter++).toString(36)}`, file }));

export function FileQueue({
  items,
  onChange,
  disabled,
  reorder = true,
}: {
  items: QueuedFile[];
  onChange: (items: QueuedFile[]) => void;
  disabled?: boolean;
  reorder?: boolean;
}) {
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <ol className={styles.queue}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.queueItem}>
          <span className={styles.queueIndex}>{index + 1}</span>
          <span className={styles.queueName} title={item.file.name}>
            {item.file.name}
          </span>
          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: "nowrap" }}>
            {formatBytes(item.file.size)}
          </Text>
          {reorder && (
            <>
              <IconButton
                icon="arrowUp"
                size="s"
                variant="tertiary"
                aria-label={`上移 ${item.file.name}`}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              />
              <IconButton
                icon="arrowDown"
                size="s"
                variant="tertiary"
                aria-label={`下移 ${item.file.name}`}
                disabled={disabled || index === items.length - 1}
                onClick={() => move(index, 1)}
              />
            </>
          )}
          <IconButton
            icon="close"
            size="s"
            variant="tertiary"
            aria-label={`移除 ${item.file.name}`}
            disabled={disabled}
            onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
          />
        </li>
      ))}
    </ol>
  );
}

export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <Column gap="8">
      <ProgressBar value={total ? (done / total) * 100 : 0} label={false} />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {label} {done} / {total}
      </Text>
    </Column>
  );
}

export function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Row gap="12" vertical="center" wrap>
      <Text variant="label-default-s" style={{ minWidth: 72, whiteSpace: "nowrap" }}>
        {label}
      </Text>
      {children}
    </Row>
  );
}
