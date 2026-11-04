import { LIMITS, isUuid, readStringList, readText, safeHttpsUrl, safeImageUrl } from "@/lib/security/urls";

export type ThemeWriteInput = {
  theme_name: string;
  category: string;
  category_id: string | null;
  keywords: string | null;
  theme_link: string | null;
  executed_ppts_link: string | null;
  client_persona: string | null;
  color_palette: string[];
  total_event_value: string | null;
  ideal_venue: string | null;
  launch_status: string | null;
  material_download_link: string | null;
  additional_notes: string | null;
  thumbnail_url: string | null;
  tags: string[];
};

type ParseResult =
  | { ok: true; id?: string; value: ThemeWriteInput }
  | { ok: false; error: string };

export async function resolveThemeCategory(
  admin: { from: (table: string) => any },
  name: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("theme_categories")
    .select("id, name")
    .eq("name", name)
    .limit(1);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as { id?: string; name?: string };
  if (!isUuid(row.id) || row.name !== name) return null;
  return row.id;
}

export function fieldError(result: { ok: boolean; error?: string }): string {
  return result.ok ? "Invalid request." : result.error || "Invalid request.";
}

function textValue(result: object): string | null {
  const record = result as { ok?: boolean; value?: string | null };
  return record.ok ? record.value ?? null : null;
}

function listValue(result: object): string[] {
  const record = result as { ok?: boolean; value?: string[] };
  return record.ok && record.value ? record.value : [];
}

function stop(result: { ok: boolean; error?: string }): { ok: false; error: string } | null {
  if (result.ok) return null;
  return { ok: false, error: result.error || "Invalid request." };
}

function readLink(value: unknown, field: string): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${field} is invalid.` };
  const safe = safeHttpsUrl(value);
  if (!safe) return { ok: false, error: `${field} must be a public https URL.` };
  return { ok: true, value: safe };
}

export function parseThemeWrite(body: unknown, idRequired = false): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const record = body as Record<string, unknown>;

  let id: string | undefined;
  if (idRequired) {
    if (!isUuid(record.id)) return { ok: false, error: "A valid theme id is required." };
    id = record.id;
  }

  const themeName = readText(record.theme_name, LIMITS.themeName, "Theme name", true);
  const themeNameError = stop(themeName);
  if (themeNameError) return themeNameError;
  const category = readText(record.category, LIMITS.category, "Category", true);
  const categoryError = stop(category);
  if (categoryError) return categoryError;
  const keywords = readText(record.keywords, LIMITS.keywords, "Keywords");
  const keywordsError = stop(keywords);
  if (keywordsError) return keywordsError;
  const themeLink = readLink(record.theme_link, "Presentation link");
  const themeLinkError = stop(themeLink);
  if (themeLinkError) return themeLinkError;
  const executed = readLink(record.executed_ppts_link, "Executed PPTs link");
  const executedError = stop(executed);
  if (executedError) return executedError;
  const material = readLink(record.material_download_link, "Material download link");
  const materialError = stop(material);
  if (materialError) return materialError;
  const persona = readText(record.client_persona, LIMITS.persona, "Client persona");
  const personaError = stop(persona);
  if (personaError) return personaError;
  const eventValue = readText(record.total_event_value, LIMITS.eventValue, "Event value");
  const eventValueError = stop(eventValue);
  if (eventValueError) return eventValueError;
  const venue = readText(record.ideal_venue, LIMITS.venue, "Venue");
  const venueError = stop(venue);
  if (venueError) return venueError;
  const notes = readText(record.additional_notes, LIMITS.notes, "Notes");
  const notesError = stop(notes);
  if (notesError) return notesError;
  const colors = readStringList(record.color_palette, LIMITS.color, LIMITS.colors, "Colour palette");
  const colorsError = stop(colors);
  if (colorsError) return colorsError;
  const tags = readStringList(record.tags, LIMITS.tag, LIMITS.tags, "Tags");
  const tagsError = stop(tags);
  if (tagsError) return tagsError;

  let thumbnail: string | null = null;
  if (record.thumbnail_url != null && record.thumbnail_url !== "") {
    if (typeof record.thumbnail_url !== "string") return { ok: false, error: "Cover image link is invalid." };
    thumbnail = safeImageUrl(record.thumbnail_url);
    if (!thumbnail) return { ok: false, error: "Cover image link must be a public https image URL." };
  }

  let launchStatus: string | null = null;
  if (record.launch_status != null && record.launch_status !== "") {
    if (typeof record.launch_status !== "string") return { ok: false, error: "Launch status is invalid." };
    const normalized = record.launch_status.trim().toLowerCase();
    if (normalized === "new") launchStatus = "New";
    else if (normalized === "bestseller") launchStatus = "Bestseller";
    else return { ok: false, error: "Launch status is invalid." };
  }

  const categoryId = isUuid(record.category_id) ? record.category_id : null;

  return {
    ok: true,
    id,
    value: {
      theme_name: textValue(themeName) || "",
      category: textValue(category) || "",
      category_id: categoryId,
      keywords: textValue(keywords),
      theme_link: textValue(themeLink),
      executed_ppts_link: textValue(executed),
      client_persona: textValue(persona),
      color_palette: listValue(colors),
      total_event_value: textValue(eventValue),
      ideal_venue: textValue(venue),
      launch_status: launchStatus,
      material_download_link: textValue(material),
      additional_notes: textValue(notes),
      thumbnail_url: thumbnail,
      tags: listValue(tags),
    },
  };
}
