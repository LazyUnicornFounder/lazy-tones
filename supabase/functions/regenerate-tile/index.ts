const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const createFallbackImage = (label: string) => {
  const safeLabel = escapeXml(label).slice(0, 72);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#f5f4ed"/><rect x="56" y="56" width="1088" height="1088" rx="36" fill="#faf9f5" stroke="#d9d5cb" stroke-width="4"/><text x="600" y="500" text-anchor="middle" font-family="Georgia, serif" font-size="52" fill="#5e5d59">Image unavailable</text><text x="600" y="590" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#7a7974">${safeLabel}</text><text x="600" y="665" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#c96442">Try regenerating this tile</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

async function generateImage(replicateToken: string | undefined, originalPrompt: string, index: number, maxRetries = 5) {
  let prompt = originalPrompt;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateToken}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: { prompt, aspect_ratio: "1:1" },
        }),
      });

      if (resp.status === 429) {
        const retryAfter = parseInt(resp.headers.get("retry-after") || "5", 10);
        console.log(`Rate limited on tile ${index} (attempt ${attempt + 1}), waiting ${retryAfter}s`);
        await resp.text();
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      const responseText = await resp.text();
      let result: any = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error("Replicate parse error tile", index, responseText);
      }

      const message = typeof result?.error === "string"
        ? result.error
        : !resp.ok
          ? responseText || `HTTP ${resp.status}`
          : "";

      if (message) {
        console.error("Replicate error tile", index, message);
        if (message.toLowerCase().includes("flagged") || message.toLowerCase().includes("sensitive")) {
          prompt = `Abstract editorial photograph inspired by ${originalPrompt.replace(/[^a-zA-Z0-9 ,]/g, " ").trim()}`;
          console.log(`Softened prompt for tile ${index}: ${prompt}`);
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      const url = typeof result.output === "string"
        ? result.output
        : (Array.isArray(result.output) ? result.output[0] : "") || "";

      if (url) {
        return { url, sub_prompt: originalPrompt };
      }
    } catch (err) {
      console.error("regenerate-tile image generation failed", err);
    }

    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }

  return { url: createFallbackImage(originalPrompt), sub_prompt: originalPrompt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { board_id, tile_index, tweak_prompt } = await req.json();
    if (!board_id || tile_index === undefined || tile_index < 0 || tile_index > 5) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: board, error: fetchError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", board_id)
      .single();

    if (fetchError || !board) {
      return new Response(JSON.stringify({ error: "Board not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const images = [...((board.images as any[]) || [])];
    const originalPrompt = images[tile_index]?.sub_prompt || board.prompt;
    const imagePrompt = tweak_prompt
      ? `${originalPrompt}. Additional direction: ${tweak_prompt}`
      : originalPrompt;

    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    images[tile_index] = await generateImage(replicateToken, imagePrompt, tile_index);

    const { data: updatedBoard, error: updateError } = await supabase
      .from("boards")
      .update({ images })
      .eq("id", board_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ board: updatedBoard }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("regenerate-tile error:", err);
    return new Response(JSON.stringify({ error: "Regeneration failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});