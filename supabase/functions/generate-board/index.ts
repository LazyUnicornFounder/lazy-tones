const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";

const SYSTEM = `You are a creative director. Given a vibe, return a mood board spec as JSON:
{
  "image_prompts": [6 detailed Flux 2 Pro prompts — hero shot, texture, detail, scene, object, accent],
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

    // Generate 6 images in parallel via Replicate
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const imagePromises = spec.image_prompts.slice(0, 6).map((p: string) =>
      fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${replicateToken}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          version: "black-forest-labs/flux-2-pro",
          input: { prompt: p, aspect_ratio: "1:1" },
        }),
      }).then((r) => r.json())
    );

    const imageResults = await Promise.all(imagePromises);
    const images = imageResults.map((r: any, i: number) => ({
      url: r.output?.[0] || r.output || "",
      sub_prompt: spec.image_prompts[i],
    }));

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
