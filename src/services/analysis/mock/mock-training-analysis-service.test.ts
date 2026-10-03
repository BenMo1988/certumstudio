import { describe, expect, it } from "vitest";
import { MockTrainingAnalysisService } from "./mock-training-analysis-service";

const mock = new MockTrainingAnalysisService(0);

describe("MockTrainingAnalysisService", () => {
  it("onderwerp: aanpassen, geen doelgroep, ontbrekende informatie", async () => {
    const analysis = await mock.analyze({ kind: "onderwerp", text: "Professioneel begrenzen" });
    expect(analysis.suitability.verdict).toBe("aanpassen");
    expect(analysis.targetAudience).toBeNull();
    expect(analysis.missingInformation.length).toBeGreaterThan(0);
  });

  it("praktijkvraag: geschikt zonder privacybevinding", async () => {
    const analysis = await mock.analyze({ kind: "praktijkvraag", text: "Hoe ga ik om met een boze ouder?" });
    expect(analysis.suitability.verdict).toBe("geschikt");
    expect(analysis.privacyAssessment.level).toBe("geen");
  });

  it("casus: privacy-aandachtspunt", async () => {
    const analysis = await mock.analyze({ kind: "casus", text: "Een leerling vraagt om geheimhouding." });
    expect(analysis.privacyAssessment.level).toBe("aandachtspunt");
  });

  it("casus met #blokkeren: privacyblokkade", async () => {
    const analysis = await mock.analyze({ kind: "casus", text: "Casus #blokkeren" });
    expect(analysis.privacyAssessment.level).toBe("blokkeren");
  });

  it("#blokkeren werkt alleen bij casus", async () => {
    const analysis = await mock.analyze({ kind: "praktijkvraag", text: "Vraag #blokkeren" });
    expect(analysis.privacyAssessment.level).toBe("geen");
  });

  it("#ongeschikt werkt bij elke soort", async () => {
    for (const kind of ["onderwerp", "praktijkvraag", "casus"] as const) {
      const analysis = await mock.analyze({ kind, text: "Wat eten we? #ongeschikt" });
      expect(analysis.suitability.verdict).toBe("ongeschikt");
    }
  });

  it("geeft een kopie, zodat aanpassingen de mockdata niet raken", async () => {
    const first = await mock.analyze({ kind: "onderwerp", text: "x" });
    first.summary = "gewijzigd";
    const second = await mock.analyze({ kind: "onderwerp", text: "x" });
    expect(second.summary).not.toBe("gewijzigd");
  });
});
