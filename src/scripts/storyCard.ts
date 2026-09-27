// Draws a shareable, Instagram-Story-shaped (1080x1920) snapshot of a blog post.
// Pure layout/measurement helpers are exported separately so they can be unit
// tested without a real <canvas> (see __tests__/storyCard.test.ts).

export interface StoryCardData {
  title: string;
  description?: string;
  /** Raw markdown/MDX post body — stripped down and poured in to fill remaining card space. */
  body?: string;
  date: string;
  siteName: string;
  domain: string;
}

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

// Matches src/design/tokens.ts — the "story" palette that was designed for
// this exact shareable-card use case but hadn't been wired up to anything yet.
const COLORS = {
  primary: "#151614",
  secondary: "#4A5565",
  tertiary: "#2F6B00",
  onTertiary: "#F8FDEF",
  neutral: "#F8FDEF",
  surface: "#E1E6D9",
  rule: "#CBCFC3",
};

const SEND_ICON_PATHS = [
  "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
  "m21.854 2.147-10.94 10.939",
];

/** Greedy word-wrap. `measure` is injected so this stays testable without a canvas. */
export function wrapLines(measure: (text: string) => number, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Wraps then truncates to `maxLines`, ellipsizing the last line so it still fits. */
export function clampLines(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines = wrapLines(measure, text, maxWidth);
  if (lines.length <= maxLines) return lines;
  const clamped = lines.slice(0, maxLines);
  let last = clamped[maxLines - 1] ?? "";
  while (last.length > 1 && measure(`${last}…`) > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  clamped[maxLines - 1] = `${last}…`;
  return clamped;
}

/** Strips common markdown/MDX syntax down to plain, wrappable prose. */
export function markdownToPlainText(markdown: string): string {
  let text = markdown;
  text = text.replace(/^---\n[\s\S]*?\n---\n?/, ""); // stray frontmatter, if any slipped through
  text = text.replace(/```[\s\S]*?```/g, " "); // fenced code blocks
  text = text.replace(/`([^`]+)`/g, "$1"); // inline code
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " "); // images
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // links
  text = text.replace(/<[^>]+>/g, " "); // stray HTML/JSX tags (MDX)
  text = text.replace(/^#{1,6}\s+/gm, ""); // headings
  text = text.replace(/^>\s?/gm, ""); // blockquotes
  text = text.replace(/^\s*([-*+]|\d+\.)\s+/gm, ""); // list markers
  text = text.replace(/^\s*[-*_]{3,}\s*$/gm, " "); // horizontal rules
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2"); // bold
  text = text.replace(/(\*|_)(.*?)\1/g, "$2"); // italic
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number): void {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

function drawSendIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of SEND_ICON_PATHS) ctx.stroke(new Path2D(d));
  ctx.restore();
}

const FONT_STACKS = {
  mono: `"Fira Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,
  sans: `"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif`,
};

export function drawStoryCard(ctx: CanvasRenderingContext2D, data: StoryCardData): void {
  const measure = (text: string) => ctx.measureText(text).width;

  ctx.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const panelX = 64;
  const panelY = 132;
  const panelW = STORY_WIDTH - panelX * 2;
  const panelH = 1560;

  ctx.save();
  ctx.shadowColor = "rgba(21,22,20,0.18)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 24;
  roundRectPath(ctx, panelX, panelY, panelW, panelH, 40);
  ctx.fillStyle = COLORS.neutral;
  ctx.fill();
  ctx.restore();

  const innerPad = 72;
  const contentX = panelX + innerPad;
  const contentW = panelW - innerPad * 2;
  let cursorY = panelY + innerPad + 20;

  // Wordmark + plane badge.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.secondary;
  ctx.font = `700 30px ${FONT_STACKS.mono}`;
  drawTracked(ctx, data.siteName.toUpperCase(), contentX, cursorY, 4);

  const badgeR = 34;
  const badgeCx = panelX + panelW - innerPad - badgeR;
  const badgeCy = cursorY - 10;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(47,107,0,0.12)";
  ctx.fill();
  drawSendIcon(ctx, badgeCx, badgeCy, 30, COLORS.tertiary);

  cursorY += 46;

  // Accent divider.
  ctx.fillStyle = COLORS.tertiary;
  ctx.fillRect(contentX, cursorY, 96, 8);
  cursorY += 8 + 56;

  // Title (capped — the rest of the card is reserved for as much real content as fits).
  ctx.fillStyle = COLORS.primary;
  ctx.font = `700 82px ${FONT_STACKS.sans}`;
  const titleLineHeight = 92;
  for (const line of clampLines(measure, data.title, contentW, 4)) {
    cursorY += titleLineHeight;
    ctx.fillText(line, contentX, cursorY);
  }

  // Meta row is pinned to the bottom of the panel — work out its position up front
  // so the body-text block below knows exactly how much room it has to fill.
  const metaY = panelY + panelH - innerPad;
  const metaRuleY = metaY - 56;
  const bodyGap = 56;
  const bodyLineHeight = 58;

  // Body: pour in the lede plus as much of the post's own text as still fits,
  // rather than a fixed, short excerpt.
  const bodyText = [data.description, data.body ? markdownToPlainText(data.body) : ""].filter(Boolean).join("  ");
  const maxBodyLines = Math.max(0, Math.floor((metaRuleY - 32 - (cursorY + bodyGap)) / bodyLineHeight));
  if (bodyText && maxBodyLines > 0) {
    cursorY += bodyGap;
    ctx.fillStyle = COLORS.secondary;
    ctx.font = `400 40px ${FONT_STACKS.sans}`;
    for (const line of clampLines(measure, bodyText, contentW, maxBodyLines)) {
      cursorY += bodyLineHeight;
      ctx.fillText(line, contentX, cursorY);
    }
  }

  ctx.strokeStyle = COLORS.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(contentX, metaRuleY);
  ctx.lineTo(contentX + contentW, metaRuleY);
  ctx.stroke();

  ctx.font = `400 30px ${FONT_STACKS.mono}`;
  ctx.fillStyle = COLORS.secondary;
  ctx.textAlign = "left";
  ctx.fillText(data.date, contentX, metaY);
  ctx.textAlign = "right";
  ctx.fillText(data.domain, contentX + contentW, metaY);

  // CTA pill below the card.
  const ctaText = "READ THE FULL STORY →";
  ctx.font = `700 34px ${FONT_STACKS.mono}`;
  const ctaWidth = measure(ctaText);
  const pillH = 96;
  const pillW = ctaWidth + 96;
  const pillX = (STORY_WIDTH - pillW) / 2;
  const pillY = panelY + panelH + 64;
  roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = COLORS.tertiary;
  ctx.fill();
  ctx.fillStyle = COLORS.onTertiary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, STORY_WIDTH / 2, pillY + pillH / 2 + 2);
}

let fontsPromise: Promise<void> | null = null;

/** Lazily loads the story typeface (only when someone actually opens the share dialog). */
export function ensureStoryFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  fontsPromise = (async () => {
    try {
      const href = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;700&family=Fira+Mono:wght@400;700&display=swap";
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
      }
      await Promise.all([
        document.fonts.load(`700 82px "Hanken Grotesk"`),
        document.fonts.load(`400 40px "Hanken Grotesk"`),
        document.fonts.load(`700 30px "Fira Mono"`),
        document.fonts.load(`400 30px "Fira Mono"`),
      ]);
      await document.fonts.ready;
    } catch {
      // Fall back to the font-stack defaults below — the card still renders fine.
    }
  })();
  return fontsPromise;
}

export async function renderStoryCard(canvas: HTMLCanvasElement, data: StoryCardData): Promise<void> {
  await ensureStoryFonts();
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  drawStoryCard(ctx, data);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode image"));
    }, "image/png");
  });
}

export function slugifyFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "post";
}
