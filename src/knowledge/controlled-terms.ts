/**
 * Gecontroleerde begrippen voor epistemische discipline in Certum Analyse.
 *
 * Kernregel: de Analyse beschrijft wat er professioneel gebeurt; de latere Bron-fase bepaalt welke
 * theorie, methodiek, richtlijn of wetgeving erbij hoort. Een begrip uit deze lijst mag in gebruikersgerichte
 * analysevelden alleen voorkomen als het letterlijk in de input staat; anders hoort het hooguit in
 * `sourceCandidates`.
 *
 * NIET UITPUTTEND. Deze lijst vangt veelvoorkomende gevallen; het ontbreken van een treffer betekent niet dat
 * een analyse vrij is van ongefundeerde kaders. Menselijke review en evals blijven nodig.
 */
export const CONTROLLED_TERMS_VERSION = "controlled-terms/v1";

export type ControlledTermCategory =
  | "wet_regelgeving"
  | "meldcode"
  | "zorgplicht"
  | "beroepscode"
  | "kindbescherming"
  | "methodiek"
  | "diagnose"
  | "wilsbekwaamheid"
  | "theoretisch_begrip";

export interface ControlledTerm {
  /** Weergavenaam, bijv. voor een markering in de UI. */
  term: string;
  category: ControlledTermCategory;
  /** Regex-bron (hoofdletterongevoelig), inclusief gangbare vervoegingen. */
  pattern: string;
}

export const CONTROLLED_TERMS: ControlledTerm[] = [
  // Wet- en regelgeving
  { term: "Jeugdwet", category: "wet_regelgeving", pattern: "jeugdwet" },
  { term: "Wmo", category: "wet_regelgeving", pattern: "wmo|wet maatschappelijke ondersteuning" },
  { term: "Participatiewet", category: "wet_regelgeving", pattern: "participatiewet" },
  { term: "AVG", category: "wet_regelgeving", pattern: "avg|algemene verordening gegevensbescherming" },
  { term: "WGBO", category: "wet_regelgeving", pattern: "wgbo" },
  { term: "Wet zorg en dwang / Wvggz", category: "wet_regelgeving", pattern: "wet zorg en dwang|wzd|wvggz" },
  { term: "Leerplichtwet", category: "wet_regelgeving", pattern: "leerplichtwet" },
  { term: "Arbowet / Wet verbetering poortwachter", category: "wet_regelgeving", pattern: "arbowet|poortwachter" },
  { term: "arbeidsrecht", category: "wet_regelgeving", pattern: "arbeidsrecht\\p{L}*|arbeidsrechtelijk\\p{L}*" },
  { term: "ouderlijk gezag", category: "wet_regelgeving", pattern: "ouderlijk gezag|gezagsregeling|gezag" },
  // Meldcode / meldplicht
  { term: "meldcode", category: "meldcode", pattern: "meldcode\\p{L}*" },
  { term: "meldplicht", category: "meldcode", pattern: "meldplicht\\p{L}*|meldrecht" },
  { term: "Veilig Thuis (als kader)", category: "meldcode", pattern: "veilig thuis" },
  // Zorgplicht
  { term: "zorgplicht", category: "zorgplicht", pattern: "zorgplicht\\p{L}*" },
  // Beroepscodes
  { term: "beroepscode", category: "beroepscode", pattern: "beroepscode\\p{L}*|tuchtrecht\\p{L}*" },
  { term: "beroepsgeheim", category: "beroepscode", pattern: "beroepsgeheim|geheimhoudingsplicht|ambtsgeheim" },
  // Kindbescherming
  { term: "kindbescherming", category: "kindbescherming", pattern: "kindbescherming\\p{L}*|kinderbescherming|jeugdbescherming" },
  { term: "ondertoezichtstelling", category: "kindbescherming", pattern: "ondertoezichtstelling|uithuisplaatsing" },
  // Methodieken
  { term: "motiverende gespreksvoering", category: "methodiek", pattern: "motiverende gespreksvoering" },
  { term: "Signs of Safety", category: "methodiek", pattern: "signs of safety" },
  { term: "oplossingsgericht werken", category: "methodiek", pattern: "oplossingsgericht\\p{L}*" },
  { term: "geweldloze communicatie", category: "methodiek", pattern: "geweldloze communicatie" },
  { term: "presentiebenadering", category: "methodiek", pattern: "presentiebenadering|presentietheorie" },
  { term: "eigen kracht-conferentie", category: "methodiek", pattern: "eigen[- ]kracht[- ]?conferentie" },
  // Diagnoses
  { term: "depressie", category: "diagnose", pattern: "depressie\\p{L}*|depressief|depressieve" },
  { term: "burn-out", category: "diagnose", pattern: "burn-?out" },
  { term: "ADHD", category: "diagnose", pattern: "adhd" },
  { term: "autisme", category: "diagnose", pattern: "autisme|autistisch\\p{L}*" },
  { term: "PTSS / trauma", category: "diagnose", pattern: "ptss|trauma\\p{L}*|getraumatiseerd" },
  { term: "angststoornis", category: "diagnose", pattern: "angststoornis\\p{L}*" },
  { term: "persoonlijkheidsstoornis", category: "diagnose", pattern: "persoonlijkheidsstoornis\\p{L}*|borderline" },
  { term: "verslaving", category: "diagnose", pattern: "verslav\\p{L}*" },
  { term: "licht verstandelijke beperking", category: "diagnose", pattern: "lvb|licht verstandelijk\\p{L}* beperk\\p{L}*" },
  { term: "hechtingsstoornis", category: "diagnose", pattern: "hechtingsstoornis\\p{L}*|hechtingsproblem\\p{L}*" },
  // Wilsbekwaamheid
  { term: "wilsonbekwaamheid", category: "wilsbekwaamheid", pattern: "wils(?:on)?bekwa\\p{L}*|handelingsonbekwa\\p{L}*" },
  // Theoretische vaktermen
  { term: "meerzijdige partijdigheid", category: "theoretisch_begrip", pattern: "meerzijdig\\p{L}* partijdig\\p{L}*" },
  { term: "loyaliteitsconflict", category: "theoretisch_begrip", pattern: "loyaliteitsconflict\\p{L}*" },
  { term: "parentificatie", category: "theoretisch_begrip", pattern: "parentificatie|geparentificeerd" },
  { term: "triangulatie", category: "theoretisch_begrip", pattern: "triangulatie" },
];

/** Regex per term met woordgrenzen (Unicode). */
export function controlledTermRegex(term: ControlledTerm): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${term.pattern})(?![\\p{L}\\p{N}])`, "iu");
}
