import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ShowcaseImage {
  url: string;
  boardId: string;
  prompt: string;
}

const SHOWCASE_CACHE_KEY = "showcase-ticker:v2";
const ROW_COUNT = 2;
const MAX_PER_ROW = 6;
const BOARD_LIMIT = ROW_COUNT * MAX_PER_ROW;

function normalizeImages(value: unknown): Array<{ url?: string }> {
  if (!value) return [];
  if (Array.isArray(value)) return value as Array<{ url?: string }>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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
            typeof item?.boardId === "string" &&
            typeof item?.prompt === "string"
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
  const items = images.length > 0 ? [...images, ...images] : [];
  const duration = Math.max(90, images.length * 10);
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
          <a
            key={`${img.boardId}-${i}`}
            href={`/board/${img.boardId}`}
            className="group block shrink-0"
            aria-label={`Open ${img.prompt}`}
          >
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
                  const link = e.currentTarget.closest("a");
                  if (link) link.style.display = "none";
                }}
              />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ShowcaseTicker() {
  const [rows, setRows] = useState<ShowcaseImage[][]>(() => readCachedRows());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (rows.length > 0) {
      setLoading(false);
    }

    async function fetchShowcase() {
      const { data, error } = await supabase
        .from("boards")
        .select("id, prompt, images")
        .eq("is_public", true)
        .not("images", "is", null)
        .order("created_at", { ascending: false })
        .limit(BOARD_LIMIT);

      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }

      const previewImages: ShowcaseImage[] = data.flatMap((board) => {
        const images = normalizeImages(board.images);
        const previewUrl = images
          .map((img) => (typeof img?.url === "string" ? img.url.trim() : ""))
          .find((url) => url.length > 0 && !url.startsWith("data:"));

        return previewUrl ? [{ url: previewUrl, boardId: board.id, prompt: board.prompt }] : [];
      });

      const nextRows: ShowcaseImage[][] = [];
      for (let i = 0; i < ROW_COUNT; i++) {
        const start = i * MAX_PER_ROW;
        const slice = previewImages.slice(start, start + MAX_PER_ROW);
        if (slice.length > 0) nextRows.push(slice);
      }

      if (cancelled) return;

      if (nextRows.length > 0) {
        setRows(nextRows);
        writeCachedRows(nextRows);
      }

      setLoading(false);
    }

    fetchShowcase();
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows.length === 0 && loading) {
    return (
      <section className="space-y-3 overflow-hidden py-12" aria-hidden="true">
        <p className="mb-6 text-center text-xs uppercase tracking-wide text-muted-foreground">
          Loading recent boards from the community
        </p>
        {Array.from({ length: ROW_COUNT }).map((_, rowIndex) => (
          <div key={`skeleton-row-${rowIndex}`} className="flex gap-3 overflow-hidden px-1">
            {Array.from({ length: MAX_PER_ROW }).map((__, itemIndex) => (
              <Skeleton
                key={`skeleton-${rowIndex}-${itemIndex}`}
                className="h-32 w-32 shrink-0 rounded-xl md:h-40 md:w-40"
              />
            ))}
          </div>
        ))}
      </section>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3 overflow-hidden py-12">
      <p className="mb-6 text-center text-xs uppercase tracking-wide text-muted-foreground">
        Click to see recent boards from the community
      </p>
      {rows.map((row, index) => (
        <TickerRow key={`row-${index}`} images={row} reverse={index % 2 === 1} />
      ))}
    </section>
  );
}

