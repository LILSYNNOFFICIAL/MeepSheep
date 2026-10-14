import type { Post } from "../app/content-types";

const STORAGE_KEY = "meepsheep.posts.v2";
const LEGACY_STORAGE_KEY = "meepsheep.posts.v1";
const STORAGE_VERSION = 2;

type StoredEnvelope = {
  version: number;
  updatedAt: string;
  posts: Post[];
};

const PLATFORMS = new Set(["TikTok", "Instagram", "YouTube", "Facebook"]);
const STATUSES = new Set(["Scheduled", "Draft", "Published"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePost(value: unknown): Post | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "number" ||
    typeof value.title !== "string" ||
    !PLATFORMS.has(String(value.platform)) ||
    !STATUSES.has(String(value.status)) ||
    typeof value.date !== "string" ||
    typeof value.time !== "string" ||
    typeof value.color !== "string" ||
    typeof value.kind !== "string"
  ) return null;

  const captions: Partial<Record<Post["platform"], string>> = {};
  if (isRecord(value.captions)) {
    for (const platform of PLATFORMS) {
      const caption = value.captions[platform];
      if (typeof caption === "string") captions[platform as Post["platform"]] = caption;
    }
  }

  return {
    id: value.id,
    title: value.title,
    platform: value.platform as Post["platform"],
    status: value.status as Post["status"],
    date: value.date,
    time: value.time,
    color: value.color,
    kind: value.kind,
    ...(typeof value.dateISO === "string" ? { dateISO: value.dateISO } : {}),
    ...(typeof value.time24 === "string" ? { time24: value.time24 } : {}),
    ...(Object.keys(captions).length ? { captions } : {})
  };
}

function normalizePosts(value: unknown): Post[] | null {
  if (!Array.isArray(value)) return null;
  const normalized = value.map(normalizePost);
  if (normalized.some(post => post === null)) return null;
  return normalized as Post[];
}

export function loadPosts(): { posts: Post[] | null; canWrite: boolean } {
  if (typeof window === "undefined") return { posts: null, canWrite: false };

  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed: unknown = JSON.parse(current);
      if (isRecord(parsed) && parsed.version === STORAGE_VERSION) {
        const posts = normalizePosts(parsed.posts);
        return { posts, canWrite: posts !== null };
      }
      // Protect data created by a newer schema or damaged by an interrupted write.
      return { posts: null, canWrite: false };
    }

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return { posts: null, canWrite: true };
    const posts = normalizePosts(JSON.parse(legacy));
    if (posts) {
      const migrated = savePosts(posts);
      return { posts, canWrite: migrated };
    }
    return { posts: null, canWrite: false };
  } catch {
    return { posts: null, canWrite: false };
  }
}

export function savePosts(posts: Post[]): boolean {
  if (typeof window === "undefined") return false;

  try {
    const envelope: StoredEnvelope = {
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      posts
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}
