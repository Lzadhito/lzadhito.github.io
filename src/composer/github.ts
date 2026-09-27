import { type Draft, newId } from "./db";
import { encryptBody } from "../lib/postCrypto";

export interface Settings {
  token: string;
  repo: string; // owner/name
  branch: string;
  /** When the current token was saved (ms since epoch); lets Settings show its age. */
  tokenSavedAt?: number;
}

const KEY = "composer-settings";
export const DEFAULTS: Settings = { token: "", repo: "lzadhito/lzadhito.github.io", branch: "master" };

export const loadSettings = (): Settings => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
};
export const saveSettings = (s: Settings) => localStorage.setItem(KEY, JSON.stringify(s));

const DIR = "src/content/blog";
const pathFor = (slug: string) => `${DIR}/${slug}.md`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");

/** Title used on the site: the typed one, else the first words of the text. */
export function effectiveTitle(d: Draft): string {
  if (d.title.trim()) return d.title.trim();
  const first = d.text.trim().split("\n")[0].replace(/^[#>\-*\s]+/, "");
  return first.length > 60 ? first.slice(0, 57).replace(/\s+\S*$/, "") + "…" : first || "Untitled";
}

/** Builds the committed .md file. When `d.password` is set, the body is encrypted and the
 * plaintext never appears in the output — see src/lib/postCrypto.ts. */
export async function toMarkdown(d: Draft): Promise<string> {
  const fm = [`title: ${JSON.stringify(effectiveTitle(d))}`];
  if (d.extra?.description !== undefined) fm.push(`description: ${JSON.stringify(d.extra.description)}`);
  fm.push(`pubDate: ${JSON.stringify(d.pubDate)}`);
  if (d.published) fm.push(`updatedDate: ${JSON.stringify(new Date().toISOString())}`);
  if (d.password) fm.push(`protected: true`);
  for (const [k, v] of Object.entries(d.extra ?? {})) {
    if (k === "description" || k === "protected") continue; // description already emitted, right after title
    fm.push(`${k}: ${JSON.stringify(v)}`);
  }
  const body = d.password ? await encryptBody(d.text.trim(), d.password) : d.text.trim();
  return `---\n${fm.join("\n")}\n---\n\n${body}\n`;
}

const unquote = (raw: string): string => {
  const s = raw.trim();
  if (s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) {
    const inner = s.slice(1, -1);
    return s[0] === '"' ? inner.replace(/\\(.)/g, "$1") : inner.replace(/''/g, "'");
  }
  return s;
};

/** Parses the small YAML subset used by composer-written and hand-written posts alike. */
function parseFrontmatter(raw: string): { title: string; pubDate?: string; extra: Record<string, string>; text: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { title: "", extra: {}, text: raw.trim() };
  let title = "";
  let pubDate: string | undefined;
  const extra: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const value = unquote(kv[2]);
    if (kv[1] === "title") title = value;
    else if (kv[1] === "pubDate") pubDate = value;
    else if (kv[1] === "updatedDate") continue; // regenerated whenever the composer re-saves
    else extra[kv[1]] = value;
  }
  return { title, pubDate, extra, text: m[2].trim() };
}

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

async function gql<T>(s: Settings, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) throw new Error("Token rejected (expired or wrong). Check Settings.");
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

async function head(s: Settings, probePath?: string) {
  const [owner, name] = s.repo.split("/");
  const data = await gql<{ repository: { ref: { target: { oid: string } } | null; object?: { oid: string } | null } }>(
    s,
    `query($owner:String!,$name:String!,$ref:String!,$expr:String!){
      repository(owner:$owner,name:$name){ ref(qualifiedName:$ref){ target{ oid } } object(expression:$expr){ oid } }
    }`,
    { owner, name, ref: `refs/heads/${s.branch}`, expr: `${s.branch}:${probePath ?? ""}` },
  );
  if (!data.repository.ref) throw new Error(`Branch ${s.branch} not found in ${s.repo}`);
  return { oid: data.repository.ref.target.oid, exists: !!data.repository.object && !!probePath };
}

async function commit(
  s: Settings,
  message: string,
  oid: string,
  changes: { additions?: { path: string; contents: string }[]; deletions?: { path: string }[] },
) {
  await gql(
    s,
    `mutation($input:CreateCommitOnBranchInput!){ createCommitOnBranch(input:$input){ commit{ oid } } }`,
    {
      input: {
        branch: { repositoryNameWithOwner: s.repo, branchName: s.branch },
        message: { headline: message },
        expectedHeadOid: oid,
        fileChanges: changes,
      },
    },
  );
}

/** Adds or updates the post file. Assigns slug + pubDate on first publish. Returns the updated draft. */
export async function publish(s: Settings, d: Draft): Promise<Draft> {
  const next = { ...d };
  if (!next.slug) {
    const date = new Date().toISOString().slice(0, 10);
    const base = `${date}-${slugify(effectiveTitle(next)) || next.id}`;
    for (let i = 1; ; i++) {
      const candidate = i === 1 ? base : `${base}-${i}`;
      if (!(await head(s, pathFor(candidate))).exists) {
        next.slug = candidate;
        break;
      }
      if (i > 9) throw new Error("Could not find a free slug");
    }
    next.pubDate = new Date().toISOString();
  }
  const { oid } = await head(s);
  await commit(s, `${d.published ? "Update" : "Publish"}: ${effectiveTitle(next)}`, oid, {
    additions: [{ path: pathFor(next.slug!), contents: b64(await toMarkdown(next)) }],
  });
  next.published = true;
  next.pending = undefined;
  return next;
}

export async function unpublish(s: Settings, d: Draft): Promise<Draft> {
  const { oid } = await head(s);
  await commit(s, `Unpublish: ${effectiveTitle(d)}`, oid, { deletions: [{ path: pathFor(d.slug!) }] });
  return { ...d, published: false, pending: undefined };
}

export const postUrl = (slug: string) => `/blog/${slug}/`;

/** Lists every published post's slug straight from the repo, so posts published on other devices show up too. */
export async function listRemotePosts(s: Settings): Promise<{ slug: string }[]> {
  const [owner, name] = s.repo.split("/");
  const data = await gql<{ repository: { object: { entries?: { name: string; type: string }[] } | null } }>(
    s,
    `query($owner:String!,$name:String!,$expr:String!){
      repository(owner:$owner,name:$name){ object(expression:$expr){ ... on Tree { entries { name type } } } }
    }`,
    { owner, name, expr: `${s.branch}:${DIR}` },
  );
  const entries = data.repository.object?.entries ?? [];
  return entries.filter((e) => e.type === "blob" && /\.mdx?$/.test(e.name)).map((e) => ({ slug: e.name.replace(/\.mdx?$/, "") }));
}

/** Reads a published post's file and turns it back into a Draft, so it can be opened, edited, or deleted.
 * If it's password protected, its body comes back ciphertext-only, in `locked` (`text` is empty) — the
 * caller needs to decrypt it with the password before it's editable. See decryptBody() in postCrypto.ts. */
export async function fetchPost(s: Settings, slug: string): Promise<Draft> {
  const [owner, name] = s.repo.split("/");
  const data = await gql<{ repository: { object: { text?: string } | null } }>(
    s,
    `query($owner:String!,$name:String!,$expr:String!){
      repository(owner:$owner,name:$name){ object(expression:$expr){ ... on Blob { text } } }
    }`,
    { owner, name, expr: `${s.branch}:${pathFor(slug)}` },
  );
  const raw = data.repository.object?.text;
  if (raw === undefined) throw new Error(`"${slug}" wasn't found in the repo.`);
  const { title, pubDate, extra, text } = parseFrontmatter(raw);
  const isProtected = extra.protected === "true";
  delete extra.protected;
  const now = Date.now();
  return {
    id: newId(),
    title,
    text: isProtected ? "" : text,
    locked: isProtected ? text : undefined,
    created: now,
    updated: now,
    slug,
    pubDate,
    published: true,
    extra,
  };
}

/** Verifies the saved token can read the repo branch. Resolves to an error message, or null if OK. */
export async function checkToken(s: Settings): Promise<string | null> {
  try {
    await head(s);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
