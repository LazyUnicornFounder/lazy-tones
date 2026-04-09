import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShowcaseImage {
  url: string;
  boardId: string;
  prompt: string;
}

function TickerRow({ images, reverse }: { images: ShowcaseImage[]; reverse: boolean }) {
  // Duplicate enough times to fill viewport seamlessly
  const items = [...images, ...images, ...images];
  const duration = 60 + images.length * 3;

  return (
    <div className="overflow-hidden relative">
      {/* Edge fades */}
      <div className="absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      <div
        className={`flex gap-3 ${reverse ? "animate-ticker-reverse" : "animate-ticker"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {items.map((img, i) => (
          <a
            key={`${img.boardId}-${i}`}
            href={`/board/${img.boardId}`}
            className="shrink-0 group"
          >
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden bg-accent">
              <img
                src={img.url}
                alt={img.prompt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
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
    async function fetchShowcase() {
      const { data } = await supabase
        .from("boards")
        .select("id, prompt, images")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!data || data.length === 0) return;

      // Extract all valid images (skip data URIs and empty URLs)
      const allImages: ShowcaseImage[] = [];
      for (const board of data) {
        const imgs = board.images as any[];
        if (!imgs) continue;
        for (const img of imgs) {
          if (img?.url && typeof img.url === "string" && img.url.startsWith("http")) {
            allImages.push({ url: img.url, boardId: board.id, prompt: board.prompt });
          }
        }
      }

      if (allImages.length < 9) return;

      // Shuffle deterministically by day
      const daySeed = new Date().getDate();
      const shuffled = [...allImages].sort((a, b) => {
        const ha = (a.url.length * 31 + daySeed) % 1000;
        const hb = (b.url.length * 31 + daySeed) % 1000;
        return ha - hb;
      });

      // Split evenly into 3 rows
      const perRow = Math.ceil(shuffled.length / 3);
      const r: ShowcaseImage[][] = [];
      for (let i = 0; i < 3; i++) {
        const slice = shuffled.slice(i * perRow, (i + 1) * perRow);
        if (slice.length >= 3) r.push(slice);
      }
      setRows(r);
    }

    fetchShowcase();
  }, []);

  if (rows.length === 0) return null;

  return (
    <section className="py-12 space-y-3 overflow-hidden">
      <p className="text-center text-xs text-muted-foreground mb-6 tracking-wide uppercase">
        Recent boards from the community
      </p>
      {rows.map((row, i) => (
        <TickerRow key={i} images={row} reverse={i % 2 === 1} />
      ))}
    </section>
  );
}
