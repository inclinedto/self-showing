"use client";

import { Button, Feedback, SegmentedControl, useToast } from "@once-ui-system/core";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { encode } from "uqr";
import { downloadBlob } from "@/lib/files";
import { contrastRatio, parseHex, relativeLuminance } from "@/lib/kit/color";
import {
  buildWifi,
  MAX_BYTES,
  pixelLayout,
  qrPath,
  qrSvg,
  type WifiSecurity,
} from "@/lib/kit/qrcode";
import { Check, ErrorText, Field, kit, Panel, Range, Select, TextArea, TextInput } from "../ui";
import styles from "./qrcode.module.scss";

type Mode = "text" | "wifi";
type Ecc = keyof typeof MAX_BYTES;
type Encoded =
  | { ok: true; size: number; version: number; data: boolean[][] }
  | { ok: false; error: string };

const ECC_OPTIONS: { value: Ecc; label: string }[] = [
  { value: "L", label: "L（可修复约 7%）" },
  { value: "M", label: "M（可修复约 15%）" },
  { value: "Q", label: "Q（可修复约 25%）" },
  { value: "H", label: "H（可修复约 30%）" },
];

const SECURITY_OPTIONS: { value: WifiSecurity; label: string }[] = [
  { value: "WPA", label: "WPA / WPA2 / WPA3" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "无密码" },
];

const DEFAULT_TEXT = "https://www.zhangjinshuai.buzz";
const encoder = new TextEncoder();

function encodeQr(content: string, ecc: Ecc, border: number): Encoded | null {
  if (!content) return null;
  try {
    const { size, version, data } = encode(content, { ecc, border });
    return { ok: true, size, version, data };
  } catch (error) {
    if (error instanceof URIError) {
      return { ok: false, error: "内容里有无法编码的字符（比如残缺的表情符号），删掉再试试" };
    }
    return {
      ok: false,
      error: `内容太长，二维码装不下了。容错等级 ${ecc} 最多约 ${MAX_BYTES[ecc]} 字节，可以调低容错等级或缩短内容`,
    };
  }
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className={styles.colorRow}>
        <input
          id={id}
          type="color"
          className={styles.picker}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{value.toUpperCase()}</span>
      </div>
    </Field>
  );
}

export default function QrcodeTool() {
  const { addToast } = useToast();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [security, setSecurity] = useState<WifiSecurity>("WPA");
  const [hidden, setHidden] = useState(false);
  const [ecc, setEcc] = useState<Ecc>("M");
  const [border, setBorder] = useState(2);
  const [fg, setFg] = useState("#0b3b4a");
  const [bg, setBg] = useState("#ffffff");
  const [exportSize, setExportSize] = useState(1024);

  const content =
    mode === "text" ? text : ssid ? buildWifi({ ssid, password, security, hidden }) : "";
  const deferredContent = useDeferredValue(content);
  const qr = useMemo(() => encodeQr(deferredContent, ecc, border), [deferredContent, ecc, border]);
  const path = useMemo(() => (qr?.ok ? qrPath(qr.data) : ""), [qr]);
  const bytes = useMemo(() => encoder.encode(content).length, [content]);

  const fgColor = parseHex(fg);
  const bgColor = parseHex(bg);
  const lowContrast = fgColor && bgColor ? contrastRatio(fgColor, bgColor) < 3 : false;
  const inverted =
    fgColor && bgColor ? relativeLuminance(fgColor) > relativeLuminance(bgColor) : false;
  const layout = qr?.ok ? pixelLayout(qr.size, exportSize) : null;
  const fileBase = mode === "wifi" ? "wifi-qrcode" : "qrcode";

  const downloadPng = () => {
    if (!qr?.ok || !layout) return;
    const canvas = document.createElement("canvas");
    canvas.width = exportSize;
    canvas.height = exportSize;
    const context = canvas.getContext("2d");
    if (!context) {
      addToast({ variant: "danger", message: "浏览器不支持导出 PNG，请改用 SVG" });
      return;
    }
    context.imageSmoothingEnabled = false;
    context.fillStyle = bg;
    context.fillRect(0, 0, exportSize, exportSize);
    context.fillStyle = fg;
    const { moduleSize, offset } = layout;
    qr.data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark)
          context.fillRect(
            offset + x * moduleSize,
            offset + y * moduleSize,
            moduleSize,
            moduleSize,
          );
      });
    });
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${fileBase}.png`);
      else addToast({ variant: "danger", message: "导出 PNG 失败，请改用 SVG" });
    }, "image/png");
  };

  const downloadSvg = () => {
    if (!qr?.ok) return;
    const svg = qrSvg(qr.data, { foreground: fg, background: bg, size: exportSize });
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileBase}.svg`);
  };

  return (
    <div className={kit.grid2}>
      <div className={kit.stack}>
        <Panel title="内容">
          <SegmentedControl
            selected={mode}
            onToggle={(value) => setMode(value as Mode)}
            buttons={[
              { value: "text", label: "文本 / 网址", prefixIcon: "documentText" },
              { value: "wifi", label: "Wi-Fi", prefixIcon: "lock" },
            ]}
          />
          {mode === "text" ? (
            <TextArea
              label="文本或网址"
              rows={5}
              value={text}
              onChange={setText}
              placeholder="输入网址、文字都可以，中文也没问题"
            />
          ) : (
            <>
              <TextInput
                label="网络名称（SSID）"
                value={ssid}
                onChange={setSsid}
                placeholder="例如 Summer-WiFi"
                autoComplete="off"
              />
              <div className={kit.grid2}>
                <TextInput
                  label="密码"
                  value={security === "nopass" ? "" : password}
                  onChange={setPassword}
                  disabled={security === "nopass"}
                  placeholder={security === "nopass" ? "开放网络不需要密码" : "Wi-Fi 密码"}
                  autoComplete="off"
                />
                <Select
                  label="加密方式"
                  value={security}
                  onChange={setSecurity}
                  options={SECURITY_OPTIONS}
                />
              </div>
              <Check label="隐藏网络" checked={hidden} onChange={setHidden} />
              <span className={kit.hint}>
                手机相机扫一扫就能连上这个 Wi-Fi。密码只在本机生成二维码，不会上传。
              </span>
              {content && <pre className={kit.output}>{content}</pre>}
            </>
          )}
        </Panel>

        <Panel title="样式">
          <Select label="容错等级" value={ecc} onChange={setEcc} options={ECC_OPTIONS} />
          <Range label="边距" value={border} onChange={setBorder} min={0} max={8} suffix=" 格" />
          <div className={kit.grid2}>
            <ColorPicker label="前景色" value={fg} onChange={setFg} />
            <ColorPicker label="背景色" value={bg} onChange={setBg} />
          </div>
          {lowContrast && <Feedback variant="warning" description="颜色对比太低，可能扫不出来" />}
          {inverted && !lowContrast && (
            <span className={kit.hint}>前景比背景浅（反色二维码），有些扫码软件会识别不了。</span>
          )}
          <Range
            label="导出尺寸"
            value={exportSize}
            onChange={setExportSize}
            min={256}
            max={2048}
            step={64}
            suffix=" px"
          />
        </Panel>
      </div>

      <Panel
        title="预览"
        actions={
          <>
            <Button
              size="s"
              variant="primary"
              prefixIcon="download"
              disabled={!qr?.ok}
              onClick={downloadPng}
            >
              下载 PNG
            </Button>
            <Button
              size="s"
              variant="secondary"
              prefixIcon="download"
              disabled={!qr?.ok}
              onClick={downloadSvg}
            >
              下载 SVG
            </Button>
          </>
        }
      >
        {qr?.ok ? (
          <div className={styles.card}>
            <svg
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              role="img"
              aria-label="二维码预览"
              shapeRendering="crispEdges"
            >
              <rect width={qr.size} height={qr.size} fill={bg} />
              <path d={path} fill={fg} />
            </svg>
          </div>
        ) : qr ? (
          <ErrorText>{qr.error}</ErrorText>
        ) : (
          <p className={kit.empty}>
            {mode === "text" ? "输入内容后这里会出现二维码" : "填写网络名称后生成 Wi-Fi 二维码"}
          </p>
        )}
        <span className={kit.hint}>
          内容 {bytes} 字节
          {qr?.ok && `，版本 ${qr.version}（${qr.size - border * 2}×${qr.size - border * 2} 格）`}
          {layout && `；PNG 为 ${exportSize}×${exportSize} 像素，每格 ${layout.moduleSize} 像素`}
        </span>
      </Panel>
    </div>
  );
}
