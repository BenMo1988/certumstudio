# CA-001: Escalerend ouderconflict, kind binnen gehoorsafstand

| | |
| --- | --- |
| **Eval-id** | CA-001 |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Input

Exact zoals ingevoerd (570 tekens). Niet wijzigen.

```text
Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen rondom hun 12-jarige dochter. Tijdens het gesprek verwijten de ouders elkaar dat de ander verantwoordelijk is voor de problemen van het kind. De toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te zullen werken aan de hulpverlening. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of het gesprek moet beëindigen.
```

## Verwachtingen

| # | Verwachting |
| --- | --- |
| V1 | **Centrale kern:** professionele regie, plus de belasting en het belang van het kind, bij een escalerend ouderconflict. |
| V2 | **Geschiktheid:** `geschikt` voor een praktijksimulatie. |
| V3 | **Privacy:** geen privacyblokkade (`geen` of hooguit `aandachtspunt`, niet `blokkeren`). |
| V4 | **Trainingsrichtingen:** 2–3 richtingen die professioneel echt van elkaar verschillen. |
| V5 | Niet gereduceerd tot alleen "communicatie verbeteren". |
| V6 | Geen diagnoses of feiten verzonnen die niet in de input staan. |
| V7 | Geen specifieke juridische verplichtingen als feit geïntroduceerd zonder bronvalidatie. |
| V8 | Geen volledige training uitgeschreven (geen Context/Actie/Reflectie/Feedback/Bron/Toets-uitwerking). |

## Verwachtingen voor Analysis Contract V2

Vastgelegd vóór de implementatie van Analysis Contract V2 en `training-analysis/v2`. De V1-verwachtingen hierboven
blijven ongewijzigd en gelden voor de v1-runs.

**Verwachte uitkomst:** `ready`: alleen deze uitkomst levert selecteerbare trainingsrichtingen.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2-1 | Moet | Trainingsrichtingen (1–3) verwijzen elk via `sourceRefs` naar minimaal één bestaand bronsegment. |
| V2-2 | Mag niet | Nieuwe scenariofeiten: personen, reacties, gebeurtenissen, oorzaken of gevolgen die niet in de input staan, ook niet in trainingsrichtingen. |
| V2-3 | Mag niet | Ongefundeerde juridische, methodische of theoretische kaders in gebruikersgerichte analysevelden; zulke begrippen horen hooguit in `sourceCandidates`. |
| V2-4 | Moet | `decisionRelevantGaps` (max. 3) alleen voor informatie die een beslissing over geschiktheid, dilemma, leerdoel, doelgroep of richtingkeuze kan veranderen. |
| V2-5 | Mag niet | "Meerzijdige partijdigheid", "meldplicht" of "kindbescherming" als vastgesteld kader in gebruikersgerichte velden (deze begrippen staan niet in de input). |
| V2-6 | Moet | 2–3 professioneel verschillende trainingsrichtingen. |

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v1 | claude-opus-5-5 | medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-analysis/v2 | claude-opus-5-5 | medium | `PENDING_REVIEW` | [run](runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md) |
