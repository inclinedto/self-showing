export type Section = {
  /** Human-readable location used in citations, e.g. "第 3 页". */
  label: string;
  text: string;
};

export type Chunk = {
  index: number;
  label: string;
  text: string;
};

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const TOKEN_RUN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+|[a-z0-9]+(?:[.\-_][a-z0-9]+)*/g;
const STOP_UNIGRAMS = new Set("的了是在和与及或也就都而被把这那之其个为对".split(""));

/** CJK runs become unigrams + bigrams (no word segmenter needed); Latin runs become words. */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const normalized = text.normalize("NFKC").toLowerCase();
  for (const run of normalized.match(TOKEN_RUN) ?? []) {
    if (CJK.test(run[0])) {
      for (let i = 0; i < run.length; i++) {
        if (!STOP_UNIGRAMS.has(run[i])) tokens.push(run[i]);
        if (i + 1 < run.length) tokens.push(run.slice(i, i + 2));
      }
    } else if (run.length > 1 || /\d/.test(run)) {
      tokens.push(run);
    }
  }
  return tokens;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?；;\n])|(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Splits each section into overlapping chunks that never cross a section (page) boundary. */
export function chunkSections(sections: Section[], size = 500, overlap = 80): Chunk[] {
  const chunks: Chunk[] = [];
  for (const section of sections) {
    const text = section.text.replace(/[ \t]+/g, " ").trim();
    if (!text) continue;

    const pieces: string[] = [];
    for (const sentence of splitSentences(text)) {
      if (sentence.length <= size) {
        pieces.push(sentence);
      } else {
        for (let start = 0; start < sentence.length; start += size - overlap) {
          pieces.push(sentence.slice(start, start + size));
        }
      }
    }

    let current = "";
    for (const piece of pieces) {
      if (current && current.length + piece.length > size) {
        chunks.push({ index: chunks.length, label: section.label, text: current });
        const tail = current.slice(-overlap);
        current = tail.length < current.length ? tail + piece : piece;
      } else {
        current = current ? `${current}${CJK.test(piece[0] ?? "") ? "" : " "}${piece}` : piece;
      }
    }
    if (current) chunks.push({ index: chunks.length, label: section.label, text: current });
  }
  return chunks;
}

export class Bm25Index {
  readonly chunks: Chunk[];
  private k1: number;
  private b: number;
  private termFreqs: Map<string, number>[];
  private docFreq = new Map<string, number>();
  private lengths: number[];
  private averageLength: number;

  constructor(chunks: Chunk[], k1 = 1.2, b = 0.75) {
    this.chunks = chunks;
    this.k1 = k1;
    this.b = b;
    this.termFreqs = chunks.map((chunk) => {
      const freqs = new Map<string, number>();
      for (const token of tokenize(chunk.text)) freqs.set(token, (freqs.get(token) ?? 0) + 1);
      for (const token of freqs.keys()) this.docFreq.set(token, (this.docFreq.get(token) ?? 0) + 1);
      return freqs;
    });
    this.lengths = this.termFreqs.map((freqs) => [...freqs.values()].reduce((a, b) => a + b, 0));
    this.averageLength = this.lengths.reduce((a, b) => a + b, 0) / Math.max(1, chunks.length);
  }

  search(query: string, limit = 10): { chunk: Chunk; score: number }[] {
    const terms = [...new Set(tokenize(query))];
    const total = this.chunks.length;
    const results: { chunk: Chunk; score: number }[] = [];

    this.termFreqs.forEach((freqs, index) => {
      let score = 0;
      for (const term of terms) {
        const tf = freqs.get(term);
        if (!tf) continue;
        const df = this.docFreq.get(term) ?? 0;
        const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
        const norm = 1 - this.b + (this.b * this.lengths[index]) / (this.averageLength || 1);
        score += (idf * tf * (this.k1 + 1)) / (tf + this.k1 * norm);
      }
      if (score > 0) results.push({ chunk: this.chunks[index], score });
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

const OVERVIEW_QUERY =
  /总结|概括|概述|摘要|主要内容|讲了什么|说了什么|大意|整体|summar|overview|tl;?dr/i;

/**
 * Picks excerpts for one question within a character budget. Overview-style questions also get
 * chunks spread evenly across the document, since keyword search alone only finds a few spots.
 */
export function selectChunks(index: Bm25Index, query: string, budget = 9000): Chunk[] {
  const { chunks } = index;
  const ranked = index.search(query, 24).map((result) => result.chunk);
  const candidates: Chunk[] = [];

  if (ranked.length < 3 || OVERVIEW_QUERY.test(query)) {
    const target = Math.max(1, Math.floor(budget / 500));
    const step = Math.max(1, chunks.length / target);
    for (let position = 0; position < chunks.length; position += step) {
      candidates.push(chunks[Math.floor(position)]);
    }
    candidates.unshift(...ranked.slice(0, 4));
  } else {
    candidates.push(...ranked);
  }

  const picked = new Map<number, Chunk>();
  let used = 0;
  for (const chunk of candidates) {
    if (picked.has(chunk.index)) continue;
    if (used + chunk.text.length > budget && picked.size > 0) continue;
    picked.set(chunk.index, chunk);
    used += chunk.text.length;
  }
  return [...picked.values()].sort((a, b) => a.index - b.index);
}

/** Splits plain text (Word / txt) into roughly page-sized sections so citations stay specific. */
export function sectionsFromPlainText(text: string, size = 1500): Section[] {
  const paragraphs = text
    .split(/\n\s*\n|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const sections: Section[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > size) {
      sections.push({ label: `第 ${sections.length + 1} 部分`, text: current });
      current = paragraph;
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
  }
  if (current) sections.push({ label: `第 ${sections.length + 1} 部分`, text: current });
  return sections;
}

/** Citation markers like [1] or [1][3] or [1, 3] in an answer, as excerpt ids. */
export function citedIds(answer: string): number[] {
  const ids = new Set<number>();
  for (const match of answer.matchAll(/\[(\d+(?:\s*[,，、]\s*\d+)*)\]/g)) {
    for (const id of match[1].split(/[,，、]/)) ids.add(Number(id.trim()));
  }
  return [...ids].sort((a, b) => a - b);
}
