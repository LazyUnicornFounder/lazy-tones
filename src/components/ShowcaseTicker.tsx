import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShowcaseImage {
  url: string;
  boardId: string;
  prompt: string;
}

function TickerRow({ images, reverse }: { images: ShowcaseImage[]; reverse: boolean }) {
  // Duplicate for seamless loop
  const items = [...images, ...images];
  const duration = 40 + images.length * 2;

  return (
    <div className="overflow-hidden relative">
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
            <div className="w-36 h-36 md:w-44 md:h-44 rounded-xl overflow-hidden bg-accent">
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

      // Extract all valid images
      const allImages: ShowcaseImage[] = [];
      for (const board of data) {
        const imgs = board.images as any[];
        if (!imgs) continue;
        for (const img of imgs) {
          if (img?.url && !img.url.startsWith("data:")) {
            allImages.push({ url: img.url, boardId: board.id, prompt: board.prompt });
          }
        }
      }

      if (allImages.length < 6) return;

      // Split into 3 rows
      const perRow = Math.ceil(allImages.length / 3);
      const r: ShowcaseImage[][] = [];
      for (let i = 0; i < 3; i++) {
        const slice = allImages.slice(i * perRow, (i + 1) * perRow);
        if (slice.length >= 3) r.push(slice);
      }
      setRows(r);
    }

    fetchShowcase();
  }, []);

  if (rows.length === 0) return null;

  return (
    <section className="py-12 space-y-3 overflow-hidden">
      <p className="text-center text-sm text-muted-foreground mb-6">Recent boards from the community</p>
      {rows.map((row, i) => (
        <TickerRow key={i} images={row} reverse={i % 2 === 1} />
      ))}
    </section>
  );
}
