"use client";

import { Button, SegmentedControl, Tag } from "@once-ui-system/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCharsets,
  charsetSize,
  DEFAULT_SYMBOLS,
  entropyBits,
  formatUuid,
  generatePassword,
  type RandomUint32,
  strength,
  uuidFromBytes,
} from "@/lib/kit/password";
import {
  Check,
  CopyButton,
  ErrorText,
  kit,
  Panel,
  Range,
  ResultRow,
  Results,
  TextInput,
} from "../ui";
import styles from "./password.module.scss";

type Mode = "password" | "uuid";

const STRENGTH_VARIANTS = ["danger", "warning", "info", "success"] as const;

/** crypto.getRandomValues, buffered so long batches don't call it per character. */
function cryptoRandom(): RandomUint32 {
  const pool = new Uint32Array(256);
  let index = pool.length;
  return () => {
    if (index >= pool.length) {
      crypto.getRandomValues(pool);
      index = 0;
    }
    const value = pool[index];
    index += 1;
    return value;
  };
}

function randomUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
}

function PasswordPanel() {
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [symbolSet, setSymbolSet] = useState(DEFAULT_SYMBOLS);
  const [passwords, setPasswords] = useState<string[]>([]);

  const sets = useMemo(
    () => buildCharsets({ upper, lower, digits, symbols, excludeAmbiguous, symbolSet }),
    [upper, lower, digits, symbols, excludeAmbiguous, symbolSet],
  );

  const regenerate = useCallback(() => {
    const random = cryptoRandom();
    setPasswords(Array.from({ length: count }, () => generatePassword(length, sets, random)));
  }, [count, length, sets]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const size = charsetSize(sets);
  const bits = entropyBits(length, size);
  const level = strength(bits);

  return (
    <div className={kit.grid2}>
      <Panel title="设置">
        <Range label="长度" value={length} onChange={setLength} min={4} max={64} suffix=" 位" />
        <div className={kit.row}>
          <Check label="大写字母" checked={upper} onChange={setUpper} />
          <Check label="小写字母" checked={lower} onChange={setLower} />
          <Check label="数字" checked={digits} onChange={setDigits} />
          <Check label="符号" checked={symbols} onChange={setSymbols} />
        </div>
        <Check label="排除易混淆字符" checked={excludeAmbiguous} onChange={setExcludeAmbiguous} />
        <span className={kit.hint}>{"排除后不会出现 0 O o 1 l I | ` ' \" 这些容易看错的字符"}</span>
        <TextInput
          label="自定义符号集"
          mono
          value={symbolSet}
          onChange={setSymbolSet}
          disabled={!symbols}
          hint="勾选“符号”时从这些字符里挑，有的网站不接受某些符号，可以在这里删掉"
        />
        <Range label="数量" value={count} onChange={setCount} min={1} max={50} suffix=" 个" />
      </Panel>

      <Panel
        title="结果"
        actions={
          <>
            <Button
              size="s"
              variant="secondary"
              prefixIcon="refresh"
              onClick={regenerate}
              disabled={!sets.length}
            >
              重新生成
            </Button>
            <CopyButton text={passwords.join("\n")} label="复制全部" />
          </>
        }
      >
        {sets.length === 0 ? (
          <ErrorText>至少选择一种字符（符号集也不能为空）</ErrorText>
        ) : (
          <>
            <div className={kit.row}>
              <span className={kit.label}>强度</span>
              <Tag size="s" variant={STRENGTH_VARIANTS[level.level]}>
                {level.label}
              </Tag>
              <span className={kit.hint}>
                约 {Math.round(bits)} 位熵（{length} 位 × log₂{size}）
              </span>
            </div>
            <div className={styles.meter} aria-hidden="true">
              <div
                className={styles.fill}
                data-level={level.level}
                style={{ width: `${Math.min(100, (bits / 128) * 100)}%` }}
              />
            </div>
            {passwords.length > 0 && (
              <Results>
                {passwords.map((password, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the list is regenerated as a whole, so position is the identity.
                  <ResultRow key={index} label={`密码 ${index + 1}`} value={password} />
                ))}
              </Results>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function UuidPanel() {
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(false);
  const [noHyphens, setNoHyphens] = useState(false);
  const [braces, setBraces] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);

  const regenerate = useCallback(() => {
    setUuids(Array.from({ length: count }, randomUuid));
  }, [count]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const output = uuids.map((uuid) => formatUuid(uuid, { upper, noHyphens, braces })).join("\n");

  return (
    <div className={kit.grid2}>
      <Panel title="设置">
        <Range label="数量" value={count} onChange={setCount} min={1} max={100} suffix=" 个" />
        <div className={kit.row}>
          <Check label="大写" checked={upper} onChange={setUpper} />
          <Check label="去掉连字符" checked={noHyphens} onChange={setNoHyphens} />
          <Check label="加花括号" checked={braces} onChange={setBraces} />
        </div>
        <span className={kit.hint}>生成的是随机 UUID（v4），重复的概率可以忽略不计。</span>
      </Panel>
      <Panel
        title="结果"
        actions={
          <>
            <Button size="s" variant="secondary" prefixIcon="refresh" onClick={regenerate}>
              重新生成
            </Button>
            <CopyButton text={output} label="复制全部" />
          </>
        }
      >
        {output ? (
          <pre className={kit.output}>{output}</pre>
        ) : (
          <p className={kit.empty}>正在生成…</p>
        )}
      </Panel>
    </div>
  );
}

export default function PasswordTool() {
  const [mode, setMode] = useState<Mode>("password");
  return (
    <div className={kit.stack}>
      <SegmentedControl
        selected={mode}
        onToggle={(value) => setMode(value as Mode)}
        buttons={[
          { value: "password", label: "密码", prefixIcon: "key" },
          { value: "uuid", label: "UUID", prefixIcon: "fingerprint" },
        ]}
      />
      {mode === "password" ? <PasswordPanel /> : <UuidPanel />}
      <span className={kit.hint}>全部用浏览器的安全随机数在本机生成，不会上传或保存。</span>
    </div>
  );
}
