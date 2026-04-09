import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Board } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import LoadingBoard from "@/components/LoadingBoard";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Loader2, ArrowRight, RefreshCw, Download, Share2, Image as ImageIcon, AlertCircle, Check } from "lucide-react";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regeneratingTile, setRegeneratingTile] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt || generating) return;
    setGenerating(true);
    setSubmittedPrompt(prompt);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-board", {
        body: { prompt },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        return;
      }
      if (data?.board) {
        setActiveBoard(data.board as Board);
        setPrompt("");
      }
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(err?.message || "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating]);

  const handleRegenerateTile = async (tileIndex: number) => {
    if (!activeBoard || regeneratingTile !== null) return;
    setRegeneratingTile(tileIndex);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-tile", {
        body: { board_id: activeBoard.id, tile_index: tileIndex },
      });
      if (error) throw error;
      if (data?.board) {
        setActiveBoard(data.board as Board);
      }
    } catch (err) {
      console.error("Regeneration failed:", err);
      toast.error("Regeneration failed. Try again.");
    } finally {
      setRegeneratingTile(null);
    }
  };

  const handleShare = async () => {
    if (!activeBoard) return;
    const url = `${window.location.origin}/board/${activeBoard.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleExport = async () => {
    if (!boardRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: "#f5f4ed",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `lazymood-${activeBoard?.prompt?.slice(0, 30).replace(/\s+/g, "-") || "board"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Board exported as PNG!");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-center px-6 py-4">
        <span className="font-serif text-xl tracking-tight text-foreground">LazyMood</span>
      </nav>

      {/* Main content */}
      {!activeBoard && !generating ? (
        /* Hero — prompt entry */
        <section className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl leading-tight tracking-tight text-foreground">
              Mood boards in 60 seconds
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Describe a vibe. Get images, palette, fonts, keywords. Export anywhere.
            </p>
            <div className="flex gap-3 max-w-xl mx-auto mt-8">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Try: earthy wedding, terracotta + cream, rustic Italian"
                className="h-12 text-base rounded-xl bg-card border-border"
                onKeyDown={(e) => e.key === "Enter" && prompt && handleGenerate()}
              />
              <Button
                onClick={handleGenerate}
                disabled={!prompt || generating}
                className="h-12 px-6 rounded-xl"
              >
                <ArrowRight className="ml-1 h-4 w-4" />
                Generate Board
              </Button>
            </div>
            {error && (
              <div className="max-w-xl mx-auto p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-left">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            )}
          </div>
        </section>
      ) : generating ? (
        /* Loading experience */
        <LoadingBoard prompt={submittedPrompt} />
      ) : (
        /* Board result */
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground italic">"{activeBoard.prompt}"</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setActiveBoard(null)}
                >
                  New Board
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={handleShare}>
                  <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  {exporting ? "Exporting…" : "Export"}
                </Button>
              </div>
            </div>

            {/* 9-tile grid */}
            <div ref={boardRef} className="grid grid-cols-3 gap-4">
              {activeBoard.images?.slice(0, 6).map((img, i) => (
                <div key={i} className="relative group aspect-square bg-accent rounded-xl overflow-hidden">
                  {regeneratingTile === i ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 skeleton-shimmer">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <span className="text-xs text-muted-foreground">Regenerating…</span>
                    </div>
                  ) : img.url ? (
                    <img src={img.url} alt={img.sub_prompt} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  {regeneratingTile !== i && (
                    <button
                      onClick={() => handleRegenerateTile(i)}
                      className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <RefreshCw className="h-5 w-5 text-primary-foreground" />
                    </button>
                  )}
                </div>
              ))}

              {Array.from({ length: Math.max(0, 6 - (activeBoard.images?.length || 0)) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-accent rounded-xl flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                </div>
              ))}

              {/* Palette tile */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Palette</p>
                <div className="space-y-1.5">
                  {activeBoard.palette?.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md" style={{ backgroundColor: color }} />
                      <span className="text-xs text-muted-foreground font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fonts tile */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Fonts</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Heading</p>
                    <p className="text-lg font-serif text-foreground">{activeBoard.fonts?.heading}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Body</p>
                    <p className="text-sm text-foreground">{activeBoard.fonts?.body}</p>
                  </div>
                </div>
              </div>

              {/* Keywords tile */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeBoard.keywords?.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs font-normal rounded-md">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="text-foreground">LazyMood is part of <a href="https://lazyfounderventures.com" target="_blank" rel="noopener noreferrer" className="font-serif underline underline-offset-2 hover:text-primary transition-colors">Lazy Founder Ventures</a></span>
          <span>© {new Date().getFullYear()} LazyMood. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
