const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.39.0";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

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

    // Get creative direction from Claude
    const aiResp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20250512",
      max_tokens: 2000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Vibe: ${prompt}` }],
    });

    const spec = JSON.parse(aiResp.content[0].text);

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
