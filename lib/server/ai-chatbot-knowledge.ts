import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge", "ai-chatbot");
const MAX_DOCS = 2;
const MAX_DOC_CHARS = 700;
const SCORING_CONTENT_CHARS = 4000;
const SECOND_DOC_SCORE_GAP = 4;

type BuildKnowledgeContextOptions = {
  forceSecondDoc?: boolean;
};

type KnowledgeDoc = {
  fileName: string;
  relativePath: string;
  title: string;
  rawContent: string;
  keywords: string[];
  paths: string[];
};

type SectionInfo = {
  start: number;
  text: string;
};

function normalizeToken(token: string) {
  return token.replace(/(은|는|이|가|을|를|에|의|와|과|으로|로|도|만|요)$/u, "");
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^0-9a-zA-Z가-힣_-]+/)
        .map((token) => normalizeToken(token.trim()))
        .filter((token) => token.length >= 2)
    )
  );
}

function extractTitle(raw: string, fallback: string) {
  const heading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || fallback;
}

function extractListValue(raw: string, label: string) {
  const matched = raw.match(new RegExp(`^${label}:\\s*(.+)$`, "im"))?.[1] || "";
  return matched
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripMetadata(raw: string) {
  return raw
    .replace(/^KEYWORDS:\s*.+$/gim, "")
    .replace(/^PATHS:\s*.+$/gim, "")
    .trim();
}

function getSectionInfos(content: string) {
  const headingPattern = /^##+\s+.+$/gm;
  const matches = Array.from(content.matchAll(headingPattern));

  if (!matches.length) {
    return [] as SectionInfo[];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? content.length) : content.length;
    return {
      start,
      text: content.slice(start, end).trim(),
    } satisfies SectionInfo;
  });
}

function getSectionScore(section: SectionInfo, question: string, doc: KnowledgeDoc) {
  const questionTokens = tokenize(question);
  const sectionTokens = new Set([
    ...tokenize(section.text),
    ...tokenize(doc.fileName),
    ...tokenize(doc.title),
    ...doc.keywords.flatMap(tokenize),
  ]);

  let score = 0;
  for (const token of questionTokens) {
    if (sectionTokens.has(token)) {
      score += 3;
    }
  }

  return score;
}

function findPreferredExcerptIndex(doc: KnowledgeDoc, question: string) {
  const sections = getSectionInfos(doc.rawContent);
  if (!sections.length) {
    return -1;
  }

  const scoredSections = sections
    .map((section) => ({ section, score: getSectionScore(section, question, doc) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredSections[0]?.section.start ?? -1;
}

function buildContextExcerpt(doc: KnowledgeDoc, question: string) {
  if (doc.rawContent.length <= MAX_DOC_CHARS) {
    return doc.rawContent;
  }

  const questionTokens = tokenize(question);
  const lowerContent = doc.rawContent.toLowerCase();
  const preferredIndex = findPreferredExcerptIndex(doc, question);

  if (preferredIndex >= 0) {
    const start = Math.max(0, preferredIndex - Math.floor(MAX_DOC_CHARS * 0.2));
    const end = Math.min(doc.rawContent.length, start + MAX_DOC_CHARS);
    const excerpt = doc.rawContent.slice(start, end).trim();
    return start > 0 ? `...${excerpt}` : excerpt;
  }

  for (const token of questionTokens) {
    const foundIndex = lowerContent.indexOf(token.toLowerCase());
    if (foundIndex < 0) continue;

    const start = Math.max(0, foundIndex - Math.floor(MAX_DOC_CHARS * 0.35));
    const end = Math.min(doc.rawContent.length, start + MAX_DOC_CHARS);
    const excerpt = doc.rawContent.slice(start, end).trim();
    return start > 0 ? `...${excerpt}` : excerpt;
  }

  return doc.rawContent.slice(0, MAX_DOC_CHARS);
}

function getIntentBoost(doc: KnowledgeDoc, question: string) {
  const lowerQuestion = question.toLowerCase();
  const normalizedQuestion = question.replace(/\s+/g, "").toLowerCase();
  const lowerRelativePath = doc.relativePath.toLowerCase();
  const lowerFileName = doc.fileName.toLowerCase();

  const isShippingIntent = ["배송", "송장", "통관", "택배", "세관", "delivery", "shipping", "customs"].some((term) =>
    lowerQuestion.includes(term)
  );
  if (isShippingIntent) {
    if (lowerRelativePath.includes("doogobio-nz-prompts/")) return 12;
    if (lowerFileName === "01-about-doogo") return -6;
  }

  const isAboutIntent = ["두고커넥트", "doogo connect", "무슨 서비스", "소개", "플랫폼"].some((term) =>
    lowerQuestion.includes(term)
  );
  if (isAboutIntent) {
    if (lowerFileName === "01-about-doogo") return 12;
  }

  const isPartnershipIntent = normalizedQuestion.includes("입점") || normalizedQuestion.includes("제휴");
  if (isPartnershipIntent) {
    if (lowerFileName === "04-partnership") return 12;
  }

  const isOrderIntent = ["견적", "moq", "포인트", "주문", "결제", "estimate"].some((term) => lowerQuestion.includes(term));
  if (isOrderIntent) {
    if (lowerFileName === "02-order-system" || lowerFileName === "03-manufacturing-specs") return 10;
  }

  const isFinanceIntent = ["입금", "계좌", "은행", "swift", "송금", "remittance", "bank"].some((term) => lowerQuestion.includes(term));
  if (isFinanceIntent) {
    if (lowerFileName === "05-technical-specs") return 14;
  }

  return 0;
}

function isMultiTopicQuestion(question: string) {
  const normalized = question.toLowerCase();
  return [" 그리고 ", " 및 ", " 이랑 ", ",", "/", "&"].some((token) => normalized.includes(token));
}

async function readKnowledgeFiles(dirPath: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return readKnowledgeFiles(absolutePath);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        return [absolutePath];
      }
      return [];
    })
  );

  return nested.flat();
}

async function loadKnowledgeDocs() {
  const filePaths = await readKnowledgeFiles(KNOWLEDGE_ROOT);
  const docs = await Promise.all(
    filePaths.map(async (filePath) => {
      const raw = await readFile(filePath, "utf8");
      const fileName = path.basename(filePath, ".md");
      const relativePath = path.relative(KNOWLEDGE_ROOT, filePath).replace(/\\/g, "/");
      const content = stripMetadata(raw);

      return {
        fileName,
        relativePath,
        title: extractTitle(raw, fileName),
        rawContent: content,
        keywords: extractListValue(raw, "KEYWORDS"),
        paths: extractListValue(raw, "PATHS"),
      } satisfies KnowledgeDoc;
    })
  );

  return docs.filter((doc) => doc.rawContent.trim() && doc.fileName.toLowerCase() !== "readme");
}

function scoreDoc(doc: KnowledgeDoc, pathname: string, question: string) {
  let score = 0;
  const questionTokens = tokenize(question);
  const pathnameTokens = tokenize(pathname);
  const docTokens = new Set([
    ...tokenize(doc.relativePath),
    ...tokenize(doc.fileName),
    ...tokenize(doc.title),
    ...tokenize(doc.rawContent.slice(0, SCORING_CONTENT_CHARS)),
    ...doc.keywords.flatMap(tokenize),
  ]);

  for (const prefix of doc.paths) {
    if (prefix && pathname.startsWith(prefix)) {
      score += 8;
    }
  }

  for (const token of pathnameTokens) {
    if (docTokens.has(token)) {
      score += 2;
    }
  }

  for (const token of questionTokens) {
    if (docTokens.has(token)) {
      score += 3;
    }
  }

  if (doc.relativePath.includes("doogo-connect-prompts/")) {
    score += 1;
  }

  score += getIntentBoost(doc, question);

  return score;
}

export async function buildKnowledgeContext(pathname: string, question: string, options?: BuildKnowledgeContextOptions) {
  const docs = await loadKnowledgeDocs();
  if (!docs.length) {
    return "";
  }

  const ranked = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, pathname, question) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const allowSecondDoc = options?.forceSecondDoc || isMultiTopicQuestion(question);

  const selected = ranked
    .filter((item, index, items) => {
      if (index === 0) return true;
      if (index >= MAX_DOCS) return false;
      if (!allowSecondDoc) return false;
      return items[0].score - item.score <= SECOND_DOC_SCORE_GAP;
    })
    .slice(0, MAX_DOCS)
    .map((item) => item.doc);

  if (!selected.length) {
    return "";
  }

  return selected
    .map((doc, index) => `문서 ${index + 1}: ${doc.title}\n${buildContextExcerpt(doc, question)}`)
    .join("\n\n---\n\n");
}
