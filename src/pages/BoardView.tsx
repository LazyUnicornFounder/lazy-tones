import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Board } from "@/types/board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Image as ImageIcon } from "lucide-react";

export default function BoardView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") navigate("/");
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  useEffect(() => {
    if (!id) return;
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
        <Link to="/" className="font-serif text-xl tracking-tight text-foreground">Lazy Tones</Link>
        <Link to="/">
          <Button size="sm" className="rounded-xl">
            Make your own <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
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
