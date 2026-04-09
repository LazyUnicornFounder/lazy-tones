const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";

const SYSTEM = `You are a creative director. Given a vibe, return a mood board spec as JSON:
{
  "image_prompts": [3 detailed Flux 2 Pro prompts — hero shot, texture, scene],
  "palette": [5 hex colors that match the vibe],
  "fonts": { "heading": "Google Font name", "body": "Google Font name" },
  "keywords": [8-12 descriptive single words]
}
Return ONLY the JSON, no markdown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth is optional — check if user is signed in
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    // If signed in, check credits
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_remaining")
        .eq("id", userId)
        .single();

      if (profile && profile.credits_remaining <= 0) {
        return new Response(JSON.stringify({ error: "No credits remaining" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get creative direction from Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiResp;
    try {
      const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: `Vibe: ${prompt}` },
          ],
        }),
      });

      if (!gatewayResp.ok) {
        const errText = await gatewayResp.text();
        console.error("AI Gateway error:", gatewayResp.status, errText);
        if (gatewayResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (gatewayResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "AI service unavailable" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      aiResp = await gatewayResp.json();
    } catch (aiError: any) {
      console.error("AI Gateway error:", aiError?.message || aiError);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let spec;
    try {
      const rawText = aiResp.choices?.[0]?.message?.content || "";
      // Strip markdown fences if present
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      spec = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", aiResp.choices?.[0]?.message?.content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 3 images with guarded fallbacks
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const SHOT_FALLBACKS = [
      "hero editorial composition",
      "material texture close-up",
      "atmospheric interior or environment scene",
    ];
    const promptCandidates = Array.isArray(spec.image_prompts)
      ? spec.image_prompts.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const prompts = Array.from({ length: 3 }, (_, index) =>
      promptCandidates[index] || `${prompt}. ${SHOT_FALLBACKS[index]}`
    );

    const createFallbackImage = () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#f5f4ed"/><circle cx="280" cy="280" r="190" fill="#e8ded0"/><circle cx="910" cy="330" r="210" fill="#c96442" fill-opacity="0.18"/><circle cx="420" cy="880" r="220" fill="#d7c2b5" fill-opacity="0.7"/><rect x="500" y="640" width="420" height="220" rx="40" fill="#faf9f5" stroke="#e2dbd2" stroke-width="4"/><path d="M570 785C625 700 705 675 780 700C840 720 878 770 900 830" fill="none" stroke="#8b6f4e" stroke-opacity="0.35" stroke-width="18" stroke-linecap="round"/></svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    };

    async function generateGatewayImage(imagePrompt: string): Promise<string> {
      if (!LOVABLE_API_KEY) return "";

      try {
        const gatewayResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    async function generateImage(originalPrompt: string, index: number, maxRetries = 5): Promise<{ url: string; sub_prompt: string }> {
      let prompt = originalPrompt;

      if (!replicateToken) {
        const gatewayImage = await generateGatewayImage(prompt);
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
              const gatewayImage = await generateGatewayImage(prompt);
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
        } catch (e) {
          console.error("Image gen failed for tile", index, "attempt", attempt + 1, e);
        }

        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }

      const gatewayImage = await generateGatewayImage(prompt);
      return { url: gatewayImage.trim() || createFallbackImage(), sub_prompt: originalPrompt };
    }

    const images: { url: string; sub_prompt: string }[] = [];
    for (let start = 0; start < prompts.length; start += 2) {
      const batch = prompts.slice(start, start + 2);
      const batchImages = await Promise.all(
        batch.map((imagePrompt, offset) => generateImage(imagePrompt, start + offset))
      );

      images.push(
        ...batchImages.map((image, offset) => ({
          url: image.url.trim() || createFallbackImage(),
          sub_prompt: image.sub_prompt.trim() || batch[offset],
        }))
      );

      if (start + 2 < prompts.length) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    // Save board (user_id is null for anonymous users)
    const { data: board, error: insertError } = await supabase
      .from("boards")
      .insert({
        user_id: userId,
        prompt,
        palette: spec.palette,
        fonts: spec.fonts,
        keywords: spec.keywords,
        images,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Decrement credits if signed in
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_remaining")
        .eq("id", userId)
        .single();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ credits_remaining: profile.credits_remaining - 1 })
          .eq("id", userId);
      }
    }

    return new Response(JSON.stringify({ board }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-board error:", err);
    return new Response(JSON.stringify({ error: "Generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
