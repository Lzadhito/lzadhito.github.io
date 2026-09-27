export interface Draft {
  id: string;
  title: string;
  text: string;
  created: number;
  updated: number;
  /** Set on first publish and never changed, so shared links keep working. */
  slug?: string;
  pubDate?: string;
  published?: boolean;
  /** Queued repo action, drained by sync() when online. */
  pending?: "publish" | "unpublish";
  /** Frontmatter fields the composer doesn't edit (e.g. description, heroImage), kept so re-saving doesn't drop them. */
  extra?: Record<string, string>;
}

const STORE = "drafts";

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open("composer", 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const saveDraft = (d: Draft) => run("readwrite", (s) => s.put(d));
export const getDraft = (id: string) => run<Draft | undefined>("readonly", (s) => s.get(id));
export const deleteDraft = (id: string) => run("readwrite", (s) => s.delete(id));
export const listDrafts = async () => (await run<Draft[]>("readonly", (s) => s.getAll())).sort((a, b) => b.updated - a.updated);

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
