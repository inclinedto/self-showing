"use client";

import { Button, IconButton, useToast } from "@once-ui-system/core";
import classNames from "classnames";
import { useId } from "react";
import styles from "./kit.module.scss";

export { styles as kit };

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames(styles.panel, className)}>
      {(title || actions) && (
        <div className={styles.panelHead}>
          {title && <h2 className={styles.panelTitle}>{title}</h2>}
          {actions && <div className={styles.row}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

type AreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: string;
  onChange?: (value: string) => void;
  mono?: boolean;
};

export function TextArea({ label, hint, value, onChange, mono, rows = 8, className, ...rest }: AreaProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        rows={rows}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={classNames(styles.control, styles.area, mono && styles.mono, className)}
        {...rest}
      />
    </Field>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: string | number;
  onChange?: (value: string) => void;
  mono?: boolean;
};

export function TextInput({ label, hint, value, onChange, mono, className, type = "text", ...rest }: InputProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={classNames(styles.control, mono && styles.mono, className)}
        {...rest}
      />
    </Field>
  );
}

export function Select<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={styles.control}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function Range({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}: {
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className={styles.range}>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output htmlFor={id}>
          {value}
          {suffix}
        </output>
      </div>
    </Field>
  );
}

export function useCopy() {
  const { addToast } = useToast();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ variant: "success", message: "已复制" });
    } catch {
      addToast({ variant: "danger", message: "复制失败，请手动选择复制" });
    }
  };
}

export function CopyButton({ text, label = "复制", disabled }: { text: string; label?: string; disabled?: boolean }) {
  const copy = useCopy();
  return (
    <Button size="s" variant="secondary" prefixIcon="clipboard" disabled={disabled || !text} onClick={() => copy(text)}>
      {label}
    </Button>
  );
}

export function Results({ children }: { children: React.ReactNode }) {
  return <div className={styles.results}>{children}</div>;
}

/** One labelled value with a copy button; use inside <Results>. */
export function ResultRow({ label, value }: { label: React.ReactNode; value: string }) {
  const copy = useCopy();
  return (
    <div className={styles.result}>
      <span className={styles.resultLabel}>{label}</span>
      <span className={styles.resultValue}>{value || "—"}</span>
      <IconButton
        icon="clipboard"
        size="s"
        variant="tertiary"
        tooltip="复制"
        aria-label={typeof label === "string" ? `复制${label}` : "复制"}
        disabled={!value}
        onClick={() => copy(value)}
      />
    </div>
  );
}

/** `min` is the narrowest a tile may get, in px; raise it for long values such as timestamps. */
export function Stats({ children, min }: { children: React.ReactNode; min?: number }) {
  return (
    <div className={styles.stats} style={min ? ({ "--stat-min": `${min}px` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}
