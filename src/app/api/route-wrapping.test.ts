// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 全 API ルートのハンドラが withApiErrorHandling で包まれていることを固定する。
 *
 * 捕捉されない例外を `500 { error }` に変換する責務はラッパーにあり、包み忘れると
 * そのルートだけ Next.js 既定の 500（spec が定める `{ error }` 形式でない）に戻る。
 * ルート追加のたびに人が気づく必要がないよう、構造として検査する。
 */
const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

/** 配下の route.ts をすべて列挙する（追加ライブラリに依存しない） */
function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return findRouteFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

describe("API ルートのエラーハンドリング", () => {
  it("全ハンドラが withApiErrorHandling で包まれている", () => {
    const files = findRouteFiles(join(process.cwd(), "src/app/api"));
    expect(files.length).toBeGreaterThan(0);

    const unwrapped: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      for (const method of HTTP_METHODS) {
        // 包まれている形: export const GET = withApiErrorHandling(
        const wrapped = new RegExp(`^export const ${method} = withApiErrorHandling\\(`, "m").test(
          source,
        );
        // 包まれていない形: export async function GET( / export const GET = (
        const bare = new RegExp(
          `^export (async function ${method}\\(|const ${method} = (?!withApiErrorHandling))`,
          "m",
        ).test(source);
        if (bare && !wrapped) unwrapped.push(`${file}: ${method}`);
      }
    }

    expect(
      unwrapped,
      `withApiErrorHandling で包まれていないハンドラ:\n${unwrapped.join("\n")}`,
    ).toEqual([]);
  });
});
