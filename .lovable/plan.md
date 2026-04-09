

# LazyMood — AI Mood Board Generator

## Design System
- Background `#f5f4ed`, cards `#faf9f5`, brand terracotta `#c96442`, text `#141413`/`#5e5d59`
- Georgia serif headings (font-medium), Inter body, 8px/16px radii, generous whitespace
- No gradients, no cool grays, no heavy shadows

## Pages & Components

### Landing Page (`/`)
- Hero with "Mood boards in 30 seconds" headline, subhead, big prompt input with "Generate Board" CTA
- 3 pre-generated example boards in a grid
- Pricing section (Free/Starter/Pro/Studio tiers via Polar checkout)
- Minimal footer

### Dashboard (`/app`) — Auth required (Google OAuth)
- Top bar: prompt input + Generate button + credits remaining badge
- Left sidebar: list of past boards (thumbnail + prompt preview)
- Center: active 9-tile board grid (6 images + palette strip + fonts card + keywords card)
- Each image tile has hover "Regenerate" overlay
- Export toolbar: PNG, PDF, Share Link

### Public Board View (`/board/:id`)
- Read-only 9-tile grid with palette hex codes, font live previews, keyword cloud
- "Make your own" CTA linking to landing

## Database (Supabase)
- `profiles` table (id, email, plan, credits_remaining, polar_customer_id)
- `boards` table (id, user_id, prompt, palette, fonts, keywords, images, is_public)
- RLS: own profile/boards + public boards readable
- Auto-create profile trigger on auth.users insert

## Edge Functions
1. **generate-board**: Validates credits → calls Anthropic Claude Haiku 4.5 for creative direction (palette, fonts, keywords, 6 image prompts) → calls Replicate Flux 2 Pro 6× in parallel → saves board + decrements credits
2. **regenerate-tile**: Takes board_id + tile_index + optional tweak prompt → regenerates single image via Replicate → updates board
3. **polar-webhook**: Validates Polar webhook signature → updates user plan + credits on subscription events

## Payments (Polar)
- 4 products: Free (2 boards), Starter $9/mo (20), Pro $29/mo (100), Studio $79/mo (500)
- Checkout via Polar hosted page, customer portal for subscription management
- Webhook syncs plan/credits to profiles table

## Auth
- Google OAuth via Supabase Auth
- Protected `/app` route with auth guard

## Secrets Required
- `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`

