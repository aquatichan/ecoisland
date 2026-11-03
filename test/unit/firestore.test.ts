import { describe, expect, it } from "vitest";
import { decodeFields, encodeFields, quoteField } from "../../worker/firestore";

describe("Firestore value codec", () => {
  it("round-trips the shapes Ecoisland stores", () => {
    const data = {
      n: 3,
      f: 0.5,
      s: "hi",
      b: true,
      nil: null,
      list: ["a", 1, { x: 0.25 }],
      map: { u1: 80, nested: { ok: false } },
    };
    expect(decodeFields(encodeFields(data))).toEqual(data);
    expect(encodeFields({ n: 3 }).n).toEqual({ integerValue: "3" });
    expect(encodeFields({ skip: undefined })).toEqual({});
  });

  it("quotes unusual field names", () => {
    expect(quoteField("treecoins")).toBe("treecoins");
    expect(quoteField("1.4")).toBe("`1.4`");
  });
});
