/**
 * 演示/联调数据种子（分类 + 商品 + 规格 + 库存）
 *
 * 用法：pnpm db:seed:demo（需先 db:migrate + db:seed）
 *
 * 为什么单独一个脚本而不是并进 seed.ts：
 * - seed.ts 写的是"系统运行必需数据"（角色/权限/D20默认值/初始管理员），任何环境都必须执行；
 * - 本脚本写的是"演示商品"，生产环境绝不能跑（会往真实库里塞假商品），
 *   拆开后生产部署流程只需执行 db:seed，从流程上杜绝误跑；
 * - E2E 依赖可预测的商品数据，本地联调也需要非空首页，两者共用同一份脚本。
 *
 * 幂等：按 nameZh 判断，已存在则跳过，可重复执行。
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { categories, products, productSpecs, inventory } from "../db/schema/index.js";

// E2E 通过 DEMO_PRODUCT_NAME 定位商品，避免依赖"列表第一条"这类不稳定假设
const DEMO_PRODUCT_NAME = "自動化測試商品（勿刪）";

const DEMO_CATEGORIES = [
  { nameZh: "家居生活", nameEn: "Home Living", sort: 1 },
  { nameZh: "廚房用品", nameEn: "Kitchenware", sort: 2 },
];

const DEMO_PRODUCTS = [
  {
    categoryZh: "家居生活",
    nameZh: DEMO_PRODUCT_NAME,
    nameEn: "Automation Test Product (do not delete)",
    descriptionZh: "<p>供自動化測試與本地聯調使用的固定商品，请勿在生產環境出現。</p>",
    descriptionEn: "<p>Fixed fixture product for E2E and local development.</p>",
    priceOriginalCents: 12900,
    priceAfterCents: 9900,
    specs: [
      { specNameZh: "標準", specNameEn: "Standard", weightGrams: 800, stock: 500 },
      { specNameZh: "加大", specNameEn: "Large", weightGrams: 1500, stock: 200 },
    ],
  },
  {
    categoryZh: "家居生活",
    nameZh: "陶瓷馬克杯",
    nameEn: "Ceramic Mug",
    descriptionZh: "<p>手工釉面陶瓷馬克杯，容量 350ml，可微波加熱。</p>",
    descriptionEn: "<p>Hand-glazed ceramic mug, 350ml, microwave safe.</p>",
    priceOriginalCents: 8900,
    priceAfterCents: 6900,
    specs: [{ specNameZh: "標準", specNameEn: "Standard", weightGrams: 400, stock: 120 }],
  },
  {
    categoryZh: "廚房用品",
    nameZh: "不鏽鋼保溫杯 500ml",
    nameEn: "Stainless Steel Thermos 500ml",
    descriptionZh: "<p>316 不鏽鋼內膽，6 小時保溫，附防滑杯底。</p>",
    descriptionEn: "<p>316 stainless steel liner, 6h heat retention, non-slip base.</p>",
    priceOriginalCents: 19900,
    priceAfterCents: 15900,
    specs: [
      { specNameZh: "霧黑", specNameEn: "Matte Black", weightGrams: 600, stock: 80 },
      { specNameZh: "霧白", specNameEn: "Matte White", weightGrams: 600, stock: 80 },
    ],
  },
  {
    categoryZh: "廚房用品",
    nameZh: "竹木砧板",
    nameEn: "Bamboo Cutting Board",
    descriptionZh: "<p>整竹拼接，雙面可用，邊緣導水槽設計。</p>",
    descriptionEn: "<p>Solid bamboo, double-sided, with edge drip groove.</p>",
    priceOriginalCents: 12900,
    priceAfterCents: 9900,
    specs: [{ specNameZh: "中號", specNameEn: "Medium", weightGrams: 900, stock: 60 }],
  },
];

async function upsertCategory(nameZh: string, nameEn: string, sort: number): Promise<string> {
  const [existing] = await db.select().from(categories).where(eq(categories.nameZh, nameZh)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(categories).values({ nameZh, nameEn, sort }).returning();
  return row.id;
}

async function main() {
  console.log("[seed:demo] 写入演示分类...");
  const categoryIdByZh = new Map<string, string>();
  for (const c of DEMO_CATEGORIES) {
    categoryIdByZh.set(c.nameZh, await upsertCategory(c.nameZh, c.nameEn, c.sort));
  }

  console.log("[seed:demo] 写入演示商品与库存...");
  for (const p of DEMO_PRODUCTS) {
    const categoryId = categoryIdByZh.get(p.categoryZh)!;
    const [existing] = await db.select().from(products).where(eq(products.nameZh, p.nameZh)).limit(1);
    if (existing) {
      console.log(`[seed:demo] 跳过已存在商品：${p.nameZh}`);
      continue;
    }

    const [product] = await db
      .insert(products)
      .values({
        nameZh: p.nameZh,
        nameEn: p.nameEn,
        descriptionZh: p.descriptionZh,
        descriptionEn: p.descriptionEn,
        priceOriginalCents: p.priceOriginalCents,
        priceAfterCents: p.priceAfterCents,
        categoryId,
        status: "on_shelf", // 直接上架，否则前台列表查不到
        images: [],
      })
      .returning();

    for (const s of p.specs) {
      const [spec] = await db
        .insert(productSpecs)
        .values({
          productId: product.id,
          specNameZh: s.specNameZh,
          specNameEn: s.specNameEn,
          priceOriginalCents: p.priceOriginalCents,
          priceAfterCents: p.priceAfterCents,
          weightGrams: s.weightGrams, // §7.4 运费按重量计费，E2E 需要可预测的重量
        })
        .returning();
      await db.insert(inventory).values({ skuId: spec.id, stock: s.stock, lockedStock: 0 }).onConflictDoNothing();
    }
    console.log(`[seed:demo] 已创建：${p.nameZh}（${p.specs.length} 个规格）`);
  }

  console.log("[seed:demo] 完成");
  await pool.end();
}

main().catch((err) => {
  console.error("[seed:demo] 失败", err);
  process.exit(1);
});
