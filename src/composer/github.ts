import type { Draft } from "./db";

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

export function toMarkdown(d: Draft): string {
  const fm = [`title: ${JSON.stringify(effectiveTitle(d))}`, `pubDate: ${JSON.stringify(d.pubDate)}`];
  if (d.published) fm.push(`updatedDate: ${JSON.stringify(new Date().toISOString())}`);
  return `---\n${fm.join("\n")}\n---\n\n${d.text.trim()}\n`;
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
    additions: [{ path: pathFor(next.slug!), contents: b64(toMarkdown(next)) }],
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

/** Verifies the saved token can read the repo branch. Resolves to an error message, or null if OK. */
export async function checkToken(s: Settings): Promise<string | null> {
  try {
    await head(s);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
