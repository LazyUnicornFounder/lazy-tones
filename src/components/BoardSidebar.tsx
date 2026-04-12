import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Board } from "@/types/board";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getDailyPromptIdeas } from "@/lib/prompt-ideas";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ArrowRight, LogOut, LayoutGrid } from "lucide-react";

interface BoardSidebarProps {
  onGenerate: (prompt: string) => void;
  generating: boolean;
  activeBoardId?: string | null;
}

export default function BoardSidebar({ onGenerate, generating, activeBoardId }: BoardSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [sidebarPrompt, setSidebarPrompt] = useState("");
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const promptIdeas = useMemo(() => getDailyPromptIdeas().slice(0, 5), []);

  useEffect(() => {
    if (!user) return;
    const fetchBoards = async () => {
      const { data } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setBoards(data as unknown as Board[]);
    };
    const fetchCredits = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits_remaining")
        .eq("id", user.id)
        .single();
      if (data) setCreditsRemaining(data.credits_remaining);
    };
    fetchBoards();
    fetchCredits();
  }, [user, activeBoardId]);

  const handleSubmit = () => {
    if (!sidebarPrompt.trim() || generating) return;
    onGenerate(sidebarPrompt.trim());
    setSidebarPrompt("");
  };

  if (!user) return null;

  return (
    <Sidebar className="border-r border-border bg-card w-72 min-w-[288px]">
      <SidebarContent className="p-5 space-y-5 overflow-y-auto">
        {/* Prompt input */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-0">
            New Board
          </SidebarGroupLabel>
           <SidebarGroupContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={sidebarPrompt}
                onChange={(e) => setSidebarPrompt(e.target.value)}
                placeholder="Describe a vibe…"
                className="h-10 text-sm rounded-lg bg-background border-border"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button
                size="sm"
                className="h-10 px-3 rounded-lg shrink-0"
                onClick={handleSubmit}
                disabled={!sidebarPrompt.trim() || generating}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Try</p>
              {promptIdeas.map((idea) => (
                <button
                  key={idea}
                  onClick={() => {
                    setSidebarPrompt(idea);
                    onGenerate(idea);
                  }}
                  className="block w-full text-left text-[13px] leading-snug text-muted-foreground hover:text-foreground py-1 transition-colors"
                >
                  {idea}
                </button>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Boards list */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground font-medium px-0 flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            My Boards ({boards.length})
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {boards.map((board) => (
                <SidebarMenuItem key={board.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeBoardId === board.id}
                  >
                    <button
                      onClick={() => navigate(`/board/${board.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {board.palette?.[0] && (
                          <div
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: board.palette[0] }}
                          />
                        )}
                        <span className="truncate text-xs">{board.prompt}</span>
                      </div>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {boards.length === 0 && (
                <p className="text-xs text-muted-foreground/60 py-2 px-2">
                  No boards yet. Create your first one!
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border space-y-2">
        {creditsRemaining !== null && (
          <p className="text-xs text-muted-foreground">
            {creditsRemaining} board{creditsRemaining !== 1 ? "s" : ""} remaining
          </p>
        )}
        <Button variant="outline" size="sm" className="w-full rounded-lg text-xs" onClick={signOut}>
          <LogOut className="h-3 w-3 mr-1" /> Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
