import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Board } from "@/types/board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";

const SHOWCASE_FEED_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/showcase-images/showcase/feed.json`;

interface FeedItem {
  boardId: string;
  prompt: string;
  url: string;
}

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [siblings, setSiblings] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });

  // Load sibling board IDs from the showcase feed
  useEffect(() => {
    if (!id) return;
    fetch(SHOWCASE_FEED_URL)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const items: FeedItem[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const idx = items.findIndex((item) => item.boardId === id);
        if (idx === -1) return;
        setSiblings({
          prev: idx > 0 ? items[idx - 1].boardId : null,
          next: idx < items.length - 1 ? items[idx + 1].boardId : null,
        });
      })
      .catch(() => {});
  }, [id]);

  const goTo = useCallback((boardId: string | null) => {
    if (boardId) navigate(`/board/${boardId}`);
  }, [navigate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") navigate("/");
    if (e.key === "ArrowLeft") goTo(siblings.prev);
    if (e.key === "ArrowRight") goTo(siblings.next);
  }, [navigate, goTo, siblings]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("boards")
      .select("*")
      .eq("id", id)
      .eq("is_public", true)
      .single()
      .then(({ data }) => {
        setBoard(data as unknown as Board | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Board not found or is private.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-serif text-xl tracking-tight text-foreground">Lazy Tones</Link>
          {(siblings.prev || siblings.next) && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={!siblings.prev}
                onClick={() => goTo(siblings.prev)}
                aria-label="Previous board"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={!siblings.next}
                onClick={() => goTo(siblings.next)}
                aria-label="Next board"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="outline" size="sm" className="rounded-xl">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Home
            </Button>
          </Link>
          <Link to="/">
            <Button size="sm" className="rounded-xl">
              Make your own <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground italic">"{board.prompt}"</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {board.images?.slice(0, 6).map((img, i) => (
            <div key={i} className="aspect-square bg-accent rounded-xl overflow-hidden">
              {img.url ? (
                <img src={img.url} alt={img.sub_prompt} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}

          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Palette</p>
            <div className="space-y-1.5">
              {board.palette?.map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md" style={{ backgroundColor: color }} />
                  <span className="text-xs text-muted-foreground font-mono">{color}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Fonts</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Heading</p>
                <p className="text-lg font-serif text-foreground">{board.fonts?.heading}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Body</p>
                <p className="text-sm text-foreground">{board.fonts?.body}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Keywords</p>
            <div className="flex flex-wrap gap-1.5">
              {board.keywords?.map((kw) => (
                <Badge key={kw} variant="secondary" className="text-xs font-normal rounded-md">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
