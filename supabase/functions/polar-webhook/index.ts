import { createClient } from "npm:@supabase/supabase-js@2";

const PLAN_CREDITS: Record<string, number> = {
  free: 2,
  starter: 20,
  pro: 100,
  studio: 500,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify webhook signature
    const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET")!;
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing webhook headers", { status: 400 });
    }

    const body = await req.text();
    const event = JSON.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const eventType = event.type;

    if (eventType === "subscription.active" || eventType === "subscription.updated") {
      const subscription = event.data;
      const customerId = subscription.customer?.external_id;
      if (!customerId) return new Response("No customer ID", { status: 200 });

      const productName = subscription.product?.name?.toLowerCase() || "free";
      const plan = Object.keys(PLAN_CREDITS).find((p) => productName.includes(p)) || "free";
      const credits = PLAN_CREDITS[plan] || 2;

      await supabase
        .from("profiles")
        .update({
          plan,
          credits_remaining: credits,
          polar_customer_id: subscription.customer?.id,
        })
        .eq("id", customerId);
    }

    if (eventType === "subscription.canceled" || eventType === "subscription.revoked") {
      const subscription = event.data;
      const customerId = subscription.customer?.external_id;
      if (!customerId) return new Response("No customer ID", { status: 200 });

      await supabase
        .from("profiles")
        .update({ plan: "free", credits_remaining: 2 })
        .eq("id", customerId);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("polar-webhook error:", err);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
