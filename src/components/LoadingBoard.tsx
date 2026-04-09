import { useState, useEffect } from "react";

const STEPS = [
  { label: "Analyzing your vibe…", icon: "✨" },
  { label: "Crafting color palette…", icon: "🎨" },
  { label: "Selecting typography…", icon: "✍️" },
  { label: "Finding keywords…", icon: "🏷️" },
  { label: "Generating image 1 of 6…", icon: "🖼️" },
  { label: "Generating image 2 of 6…", icon: "🖼️" },
  { label: "Generating image 3 of 6…", icon: "🖼️" },
  { label: "Generating image 4 of 6…", icon: "🖼️" },
  { label: "Generating image 5 of 6…", icon: "🖼️" },
  { label: "Generating image 6 of 6…", icon: "🖼️" },
  { label: "Assembling your board…", icon: "📋" },
];

const INSPIRATIONS = [
  { quote: "Design is intelligence made visible.", author: "Alina Wheeler" },
  { quote: "Color is a power which directly influences the soul.", author: "Wassily Kandinsky" },
  { quote: "Less is more.", author: "Ludwig Mies van der Rohe" },
  { quote: "Good design is obvious. Great design is transparent.", author: "Joe Sparano" },
  { quote: "Typography is the craft of endowing human language with a durable visual form.", author: "Robert Bringhurst" },
];

interface LoadingBoardProps {
  prompt: string;
}

export default function LoadingBoard({ prompt }: LoadingBoardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteFading, setQuoteFading] = useState(false);

  // Advance steps on a timer to simulate progress
  useEffect(() => {
    const timings = [2000, 3000, 2000, 2000, 8000, 8000, 8000, 8000, 8000, 8000, 3000];
    if (stepIndex >= STEPS.length - 1) return;
    const timer = setTimeout(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), timings[stepIndex] || 5000);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteFading(true);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % INSPIRATIONS.length);
        setQuoteFading(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-4xl w-full mx-auto space-y-10">
        {/* Progress section */}
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="text-base animate-bounce" style={{ animationDuration: "1.5s" }}>
              {STEPS[stepIndex].icon}
            </span>
            <span className="transition-all duration-300">{STEPS[stepIndex].label}</span>
          </div>
        </div>

        {/* Inspirational quote */}
        <div className="text-center">
          <p
            className={`text-xs text-muted-foreground/60 italic max-w-lg mx-auto transition-opacity duration-400 ${
              quoteFading ? "opacity-0" : "opacity-100"
            }`}
          >
            "{INSPIRATIONS[quoteIndex].quote}" <span className="hidden md:inline">— {INSPIRATIONS[quoteIndex].author}</span>
            <span className="block md:hidden mt-0.5">— {INSPIRATIONS[quoteIndex].author}</span>
          </p>
        </div>

        {/* Prompt echo */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Creating mood board for</p>
          <p className="text-xl font-serif text-foreground italic">"{prompt}"</p>
        </div>

        {/* Skeleton grid */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl overflow-hidden relative"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="absolute inset-0 bg-accent skeleton-shimmer" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`w-10 h-10 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center transition-all duration-700 ${
                    stepIndex >= 4 + i ? "border-primary/40 scale-110" : ""
                  }`}
                >
                  <span className="text-lg">{stepIndex >= 4 + i ? "🖼️" : (i + 1)}</span>
                </div>
              </div>
              {stepIndex >= 4 + i && (
                <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-xl" />
              )}
            </div>
          ))}
          {/* Palette skeleton */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-3 w-12 bg-accent skeleton-shimmer rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-md skeleton-shimmer transition-colors duration-500 ${
                    stepIndex >= 1 ? "bg-primary/20" : "bg-accent"
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                />
                <div className="h-3 w-14 bg-accent skeleton-shimmer rounded" style={{ animationDelay: `${i * 100}ms` }} />
              </div>
            ))}
          </div>
          {/* Fonts skeleton */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-3 w-10 bg-accent skeleton-shimmer rounded" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-accent skeleton-shimmer rounded" />
              <div
                className={`h-6 w-28 skeleton-shimmer rounded transition-colors duration-500 ${
                  stepIndex >= 2 ? "bg-primary/15" : "bg-accent"
                }`}
              />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-10 bg-accent skeleton-shimmer rounded" />
              <div className="h-4 w-24 bg-accent skeleton-shimmer rounded" />
            </div>
          </div>
          {/* Keywords skeleton */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-3 w-16 bg-accent skeleton-shimmer rounded" />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-5 rounded-md skeleton-shimmer transition-colors duration-500 ${
                    stepIndex >= 3 ? "bg-primary/10" : "bg-accent"
                  }`}
                  style={{ width: `${40 + Math.random() * 30}px`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
