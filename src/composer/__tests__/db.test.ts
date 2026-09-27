import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { type Draft, deleteDraft, getDraft, listDrafts, newId, saveDraft } from "../db";

const d = (id: string, updated: number): Draft => ({ id, title: "", text: id, created: 0, updated });

describe("draft store", () => {
  it("saves, reads, lists newest first, deletes", async () => {
    await saveDraft(d("a", 1));
    await saveDraft(d("b", 3));
    await saveDraft(d("c", 2));
    expect((await listDrafts()).map((x) => x.id)).toEqual(["b", "c", "a"]);
    expect((await getDraft("a"))?.text).toBe("a");
    await saveDraft({ ...d("a", 9), text: "edited" });
    expect((await getDraft("a"))?.text).toBe("edited");
    await deleteDraft("a");
    expect(await getDraft("a")).toBeUndefined();
  });
  it("generates unique ids", () => expect(new Set(Array.from({ length: 200 }, newId)).size).toBe(200));
});
