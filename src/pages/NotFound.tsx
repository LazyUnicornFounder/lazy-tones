import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <span className="font-serif text-xl text-foreground mb-12">Lazy Tones</span>
      <p className="text-6xl font-serif text-foreground mb-3">404</p>
      <p className="text-muted-foreground mb-8">This page doesn't exist.</p>
      <Link to="/">
        <Button className="rounded-xl">
          Back to home <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
