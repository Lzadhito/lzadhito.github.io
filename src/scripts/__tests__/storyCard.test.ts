import { describe, expect, it } from "vitest";
import { clampLines, markdownToPlainText, slugifyFilename, wrapLines } from "../storyCard";

// A fake "measure" that behaves like a monospace font: 10px per character.
const measure = (text: string) => text.length * 10;

describe("wrapLines", () => {
  it("keeps short text on one line", () => {
    expect(wrapLines(measure, "hello world", 200)).toEqual(["hello world"]);
  });

  it("wraps at word boundaries once a line would exceed maxWidth", () => {
    // "hello" (50) + " world" (60) = 110 > 100, so it should break.
    expect(wrapLines(measure, "hello world", 100)).toEqual(["hello", "world"]);
  });

  it("never drops a word even if it alone exceeds maxWidth", () => {
    expect(wrapLines(measure, "supercalifragilistic word", 50)).toEqual(["supercalifragilistic", "word"]);
  });

  it("returns an empty array for blank input", () => {
    expect(wrapLines(measure, "   ", 100)).toEqual([]);
  });
});

describe("clampLines", () => {
  it("passes through when under the line limit", () => {
    expect(clampLines(measure, "one two three", 200, 5)).toEqual(["one two three"]);
  });

  it("truncates with an ellipsis when it overflows maxLines", () => {
    const lines = clampLines(measure, "one two three four five six", 40, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.endsWith("…")).toBe(true);
  });
});

describe("markdownToPlainText", () => {
  it("strips headings, emphasis, links and list markers", () => {
    const md = `## Heading\n\nSome **bold** and *italic* text with a [link](https://example.com).\n\n- one\n- two\n`;
    expect(markdownToPlainText(md)).toBe("Heading Some bold and italic text with a link. one two");
  });

  it("drops fenced code blocks and unwraps inline code", () => {
    const md = "Before\n\n```js\nconst x = 1;\n```\n\nAfter using `inline` code.";
    expect(markdownToPlainText(md)).toBe("Before After using inline code.");
  });

  it("collapses blockquotes and blank lines into a single line of prose", () => {
    const md = "> Quoted line one\n> Quoted line two\n\nRegular paragraph.";
    expect(markdownToPlainText(md)).toBe("Quoted line one Quoted line two Regular paragraph.");
  });
});

describe("slugifyFilename", () => {
  it("lowercases and dashes non-alphanumerics", () => {
    expect(slugifyFilename("Speak Your Intention!")).toBe("speak-your-intention");
  });

  it("falls back to 'post' for empty/symbol-only titles", () => {
    expect(slugifyFilename("!!!")).toBe("post");
  });
});
