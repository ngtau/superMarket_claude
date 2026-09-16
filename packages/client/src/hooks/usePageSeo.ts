import { useEffect } from "react";

interface PageSeoInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  /** JSON-LD 结构化数据对象（Product / BreadcrumbList / Offer 等）。传 null 表示不注入 */
  jsonLd?: Record<string, unknown> | null;
}

const SITE_NAME = "APCube 香港生活百貨";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * D7：SPA 下的页面级 SEO 覆写。
 * - 同步更新 document.title / description / OG / canonical
 * - 以 <script type="application/ld+json"> 注入结构化数据（Product/Offer/BreadcrumbList）
 *
 * ⚠️重要限制（写在这里避免后人误判）：这些标签是**客户端渲染后**才写入 head 的，
 * 对不执行 JS 的爬虫（部分社交平台抓取器、低端爬虫）不可见，SEO 效果弱于服务端渲染。
 * SDRS D7 定案的正式方案是 PDP 走 vike SSR/ISR（v1 未完成，见 docs/后续开发建议）。
 * 本 hook 是「SPA 阶段先有结构化数据、且对 Googlebot 这类执行 JS 的爬虫有效」的过渡实现。
 */
export function usePageSeo({ title, description, imageUrl, jsonLd }: PageSeoInput) {
  useEffect(() => {
    if (title) document.title = `${title} | ${SITE_NAME}`;
    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
    }
    if (title) upsertMeta("property", "og:title", `${title} | ${SITE_NAME}`);
    if (imageUrl) {
      upsertMeta("property", "og:image", imageUrl);
      upsertMeta("name", "twitter:image", imageUrl);
    }
    upsertMeta("property", "og:url", window.location.href);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);

    if (!jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [title, description, imageUrl, jsonLd]);
}
