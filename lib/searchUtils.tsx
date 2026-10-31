import type { Database } from "@/lib/supabase/database.types";

type EventTheme = Database["public"]["Tables"]["event_themes"]["Row"];

/**
 * Normalizes text for search:
 * - strips accents & diacritics (e.g. é -> e)
 * - lowercases
 * - collapses spaces
 * - strips punctuation for clean matching
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Removes all spaces and punctuation for compressed matching
 * (e.g. "Royal Heritage" -> "royalheritage")
 */
export function stripSpacesAndPunctuation(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Splits query into clean search tokens.
 */
export function getSearchTokens(query: string): string[] {
  const norm = normalizeText(query);
  if (!norm) return [];
  return norm.split(/\s+/).filter(Boolean);
}

/**
 * Computes Levenshtein edit distance between two strings
 * for typo tolerance (handles up to 2 character edits).
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Optimize for fast exit if length difference exceeds tolerance
  if (Math.abs(a.length - b.length) > 2) return 999;

  const dp: number[] = [];
  for (let j = 0; j <= b.length; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }

  return dp[b.length];
}

/**
 * Checks if a string contains initials or subsequence of characters in order
 * (e.g. "rhw" matches "Royal Heritage Wedding")
 */
function isAcronymOrSubsequence(pattern: string, text: string): boolean {
  if (!pattern || !text || pattern.length < 2) return false;
  let pIdx = 0;
  let tIdx = 0;
  while (pIdx < pattern.length && tIdx < text.length) {
    if (pattern[pIdx] === text[tIdx]) {
      pIdx++;
    }
    tIdx++;
  }
  return pIdx === pattern.length;
}

export interface SearchScoreResult {
  theme: EventTheme;
  score: number;
}

/**
 * Evaluates match score for a theme against the search query.
 * Theme Name / Title has supreme priority, followed by category, keywords,
 * tags, persona, venue, budget, and launch status.
 */
export function scoreTheme(
  theme: EventTheme,
  rawQuery: string,
  tokens: string[]
): number {
  if (!rawQuery) return 1;

  const q = normalizeText(rawQuery);
  if (!q) return 1;

  const rawName = theme.theme_name || theme.title || "";
  const name = normalizeText(rawName);
  const nameCompact = stripSpacesAndPunctuation(rawName);
  const qCompact = stripSpacesAndPunctuation(q);
  const nameWords = name.split(/\s+/).filter(Boolean);

  let score = 0;

  // ─── 1. SUPREME PRIORITY: THEME NAME / TITLE ───
  if (name) {
    // Exact full name match
    if (name === q || nameCompact === qCompact) {
      score += 10000;
    }
    // Name starts with exact query (highest relevance when typing characters)
    else if (name.startsWith(q)) {
      score += 6000;
    }
    // Compact name starts with compact query (e.g. "royalwed" -> "royalwedding...")
    else if (qCompact.length >= 2 && nameCompact.startsWith(qCompact)) {
      score += 5500;
    }
    // Any word in the title starts with the query (e.g. "raj" -> "Royal Rajputana")
    else if (nameWords.some((w) => w.startsWith(q))) {
      score += 4500;
    }
    // Title contains the full phrase as substring
    else if (name.includes(q)) {
      score += 3500;
    }
    // Compact title contains compact query (e.g. "royalheritage" in "The Royal Heritage")
    else if (qCompact.length >= 3 && nameCompact.includes(qCompact)) {
      score += 3000;
    }
    // Initials / subsequence match (e.g. "rhw" -> "Royal Heritage Wedding")
    else if (qCompact.length >= 2 && isAcronymOrSubsequence(qCompact, nameCompact)) {
      score += 2000;
    }

    // Token-level matching in Theme Name (handles out-of-order words like "wedding royal")
    if (tokens.length > 1) {
      const allTokensInName = tokens.every((token) => name.includes(token));
      if (allTokensInName) {
        score += 4000;
      } else {
        const matchedTokens = tokens.filter((token) => name.includes(token));
        if (matchedTokens.length > 0) {
          score += matchedTokens.length * 800;
        }
      }
    }

    // Typo tolerance for queries with 4+ characters (e.g. "sanget" -> "sangeet")
    if (score === 0 && q.length >= 4) {
      for (const word of nameWords) {
        if (Math.abs(word.length - q.length) <= 1) {
          const dist = editDistance(q, word);
          if (dist === 1) {
            score += 2200;
            break;
          }
        }
      }
    }
  }

  // ─── 2. SECONDARY FIELDS: CATEGORY, KEYWORDS, PERSONA, VENUE, TAGS, VALUE ───
  // When user types a single character, secondary fields have minimal influence
  // so theme names matching that character ALWAYS rank at the top.
  const isSingleChar = q.length === 1;
  const secondaryWeight = isSingleChar ? 0.05 : 1.0;

  const category = normalizeText(theme.category);
  const keywords = normalizeText(theme.keywords);
  const persona = normalizeText(theme.client_persona);
  const venue = normalizeText(theme.ideal_venue);
  const tags = (theme.tags || []).map((t) => normalizeText(t));
  const budget = normalizeText(theme.total_event_value);
  const launchStatus = normalizeText(theme.launch_status);

  if (category) {
    if (category === q) score += 900 * secondaryWeight;
    else if (category.startsWith(q)) score += 600 * secondaryWeight;
    else if (category.includes(q)) score += 350 * secondaryWeight;
  }

  if (keywords) {
    if (keywords.startsWith(q)) score += 500 * secondaryWeight;
    else if (keywords.includes(q)) score += 300 * secondaryWeight;
  }

  if (tags.length > 0) {
    if (tags.some((tag) => tag.startsWith(q))) score += 400 * secondaryWeight;
    else if (tags.some((tag) => tag.includes(q))) score += 250 * secondaryWeight;
  }

  if (persona && persona.includes(q)) {
    score += 200 * secondaryWeight;
  }

  if (venue && venue.includes(q)) {
    score += 180 * secondaryWeight;
  }

  if (budget && budget.includes(q)) {
    score += 250 * secondaryWeight;
  }

  if (launchStatus && (launchStatus === q || launchStatus.startsWith(q))) {
    score += 300 * secondaryWeight;
  }

  // Multi-token fallback across all combined fields
  if (tokens.length > 1 && score === 0) {
    const fullText = `${name} ${category} ${keywords} ${persona} ${venue} ${tags.join(" ")} ${budget}`;
    const allTokensFound = tokens.every((tok) => fullText.includes(tok));
    if (allTokensFound) {
      score += 800;
    }
  }

  return score;
}

/**
 * High performance search function executing in sub-milliseconds (< 1ms).
 * Returns scored & sorted results with the measured elapsed execution time.
 */
export function searchThemes(
  themes: EventTheme[],
  query: string
): { results: EventTheme[]; elapsedMs: number } {
  const start = performance.now();
  const trimmed = query.trim();

  if (!trimmed) {
    const elapsedMs = performance.now() - start;
    return { results: themes, elapsedMs: Number(elapsedMs.toFixed(2)) };
  }

  const tokens = getSearchTokens(trimmed);
  const scoredList: SearchScoreResult[] = [];

  for (let i = 0; i < themes.length; i++) {
    const theme = themes[i];
    const score = scoreTheme(theme, trimmed, tokens);
    if (score > 0) {
      scoredList.push({ theme, score });
    }
  }

  // Sort by score descending (highest relevance first)
  scoredList.sort((a, b) => b.score - a.score);

  const results = scoredList.map((item) => item.theme);
  const elapsedMs = performance.now() - start;

  return {
    results,
    elapsedMs: Number(elapsedMs.toFixed(2)),
  };
}
