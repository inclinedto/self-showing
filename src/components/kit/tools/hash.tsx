"use client";

import { hmac } from "@noble/hashes/hmac.js";
import { md5, sha1 } from "@noble/hashes/legacy.js";
import { sha256, sha384, sha512 } from "@noble/hashes/sha2.js";
import type { CHash } from "@noble/hashes/utils.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { Button, Feedback, SegmentedControl, Tag } from "@once-ui-system/core";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { formatBytes } from "@/lib/files";
import { Check, ErrorText, kit, Panel, ResultRow, Results, TextArea, TextInput } from "../ui";

type Mode = "text" | "file";
type Row = { name: string; hex: string };
type Job = {
  file: File;
  done: number;
  status: "hashing" | "done" | "cancelled" | "error";
  rows: Row[];
  error?: string;
};

const ALGORITHMS: { name: string; hash: CHash }[] = [
  { name: "MD5", hash: md5 },
  { name: "SHA-1", hash: sha1 },
  { name: "SHA-256", hash: sha256 },
  { name: "SHA-384", hash: sha384 },
  { name: "SHA-512", hash: sha512 },
];

const HMACS: { name: string; hash: CHash }[] = [
  { name: "HMAC-MD5", hash: md5 },
  { name: "HMAC-SHA256", hash: sha256 },
  { name: "HMAC-SHA512", hash: sha512 },
];

/** Hex lengths of each digest, used to hint at what a pasted hash probably is. */
const LENGTH_HINTS: Record<number, string> = {
  32: "MD5",
  40: "SHA-1",
  64: "SHA-256",
  96: "SHA-384",
  128: "SHA-512",
};

const CHUNK = 4 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const BIG_FILE = 2 * 1024 * 1024 * 1024;
const SAMPLE = "角度偏爱，夏天的海风很好闻。";

function formatSize(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : formatBytes(bytes);
}

function hashText(text: string, key: string): Row[] | null {
  if (!text) return [];
  const bytes = utf8ToBytes(text);
  if (bytes.length > MAX_TEXT_BYTES) return null;
  const rows = ALGORITHMS.map(({ name, hash }) => ({ name, hex: bytesToHex(hash(bytes)) }));
  if (key) {
    const keyBytes = utf8ToBytes(key);
    for (const { name, hash } of HMACS) {
      rows.push({ name, hex: bytesToHex(hmac(hash, keyBytes, bytes)) });
    }
  }
  return rows;
}

export default function HashTool() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [upper, setUpper] = useState(false);
  const [expected, setExpected] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const jobId = useRef(0);

  const deferredText = useDeferredValue(text);
  const deferredKey = useDeferredValue(key);
  const textRows = useMemo(() => hashText(deferredText, deferredKey), [deferredText, deferredKey]);

  useEffect(
    () => () => {
      jobId.current += 1;
    },
    [],
  );

  const hashFile = async (file: File) => {
    jobId.current += 1;
    const id = jobId.current;
    setJob({ file, done: 0, status: "hashing", rows: [] });
    const hashers = ALGORITHMS.map(({ hash }) => hash.create());
    try {
      for (let offset = 0; offset < file.size; offset += CHUNK) {
        const chunk = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
        if (jobId.current !== id) return;
        for (const hasher of hashers) hasher.update(chunk);
        const done = Math.min(file.size, offset + CHUNK);
        setJob((prev) => (prev && jobId.current === id ? { ...prev, done } : prev));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (jobId.current !== id) return;
      const rows = hashers.map((hasher, index) => ({
        name: ALGORITHMS[index].name,
        hex: bytesToHex(hasher.digest()),
      }));
      setJob({ file, done: file.size, status: "done", rows });
    } catch (error) {
      if (jobId.current !== id) return;
      const message = error instanceof Error ? error.message : String(error);
      setJob({ file, done: 0, status: "error", rows: [], error: `读取文件失败：${message}` });
    }
  };

  const cancel = () => {
    jobId.current += 1;
    setJob((prev) => prev && { ...prev, status: "cancelled" });
  };

  const rows = (mode === "text" ? textRows : job?.rows) ?? [];
  const show = (hex: string) => (upper ? hex.toUpperCase() : hex);

  const target = expected.replace(/\s+/g, "").toLowerCase();
  const match = target ? rows.find((row) => row.hex === target) : undefined;
  const guess = LENGTH_HINTS[target.length];

  const percent = job && job.file.size > 0 ? Math.floor((job.done / job.file.size) * 100) : 0;

  return (
    <div className={kit.stack}>
      <SegmentedControl
        selected={mode}
        onToggle={(value) => setMode(value as Mode)}
        buttons={[
          { value: "text", label: "文本", prefixIcon: "documentText" },
          { value: "file", label: "文件", prefixIcon: "document" },
        ]}
      />

      {mode === "text" ? (
        <div className={kit.grid2}>
          <Panel
            title="输入"
            actions={
              <Button size="s" variant="tertiary" onClick={() => setText(SAMPLE)}>
                填入示例
              </Button>
            }
          >
            <TextArea
              label="文本"
              rows={10}
              value={text}
              onChange={setText}
              placeholder="输入或粘贴要计算的文字，按 UTF-8 编码计算"
            />
            <TextInput
              label="HMAC 密钥（可选）"
              mono
              value={key}
              onChange={setKey}
              placeholder="不填就不算 HMAC"
              hint="填写后会额外算出 HMAC-MD5、HMAC-SHA256、HMAC-SHA512"
            />
          </Panel>
          <Panel title="结果" actions={<Check label="大写" checked={upper} onChange={setUpper} />}>
            {textRows === null ? (
              <ErrorText>文本超过 2 MB，请改用“文件”模式计算</ErrorText>
            ) : textRows.length > 0 ? (
              <Results>
                {textRows.map((row) => (
                  <ResultRow key={row.name} label={row.name} value={show(row.hex)} />
                ))}
              </Results>
            ) : (
              <p className={kit.empty}>输入文字后实时显示各种哈希值</p>
            )}
          </Panel>
        </div>
      ) : (
        <Panel title="文件" actions={<Check label="大写" checked={upper} onChange={setUpper} />}>
          <FileDrop
            accept="*/*"
            title="拖入文件，或点击选择"
            hint="任意类型、任意大小；文件只在本机读取，不会上传"
            onFiles={(files) => files[0] && hashFile(files[0])}
          />
          {job && (
            <div className={kit.stack}>
              <div className={kit.row}>
                <strong style={{ overflowWrap: "anywhere" }}>{job.file.name}</strong>
                <Tag size="s" variant="neutral">
                  {formatSize(job.file.size)}
                </Tag>
              </div>
              {job.file.size > BIG_FILE && (
                <Feedback
                  variant="warning"
                  description="文件超过 2 GB，在浏览器里计算会比较慢，可能要几分钟，期间请保持页面打开。"
                />
              )}
              {job.status === "hashing" && (
                <div className={kit.row}>
                  <progress
                    max={100}
                    value={percent}
                    aria-label="计算进度"
                    style={{ flex: 1, minWidth: 0, accentColor: "var(--brand-solid-strong)" }}
                  />
                  <span className={kit.hint}>
                    {percent}%（{formatSize(job.done)} / {formatSize(job.file.size)}）
                  </span>
                  <Button size="s" variant="secondary" prefixIcon="close" onClick={cancel}>
                    取消
                  </Button>
                </div>
              )}
              {job.status === "cancelled" && <p className={kit.hint}>已取消，可以重新选择文件。</p>}
              {job.error && <ErrorText>{job.error}</ErrorText>}
              {job.status === "done" && (
                <Results>
                  {job.rows.map((row) => (
                    <ResultRow key={row.name} label={row.name} value={show(row.hex)} />
                  ))}
                </Results>
              )}
            </div>
          )}
        </Panel>
      )}

      <Panel title="校验">
        <TextInput
          label="期望的哈希值"
          mono
          value={expected}
          onChange={setExpected}
          placeholder="把官网或别人给你的哈希值粘贴到这里"
          hint="不区分大小写，会自动去掉首尾空格"
        />
        {target && (
          <div className={kit.row} aria-live="polite">
            {rows.length === 0 ? (
              <span className={kit.hint}>
                {mode === "text" ? "先输入文本，" : "先选择文件并等计算完成，"}再来对比
              </span>
            ) : match ? (
              <Tag size="m" variant="success">
                ✓ 与 {match.name} 一致
              </Tag>
            ) : (
              <>
                <Tag size="m" variant="danger">
                  不匹配任何结果
                </Tag>
                {guess && (
                  <span className={kit.hint}>
                    这是 {target.length} 位，看起来像 {guess}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
