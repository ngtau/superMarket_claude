/**
 * D7/§13：动态 sitemap.xml 生成脚本（替代 public/sitemap.xml 的静态 3 条占位）
 *
 * 用法：
 *   pnpm sitemap:generate                       # 输出到 packages/client/public/sitemap.xml
 *   pnpm sitemap:generate --out=./sitemap.xml   # 指定输出路径
 *   SITE_ORIGIN=https://shop.apcube.com pnpm sitemap:generate
 *
 * 为什么做成脚本而不是运行时接口：
 * - sitemap 只在商品上下架时变化，没必要每次请求都查库；
 * - 静态文件能被 CDN 缓存、能被搜索引擎稳定抓取，运行时接口反而增加不确定性与 DB 压力；
 * - D7 定案是"关键页子集预渲染 + PDP SSR/ISR"，在 PDP SSR 未落地前，
 *   用定时任务/发布流程跑一次本脚本，就能让数千 SKU 的 PDP 出现在 sitemap 里，
 *   这是当前阶段成本最低、收益最高的 SEO 动作。
 *
 * ⚠️D7 残留说明：sitemap 有了 ≠ 页面能被抓好。PDP 仍是 SPA，不执行 JS 的爬虫看不到商品内容，
 * 真正解决要靠 vike SSR/ISR（见 docs/后续开发建议与变更说明_v2.md 的 vike 取舍说明）。
 */
import "dotenv/config";
import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { products, categories } from "../db/schema/index.js";

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? process.env.CLIENT_ORIGIN ?? "https://shop.apcube.com";

function parseOutArg(): string {
  const arg = process.argv.find((a) => a.startsWith("--out="));
  if (arg) return arg.slice("--out=".length);
  const here = dirname(fileURLToPath(import.meta.url));
  // 默认写到前端 public 目录，使其随前端构建产物一起发布
  return resolve(here, "../../client/public/sitemap.xml");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

interface UrlEntry { loc: string; priority: string; changefreq: string; lastmod?: string }

async function main() {
  console.log("[sitemap] 查询上架商品与分类...");

  const [shelfProducts, cats] = await Promise.all([
    db.select({ id: products.id, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, "on_shelf")),
    db.select({ id: categories.id }).from(categories),
  ]);

  const staticUrls: UrlEntry[] = [
    { loc: `${SITE_ORIGIN}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${SITE_ORIGIN}/products`, priority: "0.8", changefreq: "daily" },
    { loc: `${SITE_ORIGIN}/support`, priority: "0.4", changefreq: "monthly" },
  ];

  const categoryUrls: UrlEntry[] = cats.map((c) => ({
    loc: `${SITE_ORIGIN}/products?categoryId=${c.id}`,
    priority: "0.6",
    changefreq: "weekly",
  }));

  const productUrls: UrlEntry[] = shelfProducts.map((p) => ({
    loc: `${SITE_ORIGIN}/product/${p.id}`,
    priority: "0.7",
    changefreq: "weekly",
    lastmod: p.updatedAt?.toISOString().slice(0, 10),
  }));

  const all = [...staticUrls, ...categoryUrls, ...productUrls];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- 由 generate-sitemap.ts 自动生成（${new Date().toISOString()}）；静态页 ${staticUrls.length} + 分类 ${categoryUrls.length} + 上架商品 ${productUrls.length} -->`,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...all.map((u) => [
      "  <url>",
      `    <loc>${esc(u.loc)}</loc>`,
      ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
      `    <changefreq>${u.changefreq}</changefreq>`,
      `    <priority>${u.priority}</priority>`,
      "  </url>",
    ].join("\n")),
    "</urlset>",
    "",
  ].join("\n");

  const out = parseOutArg();
  await fs.mkdir(dirname(out), { recursive: true });
  await fs.writeFile(out, xml, "utf-8");

  console.log(`[sitemap] 已写入 ${out}（共 ${all.length} 条 URL）`);
  await pool.end();
}

main().catch((err) => {
  console.error("[sitemap] 失败", err);
  process.exit(1);
});
