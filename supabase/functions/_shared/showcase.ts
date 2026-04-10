const SHOWCASE_BUCKET = "showcase-images";
const SHOWCASE_FEED_PATH = "showcase/feed.json";
const SHOWCASE_LIMIT = 12;
const STORAGE_PUBLIC_FRAGMENT = `/storage/v1/object/public/${SHOWCASE_BUCKET}/`;

export interface ShowcaseFeedItem {
  boardId: string;
  prompt: string;
  url: string;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeContentType(value: string | null | undefined) {
  return value?.split(";")[0]?.trim()?.toLowerCase() || "image/png";
}

function extensionForContentType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "png";
  }
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toFeedItem(value: unknown): ShowcaseFeedItem | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const boardId = normalizeText(record.boardId);
  const prompt = normalizeText(record.prompt);
  const url = normalizeText(record.url);

  if (!boardId || !prompt || !url) return null;
  return { boardId, prompt, url };
}

async function readRemoteAsset(sourceUrl: string) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status}`);
  }

  const contentType = normalizeContentType(response.headers.get("content-type"));
  const arrayBuffer = await response.arrayBuffer();

  return {
    bytes: new Uint8Array(arrayBuffer),
    contentType,
    extension: extensionForContentType(contentType),
  };
}

async function readDataUrlAsset(sourceUrl: string) {
  const match = sourceUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    throw new Error("Unsupported data URL");
  }

  const contentType = normalizeContentType(match[1]);
  return {
    bytes: base64ToUint8Array(match[2]),
    contentType,
    extension: extensionForContentType(contentType),
  };
}

export function getPreviewSource(images: unknown) {
  if (!Array.isArray(images)) return "";

  return images
    .map((image) => normalizeText((image as { url?: string } | null)?.url))
    .find((url) => url.length > 0 && !url.startsWith("data:image/svg+xml")) || "";
}

export async function ensureShowcaseCoverUrl(supabase: any, boardId: string, sourceUrl: string) {
  const normalizedSource = normalizeText(sourceUrl);
  if (!normalizedSource || normalizedSource.startsWith("data:image/svg+xml")) {
    return null;
  }

  if (normalizedSource.includes(STORAGE_PUBLIC_FRAGMENT)) {
    return normalizedSource;
  }

  const asset = normalizedSource.startsWith("data:")
    ? await readDataUrlAsset(normalizedSource)
    : await readRemoteAsset(normalizedSource);

  const filePath = `showcase/${boardId}/cover.${asset.extension}`;
  const { error } = await supabase.storage.from(SHOWCASE_BUCKET).upload(filePath, asset.bytes, {
    contentType: asset.contentType,
    upsert: true,
    cacheControl: "31536000",
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(SHOWCASE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function readShowcaseFeed(supabase: any): Promise<ShowcaseFeedItem[]> {
  const { data, error } = await supabase.storage.from(SHOWCASE_BUCKET).download(SHOWCASE_FEED_PATH);

  if (error || !data) return [];

  try {
    const parsed: any = JSON.parse(await data.text());
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

    return items
      .map(toFeedItem)
      .filter((item): item is ShowcaseFeedItem => item !== null)
      .slice(0, SHOWCASE_LIMIT);
  } catch {
    return [];
  }
}

export async function writeShowcaseFeed(supabase: any, items: ShowcaseFeedItem[]) {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      items: items.slice(0, SHOWCASE_LIMIT),
      updatedAt: new Date().toISOString(),
    })
  );

  const { error } = await supabase.storage.from(SHOWCASE_BUCKET).upload(SHOWCASE_FEED_PATH, payload, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "300",
  });

  if (error) {
    throw error;
  }
}

export async function syncShowcaseFeedItem(supabase: any, item: ShowcaseFeedItem) {
  const currentItems = await readShowcaseFeed(supabase);
  const nextItems = [item, ...currentItems.filter((entry) => entry.boardId !== item.boardId)].slice(0, SHOWCASE_LIMIT);

  await writeShowcaseFeed(supabase, nextItems);
}