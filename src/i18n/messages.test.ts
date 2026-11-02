import { describe, expect, it } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

const arFlat = flatten(ar);
const enFlat = flatten(en);

function placeholders(text: string) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("ملفات الترجمة", () => {
  it("العربية والإنجليزية تحتويان على نفس المفاتيح تمامًا", () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(enFlat).sort());
  });

  it("لا توجد ترجمات فارغة", () => {
    const empty = [...Object.entries(arFlat), ...Object.entries(enFlat)].filter(([, v]) => !v.trim());
    expect(empty).toEqual([]);
  });

  it("المتغيرات داخل النصوص متطابقة بين اللغتين", () => {
    for (const key of Object.keys(enFlat)) {
      expect(placeholders(arFlat[key] ?? ""), key).toEqual(placeholders(enFlat[key]));
    }
  });
});
