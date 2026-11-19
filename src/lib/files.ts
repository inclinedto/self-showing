"use client";

import { zipSync } from "fflate";

// Kept free of lazy `import()`s: code-split tool chunks that pull those in make Turbopack request chunks it never emits.

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "file";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Stored (uncompressed) zip; images are already compressed, so deflating them again only costs time. */
export function zipFiles(files: { name: string; data: Uint8Array }[]): Blob {
  const used = new Set<string>();
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    let name = file.name;
    for (let suffix = 2; used.has(name); suffix++) {
      name = file.name.replace(/(\.[^.]+)?$/, `-${suffix}$1`);
    }
    used.add(name);
    entries[name] = file.data;
  }
  return new Blob([zipSync(entries, { level: 0 }) as BlobPart], { type: "application/zip" });
}
