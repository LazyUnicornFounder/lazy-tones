const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { ensureShowcaseCoverUrl, getPreviewSource, syncShowcaseFeedItem } from "../_shared/showcase.ts";

const createFallbackImage = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#f5f4ed"/><circle cx="280" cy="280" r="190" fill="#e8ded0"/><circle cx="910" cy="330" r="210" fill="#c96442" fill-opacity="0.18"/><circle cx="420" cy="880" r="220" fill="#d7c2b5" fill-opacity="0.7"/><rect x="500" y="640" width="420" height="220" rx="40" fill="#faf9f5" stroke="#e2dbd2" stroke-width="4"/><path d="M570 785C625 700 705 675 780 700C840 720 878 770 900 830" fill="none" stroke="#8b6f4e" stroke-opacity="0.35" stroke-width="18" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

async function generateGatewayImage(apiKey: string | null, imagePrompt: string): Promise<string> {
  if (!apiKey) return "";

  try {
    const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Create one square editorial photograph inspired by: ${imagePrompt}. No text, no collage, no watermarks, no typography.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!gatewayResp.ok) {
      console.error("Gateway image fallback error:", gatewayResp.status, await gatewayResp.text());
      return "";
    }

    const gatewayData = await gatewayResp.json();
    return gatewayData?.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
  } catch (error) {
    console.error("Gateway image fallback failed:", error);
    return "";
  }
}

async function generateImage(replicateToken: string | undefined, apiKey: string | null, originalPrompt: string, index: number, maxRetries = 5) {
  let prompt = originalPrompt;

  if (!replicateToken) {
    const gatewayImage = await generateGatewayImage(apiKey, prompt);
    return { url: gatewayImage.trim() || createFallbackImage(), sub_prompt: originalPrompt };
  }

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
        const lowered = message.toLowerCase();
        if (lowered.includes("flagged") || lowered.includes("sensitive")) {
          prompt = `Abstract editorial photograph inspired by ${originalPrompt.replace(/[^a-zA-Z0-9 ,]/g, " ").trim()}`;
          console.log(`Softened prompt for tile ${index}: ${prompt}`);
          const gatewayImage = await generateGatewayImage(apiKey, prompt);
          if (gatewayImage) {
            return { url: gatewayImage.trim(), sub_prompt: originalPrompt };
          }
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      const url = typeof result.output === "string"
        ? result.output.trim()
        : (Array.isArray(result.output) ? String(result.output[0] || "").trim() : "");

      if (url) {
        return { url, sub_prompt: originalPrompt };
      }
    } catch (err) {
      console.error("regenerate-tile image generation failed", err);
    }

    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }

  const gatewayImage = await generateGatewayImage(apiKey, prompt);
  return { url: gatewayImage.trim() || createFallbackImage(), sub_prompt: originalPrompt };
}

const edgeRuntime = (globalThis as typeof globalThis & {
  EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
}).EdgeRuntime;

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    images[tile_index] = await generateImage(replicateToken, lovableApiKey, imagePrompt, tile_index);

    const { data: updatedBoard, error: updateError } = await supabase
      .from("boards")
      .update({ images })
      .eq("id", board_id)
      .select()
      .single();

    if (updateError) throw updateError;

    const showcaseSync = (async () => {
      if (board.is_public === false) return;

      const previewSource = getPreviewSource(images);
      const coverUrl = await ensureShowcaseCoverUrl(supabase, board_id, previewSource);

      if (!coverUrl) return;

      await syncShowcaseFeedItem(supabase, {
        boardId: board_id,
        prompt: board.prompt,
        url: coverUrl,
      });
    })().catch((error) => {
      console.error("showcase sync error:", error);
    });

    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(showcaseSync);
    } else {
      await showcaseSync;
    }

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