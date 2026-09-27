import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Draft } from "../db";
import { DEFAULTS, effectiveTitle, fetchPost, listRemotePosts, loadSettings, publish, saveSettings, toMarkdown, unpublish } from "../github";

const draft = (over: Partial<Draft> = {}): Draft => ({
  id: "abc123",
  title: "",
  text: "Traffic makes me think.\n\nMore text.",
  created: 1,
  updated: 1,
  ...over,
});
const settings = { ...DEFAULTS, token: "tok" };

/** Fake GitHub GraphQL: records mutations, reports which paths already exist. */
function mockGithub(existing: string[] = []) {
  const commits: any[] = [];
  const fetchMock = vi.fn(async (_url: string, init: any) => {
    const { query, variables } = JSON.parse(init.body);
    if (query.includes("createCommitOnBranch")) {
      commits.push(variables.input);
      return Response.json({ data: { createCommitOnBranch: { commit: { oid: "new" } } } });
    }
    const path = variables.expr.split(":")[1];
    return Response.json({
      data: { repository: { ref: { target: { oid: "head1" } }, object: existing.includes(path) ? { oid: "x" } : null } },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { commits, fetchMock };
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-27T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("effectiveTitle", () => {
  it("prefers the typed title", () => expect(effectiveTitle(draft({ title: " Hi " }))).toBe("Hi"));
  it("falls back to the first line, stripping markdown markers", () =>
    expect(effectiveTitle(draft({ text: "> a quote\nrest" }))).toBe("a quote"));
  it("truncates long first lines at a word boundary", () => {
    const t = effectiveTitle(draft({ text: "word ".repeat(30) }));
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t.endsWith("…")).toBe(true);
  });
  it("handles empty text", () => expect(effectiveTitle(draft({ text: "  " }))).toBe("Untitled"));
});

describe("toMarkdown", () => {
  it("emits schema-valid frontmatter and body", () => {
    const md = toMarkdown(draft({ title: 'Say "hi": ok', pubDate: "2026-09-27T10:00:00.000Z" }));
    expect(md).toBe(
      `---\ntitle: "Say \\"hi\\": ok"\npubDate: "2026-09-27T10:00:00.000Z"\n---\n\nTraffic makes me think.\n\nMore text.\n`,
    );
  });
  it("adds updatedDate for already-published posts", () => {
    expect(toMarkdown(draft({ pubDate: "2026-01-01", published: true }))).toContain("updatedDate:");
  });
  it("keeps description and other unknown frontmatter fields", () => {
    const md = toMarkdown(draft({ pubDate: "2026-01-01", extra: { description: "d", heroImage: "../img.jpg" } }));
    expect(md).toBe(`---\ntitle: "Traffic makes me think."\ndescription: "d"\npubDate: "2026-01-01"\nheroImage: "../img.jpg"\n---\n\nTraffic makes me think.\n\nMore text.\n`);
  });
});

describe("settings", () => {
  it("round-trips and falls back to defaults", () => {
    expect(loadSettings()).toEqual(DEFAULTS);
    saveSettings({ ...DEFAULTS, token: "t" });
    expect(loadSettings().token).toBe("t");
  });
});

describe("publish", () => {
  it("commits a new post file with a dated slug", async () => {
    const { commits } = mockGithub();
    const out = await publish(settings, draft({ title: "Traffic Makes Me Think!" }));
    expect(out).toMatchObject({ slug: "2026-09-27-traffic-makes-me-think", published: true, pending: undefined });
    expect(commits).toHaveLength(1);
    expect(commits[0].expectedHeadOid).toBe("head1");
    expect(commits[0].branch).toEqual({ repositoryNameWithOwner: "lzadhito/lzadhito.github.io", branchName: "master" });
    const [add] = commits[0].fileChanges.additions;
    expect(add.path).toBe("src/content/blog/2026-09-27-traffic-makes-me-think.md");
    expect(Buffer.from(add.contents, "base64").toString()).toContain('title: "Traffic Makes Me Think!"');
  });

  it("encodes non-ASCII text as UTF-8", async () => {
    const { commits } = mockGithub();
    await publish(settings, draft({ title: "Sayang", text: "Maukah kita berhenti — sejenak ✨" }));
    expect(Buffer.from(commits[0].fileChanges.additions[0].contents, "base64").toString()).toContain("— sejenak ✨");
  });

  it("avoids overwriting an existing post", async () => {
    mockGithub(["src/content/blog/2026-09-27-hello.md"]);
    const out = await publish(settings, draft({ title: "Hello" }));
    expect(out.slug).toBe("2026-09-27-hello-2");
  });

  it("keeps the slug and marks updatedDate when editing", async () => {
    const { commits } = mockGithub();
    const out = await publish(
      settings,
      draft({ slug: "2026-01-01-old", pubDate: "2026-01-01T00:00:00.000Z", published: true }),
    );
    expect(out.slug).toBe("2026-01-01-old");
    expect(commits[0].fileChanges.additions[0].path).toBe("src/content/blog/2026-01-01-old.md");
    expect(commits[0].message.headline).toMatch(/^Update:/);
  });

  it("surfaces a rejected token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await expect(publish(settings, draft({ title: "x" }))).rejects.toThrow(/Token rejected/);
  });

  it("surfaces GraphQL errors (e.g. stale head)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errors: [{ message: "Expected branch to point to" }] })));
    await expect(publish(settings, draft({ title: "x" }))).rejects.toThrow(/Expected branch/);
  });
});

describe("unpublish", () => {
  it("deletes the file and keeps the draft", async () => {
    const { commits } = mockGithub();
    const out = await unpublish(settings, draft({ slug: "2026-01-01-old", published: true, pending: "unpublish" }));
    expect(commits[0].fileChanges.deletions).toEqual([{ path: "src/content/blog/2026-01-01-old.md" }]);
    expect(out).toMatchObject({ published: false, pending: undefined, slug: "2026-01-01-old" });
  });
});

describe("listRemotePosts", () => {
  it("lists markdown files in the blog directory, ignoring subdirectories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: {
            repository: {
              object: {
                entries: [
                  { name: "2026-01-01-old.md", type: "blob" },
                  { name: "assets", type: "tree" },
                  { name: "2026-02-02-new.mdx", type: "blob" },
                ],
              },
            },
          },
        }),
      ),
    );
    expect(await listRemotePosts(settings)).toEqual([{ slug: "2026-01-01-old" }, { slug: "2026-02-02-new" }]);
  });

  it("returns nothing if the directory can't be read", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { repository: { object: null } } })));
    expect(await listRemotePosts(settings)).toEqual([]);
  });
});

describe("fetchPost", () => {
  const stubBlob = (text: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { repository: { object: { text } } } })));

  it("parses a hand-written post, keeping description as extra and dropping stale updatedDate", async () => {
    stubBlob(
      `---\ntitle: 'Journaling Books'\ndescription: 'sets to the journey'\npubDate: 'Nov 05 2025'\nupdatedDate: 'Nov 06 2025'\n---\n\nBody text here.\n`,
    );
    const d = await fetchPost(settings, "summarizing-books");
    expect(d).toMatchObject({
      title: "Journaling Books",
      text: "Body text here.",
      pubDate: "Nov 05 2025",
      published: true,
      slug: "summarizing-books",
      extra: { description: "sets to the journey" },
    });
  });

  it("throws when the post doesn't exist", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: { repository: { object: null } } })));
    await expect(fetchPost(settings, "missing")).rejects.toThrow(/wasn't found/);
  });

  it("round-trips through toMarkdown without losing the description (updatedDate is refreshed, as for any edit)", async () => {
    stubBlob(`---\ntitle: "Hi"\ndescription: "d"\npubDate: "2026-01-01"\n---\n\nBody\n`);
    const d = await fetchPost(settings, "hi");
    expect(toMarkdown(d)).toBe(`---\ntitle: "Hi"\ndescription: "d"\npubDate: "2026-01-01"\nupdatedDate: "2026-09-27T10:00:00.000Z"\n---\n\nBody\n`);
  });
});
