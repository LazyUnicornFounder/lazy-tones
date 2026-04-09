const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Get the board (no user check — works for anonymous boards too)
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

    const images = board.images as any[];
    const originalPrompt = images[tile_index]?.sub_prompt || board.prompt;
    const imagePrompt = tweak_prompt
      ? `${originalPrompt}. Additional direction: ${tweak_prompt}`
      : originalPrompt;

    // Regenerate via Replicate
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const resp = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: { prompt: imagePrompt, aspect_ratio: "1:1" },
      }),
    });

    // Handle rate limiting
    if (resp.status === 429) {
      const retryAfter = parseInt(resp.headers.get("retry-after") || "12", 10);
      await resp.text();
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      const retry = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateToken}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: { prompt: imagePrompt, aspect_ratio: "1:1" },
        }),
      });
      const r = await retry.json();
      const url = typeof r.output === "string" ? r.output : (Array.isArray(r.output) ? r.output[0] : "") || "";
      images[tile_index] = { url, sub_prompt: imagePrompt };
    } else {
      const result = await resp.json();
      const url = typeof result.output === "string" ? result.output : (Array.isArray(result.output) ? result.output[0] : "") || "";
      images[tile_index] = { url, sub_prompt: imagePrompt };
    }

    // Update board
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
