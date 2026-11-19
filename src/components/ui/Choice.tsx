"use client";

import { useId } from "react";
import styles from "./Choice.module.scss";

/** A compact single-choice group built on native radio inputs. */
export function Choice<T extends string | number>({
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const group = useId();
  return (
    <fieldset className={styles.choices} disabled={disabled}>
      <legend className="visually-hidden">{name}</legend>
      {options.map((option) => (
        <label key={String(option.value)} className={styles.choice}>
          <input
            type="radio"
            name={group}
            className="visually-hidden"
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
