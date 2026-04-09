import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShowcaseImage {
  url: string;
  boardId: string;
  prompt: string;
}

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

function canLoadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

function TickerRow({ images, reverse }: { images: ShowcaseImage[]; reverse: boolean }) {
  const items = images.length > 0 ? [...images, ...images] : [];
  const duration = Math.max(28, images.length * 2.5);

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
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
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
  const [rows, setRows] = useState<ShowcaseImage[][]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchShowcase() {
      const { data } = await supabase
        .from("boards")
        .select("id, prompt, images")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!data || cancelled) return;

      const rawImages: ShowcaseImage[] = data.flatMap((board) => {
        const images = normalizeImages(board.images);
        return images
          .map((img) => (typeof img?.url === "string" ? img.url.trim() : ""))
          .filter((url) => url.length > 0 && !url.startsWith("data:"))
          .map((url) => ({ url, boardId: board.id, prompt: board.prompt }));
      });

      const checked = await Promise.all(
        rawImages.slice(0, 60).map(async (image) => ({
          image,
          ok: await canLoadImage(image.url),
        }))
      );

      if (cancelled) return;

      const validImages = checked.filter((entry) => entry.ok).map((entry) => entry.image);
      if (validImages.length === 0) {
        setRows([]);
        return;
      }

      const maxPerRow = 10;
      const nextRows: ShowcaseImage[][] = [];
      for (let i = 0; i < 3; i++) {
        const start = i * maxPerRow;
        const slice = validImages.slice(start, start + maxPerRow);
        if (slice.length > 0) nextRows.push(slice);
      }

      setRows(nextRows);
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
        Recent boards from the community
      </p>
      {rows.map((row, index) => (
        <TickerRow key={`row-${index}`} images={row} reverse={index % 2 === 1} />
      ))}
    </section>
  );
}

