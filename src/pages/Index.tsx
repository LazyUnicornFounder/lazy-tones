import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Download, Share2 } from "lucide-react";
import { exampleBoards } from "@/lib/example-boards";
import { useAuth } from "@/hooks/useAuth";

const PRICING = [
  { name: "Free", price: "$0", period: "", credits: "2 boards total", features: ["AI-generated mood boards", "Public share links", "PNG export"], cta: "Get Started" },
  { name: "Starter", price: "$9", period: "/mo", credits: "20 boards/month", features: ["Everything in Free", "PDF export", "Priority generation"], cta: "Start Creating", popular: true },
  { name: "Pro", price: "$29", period: "/mo", credits: "100 boards/month", features: ["Everything in Starter", "Tile regeneration", "Private boards"], cta: "Go Pro" },
  { name: "Studio", price: "$79", period: "/mo", credits: "500 boards/month", features: ["Everything in Pro", "Bulk generation", "API access"], cta: "Contact Us" },
];

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const { user, signInWithGoogle } = useAuth();

  const handleGenerate = () => {
    window.location.href = `/app?prompt=${encodeURIComponent(prompt)}`;
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="font-serif text-xl tracking-tight text-foreground">LazyMood</Link>
        <div className="flex items-center gap-4">
          {user && (
            <Link to="/app">
              <Button size="sm">Dashboard</Button>
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
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

      {/* Example Boards */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl text-center mb-12 text-foreground">See what's possible</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {exampleBoards.map((board) => (
              <div key={board.id} className="bg-card rounded-xl border border-border p-5 space-y-4">
                <p className="text-sm text-muted-foreground italic">"{board.prompt}"</p>
                {/* Palette strip */}
                <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
                  {board.palette?.map((color, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5">
                  {board.keywords?.slice(0, 5).map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs font-normal rounded-md">
                      {kw}
                    </Badge>
                  ))}
                </div>
                {/* Fonts */}
                <div className="text-xs text-muted-foreground">
                  <span className="font-serif">{board.fonts?.heading}</span> + {board.fonts?.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-card">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl text-center mb-12 text-foreground">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: "Describe your vibe", desc: "Type a mood, color combo, or aesthetic — our AI understands creative direction." },
              { icon: Zap, title: "AI generates everything", desc: "6 curated images, a color palette, font pairing, and mood keywords — in seconds." },
              { icon: Download, title: "Export & share", desc: "Download as PNG or PDF. Share a public link with clients and collaborators." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6" id="pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl text-center mb-4 text-foreground">Simple pricing</h2>
          <p className="text-center text-muted-foreground mb-12">Start free. Scale when you need to.</p>
          <div className="grid md:grid-cols-4 gap-4">
            {PRICING.map((tier) => (
              <div
                key={tier.name}
                className={`bg-card rounded-xl border p-6 space-y-4 ${
                  tier.popular ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                {tier.popular && (
                  <Badge className="text-xs rounded-md">Most Popular</Badge>
                )}
                <h3 className="text-lg text-foreground">{tier.name}</h3>
                <div>
                  <span className="text-3xl font-serif text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{tier.credits}</p>
                <ul className="space-y-2 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="text-muted-foreground">✓ {f}</li>
                  ))}
                </ul>
                <Button
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full rounded-xl"
                >
                  {tier.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-serif text-foreground">LazyMood</span>
          <span>© {new Date().getFullYear()} LazyMood. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
