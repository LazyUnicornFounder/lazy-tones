import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShowcaseImage {
  url: string;
  boardId?: string;
  prompt: string;
}

const SHOWCASE_CACHE_KEY = "showcase-ticker:v3";
const SHOWCASE_FEED_PATH = "showcase/feed.json";
const ROW_COUNT = 2;
const MAX_PER_ROW = 6;
const BOARD_LIMIT = ROW_COUNT * MAX_PER_ROW;

const STARTER_VIBES = [
  { prompt: "Wes Anderson scouts at golden hour", palette: ["#faf9f5", "#eadfce", "#c96442"] },
  { prompt: "Amalfi stone, lemons, and sea glass", palette: ["#faf9f5", "#efe5bf", "#8b6f4e"] },
  { prompt: "Bowie glam with midnight navy accents", palette: ["#faf9f5", "#d7c2b5", "#7d4b3f"] },
  { prompt: "Coastal grandmother linen and driftwood", palette: ["#faf9f5", "#ddd1c4", "#b78563"] },
  { prompt: "Roaring twenties champagne after dark", palette: ["#faf9f5", "#dfcfb3", "#8a5a44"] },
  { prompt: "Ukiyo-e waves and inked woodgrain", palette: ["#faf9f5", "#d5c4b3", "#6f5a4d"] },
  { prompt: "90s off-duty leather and taxi light", palette: ["#faf9f5", "#e5d8c8", "#a65d41"] },
  { prompt: "Scandinavian wood, wool, and winter sun", palette: ["#faf9f5", "#e6dccf", "#8b725d"] },
  { prompt: "Art deco lounge in brushed brass", palette: ["#faf9f5", "#e7d7bd", "#9f6c45"] },
  { prompt: "Mid-century mountain house fireplace", palette: ["#faf9f5", "#decfbe", "#8a624b"] },
  { prompt: "Paris bookstore paperbacks and espresso", palette: ["#faf9f5", "#e8d8cb", "#9d5f46"] },
  { prompt: "Studio pottery, oat milk, soft shadow", palette: ["#faf9f5", "#e3d6ca", "#b66f4d"] },
] as const;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapPrompt(prompt: string) {
  const words = prompt.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 18 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 2);
}

function createStarterPreview(prompt: string, palette: readonly [string, string, string]) {
  const [background, surface, accent] = palette;
  const lines = wrapPrompt(prompt);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
      <rect width="320" height="320" rx="30" fill="${background}"/>
      <circle cx="88" cy="92" r="54" fill="${surface}"/>
      <circle cx="244" cy="86" r="62" fill="${accent}" fill-opacity="0.16"/>
      <rect x="42" y="178" width="236" height="96" rx="22" fill="#faf9f5" stroke="#e6ddd2"/>
      <rect x="42" y="42" width="52" height="8" rx="4" fill="#141413" fill-opacity="0.14"/>
      <rect x="104" y="42" width="38" height="8" rx="4" fill="#141413" fill-opacity="0.08"/>
      <rect x="42" y="286" width="52" height="10" rx="5" fill="${accent}" fill-opacity="0.9"/>
      <rect x="100" y="286" width="34" height="10" rx="5" fill="#d8c8ba"/>
      <rect x="140" y="286" width="22" height="10" rx="5" fill="#8b6f4e" fill-opacity="0.35"/>
      ${lines
        .map(
          (line, index) =>
            `<text x="42" y="${220 + index * 28}" fill="#141413" font-family="Georgia, serif" font-size="19">${escapeXml(line)}</text>`
        )
        .join("")}
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildRows(items: ShowcaseImage[]) {
  const nextRows: ShowcaseImage[][] = [];

  for (let i = 0; i < ROW_COUNT; i++) {
    const start = i * MAX_PER_ROW;
    const slice = items.slice(start, start + MAX_PER_ROW);
    if (slice.length > 0) nextRows.push(slice);
  }

  return nextRows;
}

function createStarterRows() {
  return buildRows(
    STARTER_VIBES.map((item) => ({
      prompt: item.prompt,
      url: createStarterPreview(item.prompt, item.palette),
    }))
  );
}

function normalizeFeedRows(value: unknown): ShowcaseImage[][] {
  const parsed = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { items?: unknown[] }).items)
      ? (value as { items: unknown[] }).items
      : [];

  const items = parsed
    .filter((item): item is ShowcaseImage => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as ShowcaseImage;
      return typeof candidate.url === "string" && candidate.url.trim().length > 0 && typeof candidate.prompt === "string" && candidate.prompt.trim().length > 0;
    })
    .map((item) => ({
      url: item.url.trim(),
      prompt: item.prompt.trim(),
      boardId: typeof item.boardId === "string" && item.boardId.trim().length > 0 ? item.boardId.trim() : undefined,
    }))
    .slice(0, BOARD_LIMIT);

  return buildRows(items);
}

function readCachedRows(): ShowcaseImage[][] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(SHOWCASE_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((row): row is ShowcaseImage[] => Array.isArray(row))
      .map((row) =>
        row.filter(
          (item): item is ShowcaseImage =>
            typeof item?.url === "string" &&
            typeof item?.prompt === "string" &&
            (typeof item?.boardId === "string" || typeof item?.boardId === "undefined")
        )
      )
      .filter((row) => row.length > 0);
  } catch {
    return [];
  }
}

function writeCachedRows(rows: ShowcaseImage[][]) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SHOWCASE_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore cache failures.
  }
}

function TickerRow({ images, reverse }: { images: ShowcaseImage[]; reverse: boolean }) {
  // Repeat images enough times to guarantee no visible gaps during scroll.
  // Each tile is ~160px + 12px gap ≈ 172px; we need at least 2× viewport width.
  const repeatCount = images.length > 0 ? Math.max(4, Math.ceil((2 * 1920) / (images.length * 172))) : 0;
  const items: ShowcaseImage[] = [];
  for (let r = 0; r < repeatCount; r++) {
    items.push(...images);
  }
  const duration = Math.max(60, images.length * 8);
  const eagerImageCount = images.length;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 h-full w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 h-full w-16 bg-gradient-to-l from-background to-transparent" />
      <div
        className={`flex w-max gap-3 will-change-transform ${reverse ? "animate-ticker-reverse" : "animate-ticker"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {items.map((img, i) => (
          <div key={`${img.boardId ?? img.prompt}-${i}`} className="group block shrink-0">
            {img.boardId ? (
              <a href={`/board/${img.boardId}`} aria-label={`Open ${img.prompt}`}>
                <div className="h-32 w-32 overflow-hidden rounded-xl bg-accent md:h-40 md:w-40">
                  <img
                    src={img.url}
                    alt={`Mood board preview for ${img.prompt}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading={i < eagerImageCount ? "eager" : "lazy"}
                    fetchPriority={i < Math.min(eagerImageCount, 4) ? "high" : "low"}
                    decoding="async"
                    width={160}
                    height={160}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const tile = e.currentTarget.closest(".group");
                      if (tile) tile.setAttribute("style", "display:none");
                    }}
                  />
                </div>
              </a>
            ) : (
              <div className="h-32 w-32 overflow-hidden rounded-xl bg-accent md:h-40 md:w-40">
                <img
                  src={img.url}
                  alt={`Starter vibe for ${img.prompt}`}
                  className="h-full w-full object-cover"
                  loading={i < eagerImageCount ? "eager" : "lazy"}
                  fetchPriority={i < Math.min(eagerImageCount, 4) ? "high" : "low"}
                  decoding="async"
                  width={160}
                  height={160}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShowcaseTicker() {
  const [rows, setRows] = useState<ShowcaseImage[][]>(() => {
    const cachedRows = readCachedRows();
    return cachedRows.length > 0 ? cachedRows : createStarterRows();
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchShowcase() {
      try {
        const { data } = supabase.storage.from("showcase-images").getPublicUrl(SHOWCASE_FEED_PATH);
        const cacheKey = Math.floor(Date.now() / 300000);
        const response = await fetch(`${data.publicUrl}?v=${cacheKey}`, {
          headers: { accept: "application/json" },
        });

        if (!response.ok || cancelled) return;

        const payload = await response.json();
        const nextRows = normalizeFeedRows(payload);

        if (cancelled || nextRows.length === 0) return;

        setRows(nextRows);
        writeCachedRows(nextRows);
      } catch {
        // Keep starter previews or cached rows when the live feed is unavailable.
      }
    }

    fetchShowcase();
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3 overflow-hidden py-12">
      <p className="mb-6 text-center text-xs uppercase tracking-wide text-muted-foreground">
        Explore starter vibes and fresh community boards
      </p>
      {rows.map((row, index) => (
        <TickerRow key={`row-${index}`} images={row} reverse={index % 2 === 1} />
      ))}
    </section>
  );
}

