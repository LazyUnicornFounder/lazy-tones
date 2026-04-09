import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Board, Profile } from "@/types/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Download, Share2, LogOut, Image as ImageIcon, Sparkles } from "lucide-react";

export default function Dashboard() {
  const { user, loading: authLoading, signOut, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState(searchParams.get("prompt") || "");
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  // No auth redirect — allow anonymous board generation

  // Auto-generate if arriving with prompt from landing page
  useEffect(() => {
    if (prompt && !autoTriggered && !generating && !authLoading) {
      setAutoTriggered(true);
      handleGenerate();
    }
  }, [authLoading]);
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBoards();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (data) setProfile(data as unknown as Profile);
  };

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("boards")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) {
      const typed = data as unknown as Board[];
      setBoards(typed);
      if (typed.length > 0 && !activeBoard) setActiveBoard(typed[0]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt || generating) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-board", {
        body: { prompt },
      });
      if (error) throw error;
      if (data?.board) {
        const board = data.board as Board;
        setActiveBoard(board);
        setBoards((prev) => [board, ...prev]);
        setProfile((prev) => prev ? { ...prev, credits_remaining: prev.credits_remaining - 1 } : prev);
        setPrompt("");
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateTile = async (tileIndex: number) => {
    if (!activeBoard) return;
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-tile", {
        body: { board_id: activeBoard.id, tile_index: tileIndex },
      });
      if (error) throw error;
      if (data?.board) {
        const board = data.board as Board;
        setActiveBoard(board);
        setBoards((prev) => prev.map((b) => (b.id === board.id ? board : b)));
      }
    } catch (err) {
      console.error("Regeneration failed:", err);
    }
  };

  const handleShare = async () => {
    if (!activeBoard) return;
    const url = `${window.location.origin}/board/${activeBoard.id}`;
    await navigator.clipboard.writeText(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-4">
        <span className="font-serif text-lg text-foreground mr-4">LazyMood</span>
        <div className="flex-1 flex gap-3 max-w-xl">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a vibe..."
            className="h-10 rounded-xl bg-card"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <Button onClick={handleGenerate} disabled={!prompt || generating} className="rounded-xl">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generate
          </Button>
        </div>
        {user && (
          <Badge variant="secondary" className="rounded-md text-xs">
            {profile?.credits_remaining ?? 0} credits
          </Badge>
        )}
        {user ? (
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={signInWithGoogle}>
            Sign in
          </Button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border overflow-y-auto p-4 space-y-2 hidden md:block">
          <p className="text-xs text-muted-foreground font-medium mb-3">Your boards</p>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setActiveBoard(board)}
              className={`w-full text-left p-3 rounded-xl text-sm transition-colors ${
                activeBoard?.id === board.id ? "bg-primary/10 text-foreground" : "hover:bg-accent text-muted-foreground"
              }`}
            >
              <p className="truncate">{board.prompt}</p>
              <div className="flex gap-0.5 mt-2 h-2 rounded overflow-hidden">
                {board.palette?.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
            </button>
          ))}
          {boards.length === 0 && (
            <p className="text-xs text-muted-foreground">No boards yet. Generate your first!</p>
          )}
        </aside>

        {/* Board view */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeBoard ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground italic">"{activeBoard.prompt}"</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={handleShare}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Download className="h-3.5 w-3.5 mr-1" /> Export
                  </Button>
                </div>
              </div>

              {/* 9-tile grid */}
              <div className="grid grid-cols-3 gap-4">
                {activeBoard.images?.slice(0, 6).map((img, i) => (
                  <div key={i} className="relative group aspect-square bg-accent rounded-xl overflow-hidden">
                    {img.url ? (
                      <img src={img.url} alt={img.sub_prompt} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <button
                      onClick={() => handleRegenerateTile(i)}
                      className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <RefreshCw className="h-5 w-5 text-primary-foreground" />
                    </button>
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
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 mx-auto text-primary/40" />
                <p className="text-sm">Describe a vibe to generate your first mood board</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
