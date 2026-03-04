import { describe, it, expect } from "vitest";
import { extractServerExports } from "../runtime/server-action-transform";

describe("extractServerExports", () => {
  it("finds async function exports", () => {
    const code = `"use server";\nexport async function submit(d) { return d; }`;
    expect(extractServerExports(code)).toContain("submit");
  });

  it("finds sync function exports", () => {
    const code = `"use server";\nexport function get() { return []; }`;
    expect(extractServerExports(code)).toContain("get");
  });

  it("finds async arrow const exports", () => {
    const code = `"use server";\nexport const submit = async (d) => { return d; };`;
    expect(extractServerExports(code)).toContain("submit");
  });

  it("finds sync arrow const exports", () => {
    const code = `"use server";\nexport const getUser = (id) => ({ id });`;
    expect(extractServerExports(code)).toContain("getUser");
  });

  it("finds multiple mixed exports", () => {
    const code = `"use server";\nexport async function create(d) {}\nexport const update = async (id) => {};\nexport function remove(id) {}`;
    const exports = extractServerExports(code);
    expect(exports).toContain("create");
    expect(exports).toContain("update");
    expect(exports).toContain("remove");
  });

  it("returns empty array without use server directive", () => {
    expect(extractServerExports(`export async function fn() {}`)).toEqual([]);
  });

  it("does not include non-exported functions", () => {
    const code = `"use server";\nasync function internal() {}\nexport async function pub() {}`;
    const exports = extractServerExports(code);
    expect(exports).toContain("pub");
    expect(exports).not.toContain("internal");
  });
});
