import { createClient } from "npm:@supabase/supabase-js@2";
import { ensureShowcaseCoverUrl, getPreviewSource, syncShowcaseFeedItem } from "../_shared/showcase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PROMPTS = [
  "Wes Anderson's Moonrise Kingdom — khaki, scouts, golden hour",
  "Cyberpunk Akira — neon Tokyo, motorcycles, red capsule",
  "Amalfi Coast — lemon groves, azure water, sun-bleached stone",
  "Ukiyo-e woodblock — Hokusai waves, flat color, Edo Japan",
  "90s supermodel off-duty — leather jacket, sunglasses, taxi cab",
  "Bowie's Ziggy Stardust — glam rock, lightning bolt, glitter",
  "The Great Gatsby — roaring 20s, champagne, midnight blue",
  "Scandinavian minimalism, light wood, soft neutrals",
  "coastal grandmother, linen, driftwood, sea glass",
  "mid century modern mountain house",
];

const SYSTEM = `You are a creative director. Given a vibe, return a mood board spec as JSON:
{
  "image_prompts": [3 detailed photo prompts — hero shot, texture, scene],
  "palette": [5 hex colors that match the vibe],
  "fonts": { "heading": "Google Font name", "body": "Google Font name" },
  "keywords": [8-12 descriptive single words]
}
Return ONLY the JSON, no markdown.`;

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const edgeRuntime = (globalThis as typeof globalThis & {
  EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
}).EdgeRuntime;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "AI not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Accept a single prompt or pick one from defaults
  let prompt: string;
  try {
    const body = await req.json();
    prompt = typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];
  } catch {
    prompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];
  }

  console.log(`=== Generating board: ${prompt} ===`);

  // Step 1: Get creative direction
  const specResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

  if (!specResp.ok) {
    const errText = await specResp.text();
    console.error("Spec error:", specResp.status, errText);
    return new Response(JSON.stringify({ error: `Spec failed: ${specResp.status}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const specData = await specResp.json();
  const rawText = specData.choices?.[0]?.message?.content || "";
  const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  let spec: any;
  try {
    spec = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse spec:", rawText.slice(0, 200));
    return new Response(JSON.stringify({ error: "Failed to parse AI spec" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 2: Generate 3 images and upload to storage
  const imagePrompts: string[] = Array.isArray(spec.image_prompts)
    ? spec.image_prompts.filter((p: unknown) => typeof p === "string").slice(0, 3)
    : [];

  const fallbacks = ["hero editorial composition", "material texture close-up", "atmospheric scene"];
  const finalPrompts = Array.from({ length: 3 }, (_, i) =>
    imagePrompts[i] || `${prompt}. ${fallbacks[i]}`
  );

  const boardId = crypto.randomUUID();
  const images: { url: string; sub_prompt: string }[] = [];

  for (let i = 0; i < finalPrompts.length; i++) {
    const imgPrompt = finalPrompts[i];
    console.log(`  Image ${i + 1}/3: ${imgPrompt.slice(0, 60)}...`);

    try {
      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{
            role: "user",
            content: `Create one square editorial photograph inspired by: ${imgPrompt}. No text, no collage, no watermarks, no typography.`,
          }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        console.error(`  Image gen failed: ${imgResp.status}`);
        continue;
      }

      const imgData = await imgResp.json();
      const dataUrl = imgData?.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";

      if (!dataUrl || !dataUrl.startsWith("data:")) {
        console.error("  No image data returned");
        continue;
      }

      const b64 = dataUrl.split(",")[1];
      if (!b64) continue;

      const bytes = base64ToUint8Array(b64);
      const filePath = `${boardId}/${i}.png`;

      const { error: uploadErr } = await supabase.storage
        .from("showcase-images")
        .upload(filePath, bytes, { contentType: "image/png", upsert: true });

      if (uploadErr) {
        console.error("  Upload error:", uploadErr.message);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from("showcase-images")
        .getPublicUrl(filePath);

      images.push({ url: publicUrl.publicUrl, sub_prompt: imgPrompt });
      console.log(`  ✓ Uploaded image ${i + 1}`);
    } catch (imgErr: any) {
      console.error(`  Image ${i + 1} error:`, imgErr?.message);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  if (images.length === 0) {
    return new Response(JSON.stringify({ error: "No images generated" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Step 3: Insert board
  const { error: insertErr } = await supabase.from("boards").insert({
    id: boardId,
    prompt,
    palette: spec.palette,
    fonts: spec.fonts,
    keywords: spec.keywords,
    images,
    is_public: true,
  });

  if (insertErr) {
    console.error("  Insert error:", insertErr.message);
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const showcaseSync = (async () => {
    const previewSource = getPreviewSource(images);
    const coverUrl = await ensureShowcaseCoverUrl(supabase, boardId, previewSource);

    if (!coverUrl) return;

    await syncShowcaseFeedItem(supabase, {
      boardId,
      prompt,
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

  console.log(`✓ Board created: ${boardId} with ${images.length} images`);
  return new Response(
    JSON.stringify({ boardId, prompt, imageCount: images.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
