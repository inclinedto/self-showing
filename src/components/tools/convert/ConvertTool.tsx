"use client";

import { Column, Heading, Icon, Row, SegmentedControl, Text } from "@once-ui-system/core";
import { useState } from "react";
import { ImageConvertPanel, ImagesToPdfPanel } from "./ImagePanels";
import { PdfMergePanel, PdfSplitPanel, PdfToImagesPanel } from "./PdfPanels";

const MODES = [
  { value: "image", label: "图片转换压缩", icon: "image", panel: ImageConvertPanel },
  { value: "images-pdf", label: "图片转 PDF", icon: "documentText", panel: ImagesToPdfPanel },
  { value: "pdf-images", label: "PDF 转图片", icon: "image", panel: PdfToImagesPanel },
  { value: "merge", label: "PDF 合并", icon: "documents", panel: PdfMergePanel },
  { value: "split", label: "PDF 拆分", icon: "scissors", panel: PdfSplitPanel },
] as const;

type Mode = (typeof MODES)[number]["value"];

export function ConvertTool() {
  const [mode, setMode] = useState<Mode>("image");
  const Panel = MODES.find((item) => item.value === mode)?.panel ?? ImageConvertPanel;

  return (
    <Column fillWidth gap="24">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-s">
          格式转换
        </Heading>
        <Text onBackground="neutral-weak" variant="body-default-l">
          图片转换压缩、图片转 PDF、PDF 转图片、PDF 合并与拆分。免费、不限次数。
        </Text>
        <Row gap="8" vertical="center">
          <Icon name="shield" size="xs" onBackground="brand-medium" />
          <Text variant="body-default-xs" onBackground="neutral-weak">
            所有处理都在你的浏览器里完成，文件不会上传到服务器。
          </Text>
        </Row>
      </Column>
      <SegmentedControl
        selected={mode}
        onToggle={(value) => setMode(value as Mode)}
        buttons={MODES.map((item) => ({ value: item.value, label: item.label, prefixIcon: item.icon }))}
      />
      <Panel key={mode} />
    </Column>
  );
}
