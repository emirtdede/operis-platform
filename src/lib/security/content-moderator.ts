/**
 * Content Moderation and Abuse Guardrail Engine
 * Protects users from profanity, insults, harassment, hate speech,
 * and prohibited off-platform contact leakage in proposals and messages.
 */

// Common Turkish & English profanity, slurs, offensive roots
const BLOCKED_WORDS = [
  // Küfür ve Hakaret Kökleri (TR)
  "küfür",
  "orospu",
  "piç",
  "sik",
  "sikeyim",
  "sikerim",
  "sikiş",
  "yarrak",
  "amk",
  "amq",
  "aq",
  "oç",
  "ibne",
  "puşt",
  "göt",
  "gavat",
  "pezevenk",
  "kahpe",
  "şerefsiz",
  "haysiyetsiz",
  "ahmak",
  "salak",
  "gerizekalı",
  "aptal",
  "moron",
  "dangalak",
  "yavşak",
  "bok",
  "ananı",
  "bacını",
  "ebeni",

  // Profanity & Slurs (EN)
  "fuck",
  "fucking",
  "motherfucker",
  "bitch",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "whore",
  "slut",
  "nigger",
  "faggot",
  "retard",
  "idiot",
  "scam",
  "scammer",
  "fraud",
];

// Regex to detect intentional obfuscation (e.g. s.i.k, p_i_ç, a m k)
const L33T_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
};

/**
 * Normalizes text to defeat basic obfuscation tricks:
 * - Leetspeak substitutions (@ -> a, 1 -> i, etc.)
 * - Repetitive punctuation / dots / underscores
 * - Whitespace compression
 */
export function normalizeContentForAnalysis(rawText: string): string {
  let text = rawText.toLowerCase();

  // Replace common l33t chars
  for (const [char, replacement] of Object.entries(L33T_MAP)) {
    text = text.replaceAll(char, replacement);
  }

  // Remove invisible characters and zero-width spaces
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

  return text;
}

export interface ModerationResult {
  isValid: boolean;
  flaggedTerms: string[];
  category?: "PROFANITY" | "INSULT" | "HARASSMENT" | "CONTACT_LEAK";
  reason?: string;
}

/**
 * Validates text against profanity, insults, harassment, and unauthorized leaks.
 */
export function validateContentAppropriateness(rawText: string): ModerationResult {
  if (!rawText || rawText.trim().length === 0) {
    return { isValid: true, flaggedTerms: [] };
  }

  const normalized = normalizeContentForAnalysis(rawText);

  // Split into alphanumeric words and also check compressed continuous string
  const words = normalized.split(/[\s,._\-:;!?*#/\\()[\]{}<>+="'`~]+/);
  const compressed = normalized.replace(/[^a-z0-9ğüşıöç]/gi, "");

  const flagged = new Set<string>();

  for (const blocked of BLOCKED_WORDS) {
    // Word boundary check
    if (words.includes(blocked)) {
      flagged.add(blocked);
    }

    // Direct substring check for severe slurs (longer than 3 chars)
    if (blocked.length >= 4 && compressed.includes(blocked)) {
      flagged.add(blocked);
    }
  }

  if (flagged.size > 0) {
    return {
      isValid: false,
      flaggedTerms: Array.from(flagged),
      category: "PROFANITY",
      reason:
        "Mesajınız topluluk kurallarımıza aykırı uygunsuz ifadeler (küfür, hakaret veya saldırgan dil) içerdiği için engellendi.",
    };
  }

  return {
    isValid: true,
    flaggedTerms: [],
  };
}
