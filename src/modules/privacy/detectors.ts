import type { PreflightCategory } from "./types";

export interface RawFinding {
  category: PreflightCategory;
  start: number;
  end: number;
}

type Detector = (text: string) => RawFinding[];

function matches(text: string, pattern: RegExp, category: PreflightCategory, group = 0): RawFinding[] {
  const found: RawFinding[] = [];
  for (const m of text.matchAll(pattern)) {
    const value = m[group];
    if (value === undefined) continue;
    const start = m.index + m[0].indexOf(value);
    found.push({ category, start, end: start + value.length });
  }
  return found;
}

const digitsOf = (value: string) => value.replace(/\D/g, "");

/* ------------------------------------------------------------------ */
/* Hoge precisie: vaste formaten (blocked)                             */
/* ------------------------------------------------------------------ */

const detectEmail: Detector = (text) =>
  matches(text, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "email");

const SOCIAL_DOMAINS = "facebook|instagram|tiktok|linkedin|twitter|x|snapchat|youtube|threads";

/** Profiel-URL op een bekend sociaal platform, of een @handle (geen e-mailadres). */
const detectSocialProfile: Detector = (text) => [
  ...matches(
    text,
    new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?(?:${SOCIAL_DOMAINS})\\.com\\/[^\\s<>"')\\]]*[^\\s<>"')\\].,;:!?]`, "gi"),
    "social_profile",
  ),
  ...matches(text, /(?<![\w.@])@[A-Za-z0-9_][A-Za-z0-9_.]{1,29}[A-Za-z0-9_]/g, "social_profile"),
];

/** Overige URL's: geven op zichzelf niet aan dat het om een persoon gaat (review). */
const detectUrl: Detector = (text) =>
  matches(text, /\b(?:https?:\/\/|www\.)[^\s<>"')\]]*[^\s<>"')\].,;:!?]/gi, "url");

/** Nederlands telefoonnummer: 10 cijfers beginnend met 0, of +31/0031 + 9 cijfers. */
const detectPhone: Detector = (text) => {
  const found: RawFinding[] = [];
  const pattern = /(?<![\w+])(?:\+31|0031|0)[\s.-]?(?:\(0\)[\s.-]?)?\d(?:[\s.-]?\d){7,9}(?!\d)/g;
  for (const m of text.matchAll(pattern)) {
    let digits = digitsOf(m[0]);
    if (m[0].startsWith("+31") || m[0].startsWith("0031")) {
      digits = "0" + digits.replace(/^(?:0031|31)/, "").replace(/^0/, "");
    }
    // Servicenummers (0800/0900/0909) zijn geen persoonsgegeven.
    if (digits.length === 10 && digits[1] !== "0" && !/^0(?:800|900|909)/.test(digits)) {
      found.push({ category: "phone", start: m.index, end: m.index + m[0].length });
    }
  }
  return found;
};

/** Eenheden die een postcode-patroon kunnen nabootsen ("1024 KB"). */
const NOT_POSTCODE_LETTERS = new Set(["KB", "MB", "GB", "TB", "KM", "CM", "MM", "KG", "MG", "ML", "CC", "KW", "PK", "AM", "PM", "SA", "SD", "SS"]);

const detectPostcode: Detector = (text) =>
  matches(text, /(?<![\w.,])[1-9]\d{3}\s?[A-Z]{2}(?![\w])/g, "postcode").filter(
    (f) => !NOT_POSTCODE_LETTERS.has(text.slice(f.end - 2, f.end)),
  );

const STREET_SUFFIXES =
  "straat|laan|weg|plein|gracht|kade|singel|dreef|dijk|steeg|hof|pad|park|baan|ring|markt|kwartier|erf|wal|haven|plantsoen|boulevard";

/** Straatnaam met bekend achtervoegsel gevolgd door een huisnummer. */
const detectStreetAddress: Detector = (text) =>
  matches(
    text,
    new RegExp(`\\b[A-Z][\\p{Ll}'’-]*(?:${STREET_SUFFIXES})\\s+\\d{1,5}(?:\\s?[a-zA-Z](?![\\p{L}])|-\\d+)?`, "gu"),
    "street_address",
  );

/** 11-proef voor BSN. */
export function isValidBsn(digits: string): boolean {
  if (!/^\d{9}$/.test(digits) || /^0+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(digits[i]) * (9 - i);
  sum -= Number(digits[8]);
  return sum % 11 === 0;
}

const detectBsn: Detector = (text) =>
  matches(text, /(?<![\d.,])\d{3}[.\s]?\d{3}[.\s]?\d{3}(?![\d.,]?\d)/g, "bsn").filter((f) =>
    isValidBsn(digitsOf(text.slice(f.start, f.end))),
  );

/** IBAN-controlegetal (mod 97). */
export function isValidIban(value: string): boolean {
  const iban = value.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  if (iban.startsWith("NL") && iban.length !== 18) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const n = ch >= "A" ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const d of n) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

const detectIban: Detector = (text) =>
  matches(text, /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,3})?\b/g, "iban").filter((f) =>
    isValidIban(text.slice(f.start, f.end)),
  );

const ID_LABELS =
  "dossiernummer|dossiernr\\.?|cliëntnummer|clientnummer|cliëntnr\\.?|clientnr\\.?|patiëntnummer|patientnummer|" +
  "leerlingnummer|registratienummer|zaaknummer|klantnummer|polisnummer|burgerservicenummer|bsn";

/** Expliciet gelabeld identificatienummer, bijv. "dossiernummer: 2024-0815". Alleen de waarde wordt gemarkeerd. */
const detectLabeledId: Detector = (text) =>
  matches(
    text,
    new RegExp(`\\b(?:${ID_LABELS})\\s*(?:is\\s+)?[:#]?\\s*([A-Za-z0-9][A-Za-z0-9/.-]*\\d[A-Za-z0-9/-]*)`, "giu"),
    "labeled_id",
    1,
  );

/* ------------------------------------------------------------------ */
/* Datums: geboortedatum (blocked) of volledige datum (review)         */
/* ------------------------------------------------------------------ */

const MONTHS =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|" +
  "jan|feb|mrt|apr|jun|jul|aug|sep|sept|okt|nov|dec";

const BIRTH_CONTEXT_BEFORE = /(?:geboren|geb\.|geboortedatum|geboortedag)[^.!?\n]{0,25}$/i;
const BIRTH_CONTEXT_AFTER = /^[^.!?\n]{0,15}\bgeboren\b/i;

function validDayMonth(day: number, month: number) {
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

/** Alleen volledige datums (dag + maand + jaar); losse jaartallen of "maart 2025" niet. */
const detectDates: Detector = (text) => {
  const candidates: { start: number; end: number }[] = [];
  for (const m of text.matchAll(/(?<![\d.\-/])(\d{1,2})([-/.])(\d{1,2})\2(\d{4})(?![\d.\-/]?\d)/g)) {
    if (validDayMonth(Number(m[1]), Number(m[3]))) candidates.push({ start: m.index, end: m.index + m[0].length });
  }
  for (const m of text.matchAll(/(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d-])/g)) {
    if (validDayMonth(Number(m[3]), Number(m[2]))) candidates.push({ start: m.index, end: m.index + m[0].length });
  }
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(?:${MONTHS})\\.?\\s+(\\d{4})\\b`, "gi"))) {
    if (Number(m[1]) >= 1 && Number(m[1]) <= 31) candidates.push({ start: m.index, end: m.index + m[0].length });
  }
  return candidates.map(({ start, end }) => {
    const isBirth =
      BIRTH_CONTEXT_BEFORE.test(text.slice(Math.max(0, start - 40), start)) ||
      BIRTH_CONTEXT_AFTER.test(text.slice(end, end + 25));
    return { category: isBirth ? "birth_date" : "full_date", start, end };
  });
};

/* ------------------------------------------------------------------ */
/* Zwakke signalen (alleen review): instellingen en persoonsnamen      */
/* ------------------------------------------------------------------ */

const CAP = "[A-ZÀ-ÖØ-Þ][\\p{L}'’-]*";

const detectInstitution: Detector = (text) => [
  ...matches(
    text,
    new RegExp(
      `\\b(?:[Bb]asisschool|OBS|CBS|RKBS|PCBS|SBO|IKC|[Kk]indcentrum|[Kk]inderopvang|[Ss]tichting|[Gg]emeente|` +
        `[Zz]iekenhuis|[Hh]uisartsenpraktijk|[Pp]raktijk)\\s+(?:(?:de|het|'t|van|der|den)\\s+)*${CAP}(?:\\s+${CAP})*`,
      "gu",
    ),
    "institution_name",
  ),
  ...matches(
    text,
    new RegExp(`\\b${CAP}(?:\\s+${CAP})*\\s+(?:College|Lyceum|Gymnasium|Academie|Hogeschool|Universiteit)\\b`, "gu"),
    "institution_name",
  ),
];

/**
 * Hoofdletterwoorden die in Nederlandse tekst midden in een zin voorkomen maar geen persoonsnaam zijn.
 * Bewust beperkt: de lijst voorkomt de meest voor de hand liggende valse treffers, meer niet.
 */
const NOT_A_NAME = new Set(
  (
    "Veilig Thuis Jeugdwet Jeugdzorg Wmo Participatiewet Zorgverzekeringswet Wet Raad Kinderbescherming " +
    "Jeugdbescherming Meldcode Belastingdienst Politie Rijksoverheid Inspectie Onderwijs Certum Bureau Studio " +
    "Nederland Nederlands Nederlandse Nederlander België Belgische Europa Europese Engels Engelse Duits Duitse " +
    "Frans Franse Turks Turkse Marokkaans Marokkaanse Surinaams Surinaamse Antilliaans Antilliaanse Pools Poolse " +
    "Syrisch Syrische Eritrees Eritrese Arabisch Arabische Oekraïens Oekraïense Islam Islamitische Ramadan " +
    "Suikerfeest Offerfeest Kerst Kerstmis Pasen Pinksteren Sinterklaas Koningsdag God Bijbel Koran " +
    "Google WhatsApp Instagram TikTok Facebook Snapchat YouTube LinkedIn Teams Zoom Outlook Word Excel Uw"
  ).split(/\s+/),
);

const TUSSENVOEGSELS = new Set(["van", "de", "der", "den", "ter", "ten", "het", "'t", "op", "in", "la", "le"]);
const SENTENCE_BOUNDARY = /[.!?:;…"“”„‘’'(\n]/;

function isSentenceStart(text: string, index: number): boolean {
  let i = index - 1;
  while (i >= 0 && /\s/.test(text[i])) i--;
  return i < 0 || SENTENCE_BOUNDARY.test(text[i]) || text[i] === "-";
}

const detectPersonName: Detector = (text) => {
  const found: RawFinding[] = [];

  // Aanspreekvorm + naam: "mevrouw Jansen", "juf Anouk", "dhr. P. de Vries".
  found.push(
    ...matches(
      text,
      new RegExp(
        `\\b(?:meneer|mevrouw|mevr\\.|mw\\.|dhr\\.|de heer|juf|juffrouw|meester|dokter|dr\\.)\\s+` +
          `((?:[A-Z]\\.\\s?)*(?:(?:van|de|der|den|ter|ten)\\s+)*${CAP})`,
        "gu",
      ),
      "possible_person_name",
      1,
    ),
  );

  // Initialen + achternaam: "J. de Vries".
  found.push(
    ...matches(
      text,
      new RegExp(`(?<![\\p{L}.])(?:[A-Z]\\.\\s?){1,3}(?:(?:van|de|der|den|ter|ten)\\s+)*[A-Z][\\p{Ll}'’-]+`, "gu"),
      "possible_person_name",
    ),
  );

  // Hoofdletterwoord midden in een zin, niet aan het zinsbegin en niet op de lijst hierboven.
  // Opeenvolgende woorden (evt. met tussenvoegsel) worden samengevoegd: "Jan de Vries".
  const words = [...text.matchAll(/[\p{L}'’-]+/gu)];
  let current: RawFinding | null = null;
  let pendingGap: number | null = null;
  for (const w of words) {
    const word = w[0];
    const isCandidate =
      /^[A-ZÀ-ÖØ-Þ][\p{Ll}'’-]+$/u.test(word) && !NOT_A_NAME.has(word) && !isSentenceStart(text, w.index);
    if (isCandidate) {
      if (current && pendingGap !== null && /^[\s\p{Ll}'’]*$/u.test(text.slice(current.end, w.index))) {
        current.end = w.index + word.length;
      } else {
        if (current) found.push(current);
        current = { category: "possible_person_name", start: w.index, end: w.index + word.length };
      }
      pendingGap = w.index + word.length;
    } else if (current && TUSSENVOEGSELS.has(word) && text.slice(pendingGap ?? 0, w.index).trim() === "") {
      // Tussenvoegsel direct na een kandidaat: mogelijk deel van dezelfde naam.
      pendingGap = w.index + word.length;
    } else {
      if (current) found.push(current);
      current = null;
      pendingGap = null;
    }
  }
  if (current) found.push(current);
  return found;
};

/**
 * Volgorde = prioriteit bij overlap: eerst de sterkste en meest specifieke signalen.
 * Een latere bevinding die overlapt met een eerdere, wordt genegeerd.
 */
export const DETECTORS: Detector[] = [
  detectEmail,
  detectSocialProfile,
  detectUrl,
  detectIban,
  detectLabeledId,
  detectBsn,
  detectPhone,
  detectPostcode,
  detectStreetAddress,
  detectDates,
  detectInstitution,
  detectPersonName,
];
