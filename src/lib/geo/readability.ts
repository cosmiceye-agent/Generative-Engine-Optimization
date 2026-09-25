/**
 * Flesch Reading Ease, implemented locally rather than pulled from a dependency
 * so the syllable heuristic is visible and testable.
 *
 *   206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
 *
 * 60–70 is "plain English". AI answer engines quote plain sentences far more
 * readily than dense ones, which is why this feeds the content score.
 */

/**
 * Split text into sentences.
 *
 * A newline is a hard boundary as well as terminal punctuation, because
 * `extractMainText` puts one block per line and a heading rarely ends in a full
 * stop — without this, a heading and the paragraph beneath it would be read as
 * one sentence.
 */
export function splitSentences(text: string): string[] {
  return text
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=["'(\[]?[A-Z0-9])/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function countSentences(text: string): number {
  return Math.max(1, splitSentences(text).length);
}

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => /[a-zA-Z0-9]/.test(word));
}

/**
 * Approximate English syllable count.
 *
 * Strip the silent trailing "e" first, then count vowel groups, then add one
 * back for a consonant + "-le" ending. The order matters: counting before
 * stripping would score "table" as three (a, e, plus the -le bonus) rather than
 * two.
 */
export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length === 0) return 0;
  if (clean.length <= 3) return 1;

  // "-es" and "-ed" endings are usually silent too ("ranges", "walked").
  const stripped = clean
    .replace(/(?:[^aeiouy]es|[^aeiouyt]ed|[^aeiouy]e)$/, "")
    .replace(/^y/, "");

  const groups = stripped.match(/[aeiouy]{1,2}/g);
  let count = groups ? groups.length : 0;

  // "table", "little" — the -le carries its own syllable.
  if (/[^aeiouy]le$/.test(clean)) count += 1;

  return Math.max(1, count);
}

export type ReadabilityStats = {
  words: number;
  sentences: number;
  syllables: number;
  wordsPerSentence: number;
  flesch: number;
};

export function fleschReadingEase(text: string): ReadabilityStats {
  const words = splitWords(text);
  const sentences = countSentences(text);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);

  if (words.length === 0) {
    return { words: 0, sentences, syllables: 0, wordsPerSentence: 0, flesch: 0 };
  }

  const wordsPerSentence = words.length / sentences;
  const raw = 206.835 - 1.015 * wordsPerSentence - 84.6 * (syllables / words.length);

  return {
    words: words.length,
    sentences,
    syllables,
    wordsPerSentence,
    // Flesch is unbounded at both ends; clamp so it can be used as a 0–100 score.
    flesch: Math.max(0, Math.min(100, Math.round(raw * 10) / 10)),
  };
}
