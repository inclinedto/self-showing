"use client";

import { useState } from "react";
import { Column, Icon, Text } from "@once-ui-system/core";
import styles from "./FileDrop.module.scss";

type FileDropProps = {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
};

/** A <label> wrapping a visually hidden file input, so click, keyboard and drag-and-drop all work. */
export function FileDrop({ accept, multiple, disabled, title, hint, onFiles }: FileDropProps) {
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <Column
      as="label"
      className={styles.zone}
      fillWidth
      center
      gap="8"
      paddingY="40"
      paddingX="24"
      radius="l"
      border={dragging ? "brand-medium" : "neutral-alpha-medium"}
      borderStyle="dashed"
      background={dragging ? "brand-alpha-weak" : "surface"}
      cursor={disabled ? undefined : "interactive"}
      style={{ opacity: disabled ? 0.6 : 1, transition: "background 0.2s" }}
      onDragOver={(event: React.DragEvent) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event: React.DragEvent) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) handle(event.dataTransfer.files);
      }}
    >
      <Icon name="upload" size="l" onBackground="brand-medium" />
      <Text variant="heading-strong-s" align="center">
        {title}
      </Text>
      <Text variant="body-default-s" onBackground="neutral-weak" align="center">
        {hint}
      </Text>
      <input
        className={styles.input}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          handle(event.target.files);
          event.target.value = "";
        }}
      />
    </Column>
  );
}
