import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/types/api";

/**
 * §5.1 首页轮播广告：自动轮播（5s）+ 手动左右切换 + 指示点跳转 + 点击整图跳转。
 * DoD 要求「支持自动轮播、手动切换；点击跳转对应商品/活动页；移动端触控友好」：
 * - 手动操作后暂停自动轮播 10s，避免"刚点开就被切走"（常见体感问题）
 * - 指针事件兼容触屏滑动（pointerdown/pointerup 判定横向位移 > 40px 视为翻页）
 * - 图本身包在 <Link> 里，键盘可聚焦；仅单张时不渲染箭头与指示点
 */
export function BannerCarousel({ banners, intervalMs = 5000 }: { banners: Banner[]; intervalMs?: number }) {
  const { i18n } = useTranslation();
  const zh = i18n.language === "zh-HK";
  const [index, setIndex] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    if (pausedAt !== null && Date.now() - pausedAt < 10000) {
      const timer = setTimeout(() => setPausedAt(null), 10000 - (Date.now() - pausedAt));
      return () => clearTimeout(timer);
    }
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs, pausedAt]);

  if (count === 0) return null;

  const go = (next: number) => {
    setIndex((next + count) % count);
    setPausedAt(Date.now());
  };

  const copy = (b: Banner) => (zh ? b.copyZh : b.copyEn) || b.copyZh || b.copyEn || "";

  const handlePointerDown = (e: React.PointerEvent) => { pointerStartX.current = e.clientX; };
  const handlePointerUp = (e: React.PointerEvent) => {
    const start = pointerStartX.current;
    if (start === null) return;
    const dx = e.clientX - start;
    pointerStartX.current = null;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-jade touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="relative h-[220px] sm:h-[300px] md:h-[360px]">
        {banners.map((b, i) => {
          const slideClass = `absolute inset-0 block transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0 pointer-events-none"}`;
          const inner = (
            <>
              {b.imageUrl && <img src={b.imageUrl} alt={copy(b)} className="w-full h-full object-cover" />}
              {copy(b) && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-5">
                  <p className="text-paper font-display text-lg md:text-2xl font-bold max-w-2xl leading-snug">{copy(b)}</p>
                </div>
              )}
            </>
          );
          // 无跳转链接的轮播图不该渲染成指向 "#" 的死链，退化成普通容器
          return b.link ? (
            <Link key={b.id} to={b.link} className={slideClass} aria-hidden={i !== index} tabIndex={i === index ? 0 : -1}>
              {inner}
            </Link>
          ) : (
            <div key={b.id} className={slideClass} aria-hidden={i !== index}>{inner}</div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            aria-label={zh ? "上一張" : "Previous"}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-paper flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label={zh ? "下一張" : "Next"}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-paper flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={`${i + 1}`}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-brass" : "bg-paper/50 hover:bg-paper/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
