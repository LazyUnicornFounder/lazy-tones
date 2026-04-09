import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const { user } = useAuth();

  const handleGenerate = () => {
    window.location.href = `/app?prompt=${encodeURIComponent(prompt)}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-center px-6 py-4">
        <Link to="/" className="font-serif text-xl tracking-tight text-foreground">LazyMood</Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-5xl md:text-6xl leading-tight tracking-tight text-foreground">
            Mood boards in 30 seconds
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
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
              disabled={!prompt}
              className="h-12 px-6 rounded-xl"
            >
              Generate Board <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-serif text-foreground">LazyMood</span>
          <span>© {new Date().getFullYear()} LazyMood. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
