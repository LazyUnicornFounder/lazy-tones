/**
 * Prompt ideas for the hero section.
 * Shuffled daily using a date-based seed so users see fresh order each day.
 */

const PROMPT_IDEAS = [
  // Vibes & aesthetics
  "Earthy wedding, terracotta + cream, rustic Italian",
  "90s nostalgia, neon lights, VHS aesthetic",
  "Scandinavian minimalism, light wood, soft neutrals",
  "Tropical maximalism, bold prints, palm leaves",
  "Dark academia, leather-bound books, candlelight",
  "Coastal grandmother, linen, driftwood, sea glass",
  "Y2K futurism, chrome, iridescent, bubblegum pink",
  "Japanese wabi-sabi, imperfect ceramics, moss",
  "Art deco glamour, gold leaf, emerald green",
  "Cottagecore, wildflowers, handmade quilts, honey",
  // Movies & TV
  "The Grand Budapest Hotel — pastel pink, lobby elegance",
  "Blade Runner 2049 — hazy orange, neon dystopia",
  "Wes Anderson's Moonrise Kingdom — khaki, scouts, golden hour",
  "Studio Ghibli — lush greens, cozy interiors, soft magic",
  "The Great Gatsby — roaring 20s, champagne, midnight blue",
  "Mad Men — mid-century office, bourbon, teal and walnut",
  "Amélie — Montmartre, warm reds, whimsical Paris",
  "Lost in Translation — Tokyo haze, pastel loneliness, neon",
  "Her — soft peach, futuristic loneliness, warm minimalism",
  "Spirited Away — bathhouse gold, spirit world, enchanted water",
  "Twin Peaks — Douglas fir, cherry pie, eerie Americana",
  "Succession — old money, navy blazers, helicopter views",
  "Barbie — hot pink, dreamhouse plastic, retro glam",
  "Everything Everywhere All at Once — googly eyes, multiverse chaos, laundromat",
  // Places
  "Morocco — spice markets, zellige tile, warm ochre",
  "Amalfi Coast — lemon groves, azure water, sun-bleached stone",
  "Tokyo at night — rain-slicked streets, kanji signs, neon",
  "Patagonia — glacial blue, rugged peaks, wind-swept plains",
  "Santorini — whitewash, cobalt domes, bougainvillea pink",
  "Kyoto in autumn — crimson maples, temple stone, mist",
  "Havana — vintage cars, peeling pastels, rum and cigars",
  "Marrakech riad — courtyard fountain, mosaic, orange blossom",
  "Iceland — volcanic black sand, geothermal steam, aurora green",
  "Buenos Aires — tango halls, wrought iron, café con leche",
  "Lisbon — azulejo tiles, tram yellow, pastel de nata",
  "Bali — rice terraces, temple incense, frangipani",
  "New York in winter — steam grates, yellow cabs, snow on brownstones",
  "Scottish Highlands — heather purple, castle ruins, single malt",
  "Seoul — hanok rooftops, neon alleyways, kimchi jars",
  "Venice — gondola black, carnival masks, crumbling palazzo",
  "Rajasthan — marigold garlands, blue city walls, camel dust",
  "Swiss Alps — chalet wood, fondue, pristine white peaks",
  "Copenhagen — hygge, candlelit windows, bicycle baskets",
  // Books & literature
  "Haruki Murakami novel — quiet surrealism, jazz bars, rain",
  "Lord of the Rings — mossy stone, ancient forests, candlelit halls",
  "Dune — desert gold, brutalist architecture, spice haze",
  "Pride & Prejudice — English countryside, muslin, morning light",
  "The Secret Garden — ivy walls, hidden doors, wild roses",
  "Kafka on the Shore — cats, libraries, liminal spaces",
  "Normal People — Dublin rain, silver chain, quiet intimacy",
  "Little Women — patchwork quilts, ink-stained fingers, New England autumn",
  "1984 — surveillance gray, brutalist concrete, red sash",
  "One Hundred Years of Solitude — yellow butterflies, tropical decay, magic realism",
  // Music
  "Lo-fi hip hop study session — rainy window, warm lamp, coffee",
  "Bowie's Ziggy Stardust — glam rock, lightning bolt, glitter",
  "Frank Ocean Blonde — pool blue, sun-bleached, melancholy",
  "Billie Eilish — slime green, darkness, oversized everything",
  "Jazz club at midnight — smoky air, double bass, amber light",
  "Fleetwood Mac Rumours — 70s California, golden light, vinyl",
  "Daft Punk — chrome helmets, French house, LED grids",
  "Radiohead Kid A — glacial, glitchy, anxious beauty",
  "Tyler the Creator — pastel suits, golf le fleur, cherry bomb",
  "Sade — smooth operator, velvet burgundy, candlelit lounge",
  "The Weeknd After Hours — Las Vegas neon, bloodied suit, red",
  "Björk — Icelandic avant-garde, swan dress, digital nature",
  "Kendrick Lamar — Compton sun, kung fu, crown of thorns",
  "Amy Winehouse — beehive, Camden Town, heartbreak jazz",
  // Food & drink
  "Italian nonna's kitchen — fresh pasta, terracotta, olive oil",
  "Tokyo ramen shop — steam, neon signage, wooden counter",
  "French patisserie — macarons, marble, pastel pink and gold",
  "Sunday farmers market — heirloom tomatoes, linen tote, sunlight",
  "Mezcal bar — smoky agave, copper, dim candlelight",
  "Afternoon tea — bone china, scones, floral tablecloth",
  "Seoul street food — tteokbokki red, plastic stools, steam",
  "Oaxacan mole — dried chili, chocolate, hand-ground spices",
  "Parisian wine bar — zinc counter, chalkboard menu, natural wine",
  "Vietnamese pho — herbs, broth steam, morning light, street stool",
  // Fashion
  "90s supermodel off-duty — leather jacket, sunglasses, taxi cab",
  "Rei Kawakubo — deconstructed, avant-garde, monochrome",
  "Old Céline — Phoebe Philo minimalism, camel, clean lines",
  "Streetwear Tokyo — layered, techwear, Harajuku neon",
  "Audrey Hepburn in Rome — ballet flats, Vespa, gelato",
  "Rick Owens — post-apocalyptic drape, concrete, brutalismo",
  "Vivienne Westwood — punk tartan, safety pins, rebellion",
  "Bottega Veneta — woven leather, quiet luxury, forest green",
  "70s disco — platform boots, sequin jumpsuit, mirror ball",
  "Princess Diana off-duty — bike shorts, Harvard sweatshirt, shy wave",
  // Nature
  "Pacific Northwest — moss, fog, cedar, cabin fireplace",
  "African savanna at golden hour — acacia trees, warm dust",
  "Norwegian fjords — deep blue, slate gray, wool blankets",
  "Cherry blossom season — sakura pink, gentle rain, temple paths",
  "Deep ocean — bioluminescence, midnight blue, jellyfish glow",
  "Redwood forest — cathedral light, fern floor, ancient bark",
  "Desert night — star blanket, coyote silhouette, cool sand",
  "Coral reef — electric turquoise, clownfish orange, living color",
  "Autumn New England — maple red, stone walls, cider smoke",
  "Tropical rainforest — canopy green, macaw scarlet, waterfall mist",
  "Lavender fields at dusk — Provence purple, golden light, bees",
  // Tech & futurism
  "Retro computing — CRT green, floppy disks, pixel art",
  "Solarpunk utopia — rooftop gardens, bamboo, clean energy",
  "Cyberpunk Akira — neon Tokyo, motorcycles, red capsule",
  "Apple keynote — clean white, product hero, sans-serif",
  "Vaporwave — pink sunset, Roman bust, Windows 95, palm tree",
  "Space station — zero gravity, Earth glow, sterile white",
  "Bitcoin maximalist — orange pill, laser eyes, digital gold",
  "AI art studio — diffusion noise, latent space, glitch beauty",
  // Art & culture
  "Frida Kahlo — bold flowers, Mexican folk art, vibrant pain",
  "Rothko chapel — color fields, contemplation, muted light",
  "Basquiat — raw crowns, graffiti, neo-expressionist chaos",
  "Vermeer — Dutch golden age, soft window light, blue and pearl",
  "Ukiyo-e woodblock — Hokusai waves, flat color, Edo Japan",
  "Bauhaus — primary colors, geometric, form follows function",
  "Memphis design — squiggles, terrazzo, pastel postmodern",
  "De Stijl — Mondrian grid, red yellow blue, black lines",
  "Klimt — gold leaf, embrace, Byzantine pattern",
  "Georgia O'Keeffe — desert skull, magnified petals, New Mexico sky",
  "Monet's garden — water lilies, soft impressionist blur, Giverny",
  "Caravaggio — dramatic chiaroscuro, candlelit faces, baroque shadow",
  // Life & mood
  "Sunday morning — fresh sheets, croissant, golden light",
  "Road trip across Route 66 — dusty motels, diners, open sky",
  "Rainy day in London — cobblestones, tea, bookshop windows",
  "Summer camp nostalgia — fireflies, canoes, friendship bracelets",
  "Moving to a new city — cardboard boxes, first coffee, hope",
  "Late night coding — dark mode, mechanical keyboard, green terminal",
  "First apartment — IKEA shelves, mismatched mugs, tiny balcony",
  "Golden hour picnic — wicker basket, sourdough, warm grass",
  "Bookshop cat — stacked paperbacks, reading nook, afternoon dust",
  "Airport at 5 AM — empty gates, coffee, liminal quiet",
  "Vinyl record store — crate digging, warm wood, album art walls",
  "Greenhouse morning — potting soil, glass panes, tropical humidity",
  // Seasons & weather
  "Midsummer Scandinavia — midnight sun, wildflower crowns, lake swim",
  "Monsoon Mumbai — rain-soaked streets, chai, green bursts",
  "First snow — wool coat, breath clouds, quiet city",
  "Indian summer — amber light, dry leaves, last warm evening",
  // Architecture & interiors
  "Brutalist library — raw concrete, skylight, hushed reverence",
  "Palm Springs midcentury — pool turquoise, pink door, cactus",
  "Tokyo capsule hotel — compact, neon glow, efficient calm",
  "Parisian apartment — herringbone floor, tall windows, molding",
  "Adobe desert home — earth walls, terracotta pots, turquoise accents",
  "London townhouse — black door, brass knocker, wisteria",
  // Eras & decades
  "1920s Berlin cabaret — smoky velvet, kohl eyes, jazz",
  "1950s American diner — chrome stools, milkshake pink, jukebox",
  "1960s space age — mod furniture, Eero Saarinen, orbit orange",
  "1970s bohemian commune — macramé, earth tones, Van life",
  "1980s Miami Vice — pastel suits, flamingo, convertible sunset",
  // Textures & materials
  "Raw linen and dried flowers — neutral, textured, undone beauty",
  "Hammered brass and velvet — moody luxury, emerald and gold",
  "Reclaimed wood and concrete — industrial warmth, Edison bulbs",
  "Handmade ceramics — glaze drips, earth tones, kiln marks",
  "Woven rattan and terracotta — bohemian warmth, sunset hues",
  // Emotions & concepts
  "Quiet confidence — muted tones, tailored lines, breathing room",
  "Joyful chaos — confetti, primary colors, movement everywhere",
  "Bittersweet nostalgia — faded photos, amber, soft grain",
  "Electric anticipation — charged air, deep indigo, gold sparks",
  "Gentle rebellion — soft pink, barbed wire, contradiction",
];

/** Simple seeded PRNG (mulberry32) */
function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle with seeded RNG */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  const rng = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Day-based seed so order changes daily */
function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

/** Get the daily-shuffled prompt ideas */
export function getDailyPromptIdeas(): string[] {
  return shuffleWithSeed(PROMPT_IDEAS, getDaySeed());
}
