import type { SourceSegment } from "./types";

/**
 * Deterministische segmentatie van de input in korte bronsegmenten (S1, S2, …) voor grounding.
 *
 * Strategie (bewust eenvoudig, geen NLP-dependency):
 * 1. alinea's op regelovergangen;
 * 2. zinnen via Intl.Segmenter("nl", { granularity: "sentence" }); valt terug op een regex als die ontbreekt;
 * 3. een segment dat eindigt op een bekende afkorting ("dhr.", "bijv.") wordt samengevoegd met het volgende.
 *
 * Segmenten worden alleen aan de provider en de eigen UI van de gebruiker gegeven, nooit gelogd.
 */
export const SEGMENTATION_VERSION = "source-segments/v1";

const ABBREVIATIONS = [
  "dhr.", "mevr.", "mw.", "dr.", "drs.", "ir.", "mr.", "prof.", "bijv.", "bv.", "o.a.", "d.w.z.", "m.b.t.",
  "i.v.m.", "t.a.v.", "i.p.v.", "z.g.a.n.", "e.d.", "etc.", "evt.", "ca.", "nr.", "jl.", "a.s.", "st.",
];

function splitSentences(paragraph: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("nl", { granularity: "sentence" });
    return [...segmenter.segment(paragraph)].map((s) => s.segment);
  }
  return paragraph.match(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)/g) ?? [paragraph];
}

function endsWithAbbreviation(sentence: string): boolean {
  const last = sentence.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  return ABBREVIATIONS.includes(last);
}

export function segmentInput(text: string): SourceSegment[] {
  const sentences: string[] = [];
  for (const paragraph of text.trim().split(/\r?\n+/)) {
    if (!paragraph.trim()) continue;
    let pending = "";
    for (const raw of splitSentences(paragraph)) {
      const piece = raw.trim();
      if (!piece) continue;
      pending = pending ? `${pending} ${piece}` : piece;
      if (!endsWithAbbreviation(pending)) {
        sentences.push(pending);
        pending = "";
      }
    }
    if (pending) sentences.push(pending);
  }
  return sentences.map((segment, i) => ({ id: `S${i + 1}`, text: segment }));
}
