"use client";

import { Fragment } from "react";
import { Text } from "@once-ui-system/core";

const INLINE = /(\*\*[^*]+\*\*|\[\d+(?:\s*[,，、]\s*\d+)*\])/g;

type AnswerTextProps = {
  text: string;
  knownIds: Set<number>;
  activeId?: number;
  onCite: (id: number) => void;
};

/** Minimal renderer for model answers: line breaks, **bold**, and clickable [n] citations. */
export function AnswerText({ text, knownIds, activeId, onCite }: AnswerTextProps) {
  return (
    <Text variant="body-default-m" style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
      {text.split(INLINE).map((part, index) => {
        const key = `${index}-${part.slice(0, 8)}`;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={key}>{part.slice(2, -2)}</strong>;
        }
        const citation = part.match(/^\[(\d+(?:\s*[,，、]\s*\d+)*)\]$/);
        if (citation) {
          return (
            <Fragment key={key}>
              {citation[1].split(/[,，、]/).map((raw) => {
                const id = Number(raw.trim());
                const known = knownIds.has(id);
                return (
                  <button
                    key={`${key}-${id}`}
                    type="button"
                    onClick={() => known && onCite(id)}
                    title={known ? `查看来源 [${id}]` : "引用了不存在的片段"}
                    style={{
                      font: "inherit",
                      fontSize: "0.75em",
                      verticalAlign: "super",
                      lineHeight: 1,
                      margin: "0 1px",
                      padding: "1px 5px",
                      borderRadius: "999px",
                      border: "1px solid var(--brand-alpha-medium)",
                      cursor: known ? "pointer" : "not-allowed",
                      background:
                        activeId === id
                          ? "var(--brand-solid-strong)"
                          : known
                            ? "var(--brand-alpha-weak)"
                            : "var(--danger-alpha-weak)",
                      color:
                        activeId === id
                          ? "var(--brand-on-solid-strong)"
                          : "var(--brand-on-background-strong)",
                    }}
                  >
                    {id}
                  </button>
                );
              })}
            </Fragment>
          );
        }
        return <Fragment key={key}>{part}</Fragment>;
      })}
    </Text>
  );
}
