import { describe, expect, it } from "vitest";
import { evalInput as input } from "../../../test/eval-inputs";
import { isValidBsn, isValidIban } from "./detectors";
import {
  evaluatePreflightGate,
  hashPreflightText,
  parsePreflightAcknowledgement,
  runPrivacyPreflight,
} from "./preflight";
import type { PreflightCategory, PreflightResult } from "./types";

/* Alle testdata is synthetisch. Getallen zijn verzonnen of bewust ongeldig. */

const categories = (text: string) => runPrivacyPreflight(text).findings.map((f) => f.category);
const found = (text: string) =>
  runPrivacyPreflight(text).findings.map((f) => [f.category, text.trim().slice(f.span.start, f.span.end)]);

describe("blokkerende categorieën (positief)", () => {
  it.each<[string, PreflightCategory, string]>([
    ["Mail haar via test.persoon@voorbeeld.nl voor een afspraak.", "email", "test.persoon@voorbeeld.nl"],
    ["De vader is bereikbaar op 06-00000000 na vijf uur.", "phone", "06-00000000"],
    ["Bel 06 12345678 als het dringend is.", "phone", "06 12345678"],
    ["Het nummer is +31 6 12345678.", "phone", "+31 6 12345678"],
    ["Het vaste nummer is 010-1234567.", "phone", "010-1234567"],
    ["Het gezin woont in 1234 AB in de wijk.", "postcode", "1234 AB"],
    ["De postcode is 9999ZZ.", "postcode", "9999ZZ"],
    ["Ze woont aan de Voorbeeldstraat 12a sinds kort.", "street_address", "Voorbeeldstraat 12a"],
    ["Het adres is Lindelaan 4-2.", "street_address", "Lindelaan 4-2"],
    ["Zijn burgerservicenummer staat op het formulier: 111222333.", "bsn", "111222333"],
    ["Er staat 111.222.333 op de brief.", "bsn", "111.222.333"],
    ["Betalen naar NL91 ABNA 0417 1643 00 volgens de brief.", "iban", "NL91 ABNA 0417 1643 00"],
    ["In het systeem staat dossiernummer: 2024-0815.", "labeled_id", "2024-0815"],
    ["Het cliëntnummer is AB12345.", "labeled_id", "AB12345"],
    ["Het kind is geboren op 14 maart 2012 in het ziekenhuis.", "birth_date", "14 maart 2012"],
    ["Geboortedatum: 03-04-2015.", "birth_date", "03-04-2015"],
    ["Op 2-5-2016 geboren, nu negen jaar.", "birth_date", "2-5-2016"],
    ["Ze plaatst filmpjes op instagram.com/voorbeeld_account voor vrienden.", "social_profile", "instagram.com/voorbeeld_account"],
    ["Hij heet online @voorbeeld_account op meerdere apps.", "social_profile", "@voorbeeld_account"],
  ])("%s → %s", (text, category, value) => {
    expect(found(text)).toContainEqual([category, value]);
    expect(runPrivacyPreflight(text).status).toBe("blocked");
  });
});

describe("review-signalen (positief)", () => {
  it.each<[string, PreflightCategory, string]>([
    ["Het gesprek vond plaats op 12-03-2025 op school.", "full_date", "12-03-2025"],
    ["Op 1 september 2025 start het nieuwe schooljaar.", "full_date", "1 september 2025"],
    ["Zie het verslag van 2025-03-12 voor details.", "full_date", "2025-03-12"],
    ["Meer informatie staat op https://www.voorbeeld.nl/protocol.", "url", "https://www.voorbeeld.nl/protocol"],
    ["Tijdens een gesprek vertelt Sanne dat ze zich zorgen maakt.", "possible_person_name", "Sanne"],
    ["De mentor spreekt met mevrouw Jansen over de voortgang.", "possible_person_name", "Jansen"],
    ["Het gesprek met juf Anouk verliep rustig.", "possible_person_name", "Anouk"],
    ["Volgens J. de Vries is dit eerder gebeurd.", "possible_person_name", "J. de Vries"],
    ["Daarna belt de professional met Jan de Vries.", "possible_person_name", "Jan de Vries"],
    ["Ze zit op Basisschool De Regenboog in groep 6.", "institution_name", "Basisschool De Regenboog"],
    ["Hij volgt havo op het Voorbeeld College sinds vorig jaar.", "institution_name", "Voorbeeld College"],
  ])("%s → %s", (text, category, value) => {
    expect(found(text)).toContainEqual([category, value]);
    expect(runPrivacyPreflight(text).status).toBe("review_required");
  });

  it("namen en instellingen leiden nooit tot blocked", () => {
    const text = "Tijdens het gesprek met mevrouw Jansen vertelt Sanne over Basisschool De Regenboog.";
    const result = runPrivacyPreflight(text);
    expect(result.status).toBe("review_required");
    expect(result.findings.every((f) => f.severity === "review_required")).toBe(true);
  });
});

describe("false positives (negatief): geen bevinding", () => {
  it.each([
    "Volgens versie 2.4 van het protocol, hoofdstuk 3, artikel 12, geldt een termijn van 5 werkdagen.",
    "Het team ondersteunt 230 gezinnen en registreerde 1.850 contactmomenten in 2024.",
    "Het team is bereikbaar tussen 9.00 en 17.00 uur, ook op 09.00-17.00 in de vakantie.",
    "Bij twijfel overlegt het team met Veilig Thuis en de Raad voor de Kinderbescherming.",
    "Volgens de Jeugdwet en de Wmo heeft de gemeente een taak.",
    "De 14-jarige leerling zit in leerjaar 3 van het vmbo.",
    "In maart 2025 is het beleid aangepast; het plan loopt tot 2027.",
    "De bestanden zijn samen 1024 KB groot en de afstand is 1500 KM.",
    "De gratis infolijn 0800-1234567 is voor algemene vragen.",
    "Het protocolnummer is 2024-117 en geldt voor het hele team.",
    "Ordernummer 123456789 is niet relevant voor de casus.",
    "De school ligt aan een drukke weg en heeft 3 lokalen.",
    "Ze spreekt thuis Arabisch en Nederlands, en op school Engels.",
    "Na de Ramadan en voor Kerst wordt het rustiger in de klas.",
    "Het gezin gebruikt WhatsApp en Teams om contact te houden.",
    "De leerling zegt: \"Het gaat wel\" en verandert het onderwerp.",
    "Eén ouder vraagt de professional partij te kiezen.",
    "Score 12/03 op de toets; percentage 45,5%.",
    "Omgaan met weerstand",
  ])("%s", (text) => {
    expect(found(text)).toEqual([]);
    expect(runPrivacyPreflight(text).status).toBe("safe");
  });

  it("een naam aan het begin van een zin wordt bewust niet herkend (bekende beperking)", () => {
    expect(categories("Sanne vertelt over thuis.")).toEqual([]);
  });

  it("een gewone hoofdletter na een zinseinde is geen naam", () => {
    expect(categories("De leerling is stil. Hij zegt weinig. Daarna gaat hij naar huis.")).toEqual([]);
  });
});

describe("validatoren", () => {
  it("BSN 11-proef", () => {
    expect(isValidBsn("111222333")).toBe(true);
    expect(isValidBsn("123456789")).toBe(false);
    expect(isValidBsn("000000000")).toBe(false);
  });

  it("IBAN mod-97", () => {
    expect(isValidIban("NL91ABNA0417164300")).toBe(true);
    expect(isValidIban("NL91ABNA0417164301")).toBe(false);
  });
});

describe("runPrivacyPreflight", () => {
  it("is deterministisch en wijzigt de tekst niet", () => {
    const text = "  Sanne woont aan de Voorbeeldstraat 1, tel 06-00000000.  ";
    const copy = text.slice();
    expect(runPrivacyPreflight(text)).toEqual(runPrivacyPreflight(text));
    expect(text).toBe(copy);
  });

  it("werkt op de getrimde tekst: zelfde id's en posities met of zonder witruimte", () => {
    expect(runPrivacyPreflight("  vertelt Sanne  ")).toEqual(runPrivacyPreflight("vertelt Sanne"));
  });

  it("geeft stabiele id's per categorie zonder waarden", () => {
    const result = runPrivacyPreflight("Bel 06-00000000 of 06-11111111 en vraag naar juf Anouk.");
    expect(result.findings.map((f) => f.id)).toEqual(["phone-1", "phone-2", "possible_person_name-1"]);
    expect(JSON.stringify(result.findings.map((f) => f.id))).not.toContain("06");
  });

  it("overlappende bevindingen worden niet dubbel geteld (sterkste wint)", () => {
    const result = runPrivacyPreflight("Het BSN is 111222333.");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe("blocked");
  });

  it("lege tekst is safe", () => {
    expect(runPrivacyPreflight("   ").status).toBe("safe");
  });
});

describe("evalcases CA-001 t/m CA-008 en PP-001 t/m PP-003", () => {
  it.each(["CA-001", "CA-002", "CA-003", "CA-005", "CA-006", "CA-007", "CA-008", "PP-001"])(
    "%s: safe (geen valse treffers in gewone casusteksten)",
    (id) => {
      expect(runPrivacyPreflight(input(id))).toMatchObject({ status: "safe", findings: [] });
    },
  );

  it("CA-004: blocked op meerdere directe identificatoren", () => {
    const result = runPrivacyPreflight(input("CA-004"));
    expect(result.status).toBe("blocked");
    const blocked = result.findings.filter((f) => f.severity === "blocked").map((f) => f.category);
    expect(blocked).toEqual(expect.arrayContaining(["birth_date", "street_address", "phone"]));
  });

  it("PP-002: alleen review_required op de vergaderdatum, niets blocked", () => {
    const result = runPrivacyPreflight(input("PP-002"));
    expect(result.status).toBe("review_required");
    expect(result.findings.map((f) => f.category)).toEqual(["full_date"]);
  });

  it("PP-003: alleen review_required op de mogelijke voornaam", () => {
    const result = runPrivacyPreflight(input("PP-003"));
    expect(result.status).toBe("review_required");
    expect(result.findings.map((f) => f.category)).toEqual(["possible_person_name"]);
  });
});

describe("evaluatePreflightGate", () => {
  const review: PreflightResult = runPrivacyPreflight("Tijdens een gesprek vertelt Sanne over thuis.");
  const blocked: PreflightResult = runPrivacyPreflight("Bel 06-00000000 of vraag naar juf Anouk.");
  const safe: PreflightResult = runPrivacyPreflight("Een leerling vertelt over thuis.");
  const HASH = "a".repeat(64);
  const ack = (ids: string[], textHash = HASH) => ({
    textHash,
    acknowledgedFindingIds: ids,
    syntheticDataAttested: true,
  });

  it("blocked kan nooit worden bevestigd, ook niet met alle id's", () => {
    const allIds = blocked.findings.map((f) => f.id);
    expect(evaluatePreflightGate({ preflight: blocked, currentTextHash: HASH, acknowledgement: ack(allIds) })).toEqual({
      allowed: false,
      reason: "blocked",
    });
  });

  it("review zonder (volledige) bevestiging gaat niet door", () => {
    expect(evaluatePreflightGate({ preflight: review, currentTextHash: HASH, acknowledgement: null })).toEqual({
      allowed: false,
      reason: "review_required",
    });
    expect(evaluatePreflightGate({ preflight: review, currentTextHash: HASH, acknowledgement: ack([]) })).toEqual({
      allowed: false,
      reason: "review_required",
    });
  });

  it("review met bevestiging van elke bevinding gaat door", () => {
    expect(
      evaluatePreflightGate({ preflight: review, currentTextHash: HASH, acknowledgement: ack(["possible_person_name-1"]) }),
    ).toEqual({ allowed: true });
  });

  it("bevestiging bij een andere tekst (hash) is ongeldig", () => {
    expect(
      evaluatePreflightGate({
        preflight: review,
        currentTextHash: HASH,
        acknowledgement: ack(["possible_person_name-1"], "b".repeat(64)),
      }),
    ).toEqual({ allowed: false, reason: "stale_acknowledgement" });
  });

  it("safe zonder bevindingen: de preflight-poort zelf laat door (de data-policy is een aparte poort)", () => {
    expect(evaluatePreflightGate({ preflight: safe, currentTextHash: HASH, acknowledgement: null })).toEqual({
      allowed: true,
    });
  });
});

describe("hashPreflightText en parsePreflightAcknowledgement", () => {
  it("hash is SHA-256 hex, gelijk voor dezelfde getrimde tekst en anders na wijziging", async () => {
    const a = await hashPreflightText("vertelt Sanne");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashPreflightText("  vertelt Sanne ")).toBe(a);
    expect(await hashPreflightText("vertelt Sanne.")).not.toBe(a);
  });

  it("accepteert alleen een geldig gevormde bevestiging", () => {
    const valid = { textHash: "a".repeat(64), acknowledgedFindingIds: ["full_date-1"], syntheticDataAttested: true };
    expect(parsePreflightAcknowledgement(valid)).toEqual(valid);
    for (const invalid of [
      null,
      "x",
      { ...valid, textHash: "kort" },
      { ...valid, acknowledgedFindingIds: "full_date-1" },
      { ...valid, acknowledgedFindingIds: ["<script>"] },
      { ...valid, syntheticDataAttested: "ja" },
      // Oude veldnaam wordt niet geaccepteerd: zonder syntheticDataAttested geen geldige bevestiging.
      { textHash: valid.textHash, acknowledgedFindingIds: [], anonymizationAttested: true },
    ]) {
      expect(parsePreflightAcknowledgement(invalid)).toBeNull();
    }
  });
});
