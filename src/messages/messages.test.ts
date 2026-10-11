import { describe, expect, it } from "vitest";
import { KNOWN_ERROR_CODES } from "@/lib/api/errors";
import ar from "./ar.json";
import en from "./en.json";

type Tree = { [key: string]: string | Tree };

const keys = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));

describe("translations", () => {
  it("Arabic and English define exactly the same keys", () => {
    expect(keys(ar as Tree).sort()).toEqual(keys(en as Tree).sort());
  });

  it("every known API error code has a translated message", () => {
    for (const code of KNOWN_ERROR_CODES) {
      expect(en.errors.codes).toHaveProperty(code);
      expect(ar.errors.codes).toHaveProperty(code);
    }
  });
});
