/**
 * enrich-sheet-music
 *
 * Runs after a sheet music song is uploaded (and from the admin "fill missing" button).
 * For each song row it:
 *   1. Cleans the title: dashes and underscores become spaces.
 *   2. Sets the composer if it is empty, read from the song's Wikipedia infobox.
 *   3. Sets the thumbnail if it is empty: finds artwork on iTunes, downloads the 600x600 image,
 *      and stores it in the private 'sheet-music-thumbs' bucket.
 *
 * Only fills empty fields (the title is always cleaned). Admins only.
 *
 * Request: POST JSON { "id": "<uuid>" } or { "ids": ["<uuid>", ...] }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const BUCKET = "sheet-music-thumbs";
const USER_AGENT = "MusicableSheetMusic/1.0 (admin tool)";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function cleanTitle(title: string): string {
  return title.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

// Strips wiki markup from an infobox value: links, templates, refs, list bullets and line breaks.
function cleanWikiValue(raw: string): string[] {
  return raw
    .replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, "")
    // Lists such as {{Plainlist|* A * B}} keep their items; other templates are dropped.
    .replace(/\{\{\s*(?:plain ?list|hlist|flatlist|unbulleted list|ubl|collapsible list)\s*\|?/gi, "\n")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/'{2,}/g, "")
    .split(/\n|\*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(and|&)$/i.test(s));
}

// Wikipedia throttles bursts of requests (HTTP 429), so retry with a growing pause.
async function wikiGet(params: Record<string, string>) {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok) return res.json();
    if (res.status !== 429) throw new Error(`Wikipedia ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error("Wikipedia 429 (rate limited)");
}

// Finds the song on iTunes by exact title. Returns its artwork URL and the performing artist, which
// is used to pick the right Wikipedia article (many songs share a title).
export async function findTrack(title: string): Promise<{ artUrl: string; artist: string; previewUrl: string | null } | null> {
  const params = new URLSearchParams({ term: title, entity: "song", limit: "25" });
  const res = await fetch("https://itunes.apple.com/search?" + params, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`iTunes ${res.status}`);
  const results: any[] = (await res.json())?.results ?? [];
  // Loose matching: ignore case and punctuation, and accept a track name that appears inside the title
  // (library titles are often slugs like "shake it off taylor swift"). Prefer the longest, most exact match.
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const wanted = norm(title);
  const candidates = results
    .filter((r) => r.artworkUrl100 && norm(String(r.trackName ?? "")).length >= 3)
    .filter((r) => {
      const t = norm(String(r.trackName));
      return t === wanted || wanted.includes(t);
    })
    .sort((a, b) => norm(String(b.trackName)).length - norm(String(a.trackName)).length);
  const exact = candidates.find((r) => norm(String(r.trackName)) === wanted) ?? candidates[0];
  if (!exact) return null;
  return {
    artUrl: String(exact.artworkUrl100).replace("100x100bb", "600x600bb"),
    artist: String(exact.artistName ?? ""),
    previewUrl: exact.previewUrl ? String(exact.previewUrl) : null,
  };
}

// Finds the composer/writer from the infobox of a Wikipedia song article whose infobox names the
// performing artist. Returns null when no article matches both title and artist.
export async function findComposer(title: string, artist: string): Promise<string | null> {
  if (!artist) return null;
  const search = await wikiGet({
    action: "query",
    list: "search",
    srsearch: `"${title}" song`,
    srlimit: "5",
  });
  const hits: { title: string }[] = search?.query?.search ?? [];
  const wanted = title.toLowerCase();
  // Only pages about the song itself: "Shake It Off" or "Shake It Off (Mariah Carey song)".
  const candidates = hits.filter((h) => {
    const t = h.title.toLowerCase();
    return t === wanted || t.startsWith(wanted + " (");
  });
  const artistLower = artist.toLowerCase();

  for (const page of candidates) {
    await new Promise((r) => setTimeout(r, 800));
    const parsed = await wikiGet({ action: "parse", page: page.title, prop: "wikitext" });
    const wikitext: string = parsed?.parse?.wikitext?.["*"] ?? "";
    if (!/\{\{Infobox (single|song)/i.test(wikitext)) continue;

    const artistField = wikitext.match(/^\s*\|\s*artist\s*=([^\n]*)/im);
    const pageArtists = artistField ? cleanWikiValue(artistField[1]).join(" ").toLowerCase() : "";
    if (!pageArtists || !pageArtists.includes(artistLower)) continue;

    for (const field of ["composer", "writer", "songwriter", "songwriters"]) {
      const match = wikitext.match(new RegExp(`^\\s*\\|\\s*${field}\\s*=([^\\n]*(?:\\n(?!\\s*\\|)[^\\n]*)*)`, "im"));
      if (match) {
        const names = cleanWikiValue(match[1]);
        if (names.length > 0) return names.join(", ");
      }
    }
    return null;
  }
  return null;
}

export async function handleSong(
  supabase: any,
  id: string,
): Promise<Record<string, unknown>> {
  const { data: row, error } = await supabase
    .from("sheet_music_library")
    .select("id, title, composer, thumbnail_path, preview_url")
    .eq("id", id)
    .single();
  if (error || !row) return { id, error: error?.message ?? "Song not found" };

  const summary: Record<string, unknown> = { id };
  const updates: Record<string, string> = {};

  const title = cleanTitle(row.title);
  if (title !== row.title) {
    updates.title = title;
    summary.title = title;
  }

  // One iTunes lookup gives both the artwork and the performing artist, used to find the composer.
  let track: { artUrl: string; artist: string; previewUrl: string | null } | null = null;
  if (!row.composer || !row.thumbnail_path || !row.preview_url) {
    try {
      track = await findTrack(title);
    } catch (e) {
      summary.trackError = (e as Error).message;
    }
  }

  if (!row.composer) {
    try {
      const composer = track ? await findComposer(title, track.artist) : null;
      if (composer) {
        updates.composer = composer;
        summary.composer = composer;
      } else {
        summary.composer = "not found";
      }
    } catch (e) {
      summary.composerError = (e as Error).message;
    }
  }

  if (!row.thumbnail_path) {
    try {
      const artUrl = track?.artUrl ?? null;
      if (artUrl) {
        const img = await fetch(artUrl, { headers: { "User-Agent": USER_AGENT } });
        if (!img.ok) throw new Error(`artwork download ${img.status}`);
        const bytes = new Uint8Array(await img.arrayBuffer());
        const path = `${row.id}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
        updates.thumbnail_path = path;
        summary.thumbnail = path;
      } else {
        summary.thumbnail = "not found";
      }
    } catch (e) {
      summary.thumbnailError = (e as Error).message;
    }
  }

  // The 30-second iTunes preview, played on hover in the library.
  if (!row.preview_url && track?.previewUrl) {
    updates.preview_url = track.previewUrl;
    summary.preview = "found";
  }

  if (Object.keys(updates).length > 0) {
    const { error: upd } = await supabase.from("sheet_music_library").update(updates).eq("id", row.id);
    if (upd) {
      if (updates.thumbnail_path) await supabase.storage.from(BUCKET).remove([updates.thumbnail_path]);
      summary.error = upd.message;
    }
  }
  return summary;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
  if (!roles?.some((r: any) => r.role === "admin")) return json({ error: "Admins only" }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : body?.id ? [body.id] : [];
  if (ids.length === 0) return json({ error: "Send { id } or { ids }" }, 400);

  const results = [];
  for (const id of ids.slice(0, 50)) {
    results.push(await handleSong(supabase, id));
    await new Promise((r) => setTimeout(r, 1000)); // stay under iTunes and Wikipedia rate limits
  }
  return json({ results });
});
