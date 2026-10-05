# SG-001 · run 2026-10-05 · training-block-content/v1.2 · claude-opus-5-5 · medium

| | |
| --- | --- |
| **Model / effort** | `claude-opus-5-5` · `medium` (`maxRetries: 0`, geen retry) |
| **Prompt / contract** | `training-block-content/v1.2` · `block-content/v1` |
| **Calls** | 1 (`generateCalls: 1`); alle andere providers mock of fixture |
| **Resultaat** | `generated` |
| **Duur** | 20 529 ms (provider), 20 659 ms (wall) |
| **Bronrevisions** | `src-1` `89e218fa-8918-432d-9854-aa1699b90bcb` (SN1) · `src-2` `1482877d-ae79-41da-907a-b3a69e35df6b` (SN2) |
| **Provenance** | `based_on` = Blueprint `96cd821f…`, Block Plan `3c262941…`, `src-1`, `src-2`: **exact** (`provenanceExact: true`) |
| **sourceNeedRefs** | `SN1`, `SN2` |
| **Logs** | 1 × `certum.block_content_generation`, alleen metadata; 0 lekken van titels, passages of URL's |
| **Volledige output** | [`2026-10-05_training-block-content-v1.2_result.json`](2026-10-05_training-block-content-v1.2_result.json) (`blockContentResult`), ruwe providerreturn in `_raw.json` |
| **Status** | `PENDING_REVIEW` (voorstel: `PASS_WITH_NOTES`) |

## Human grounding review (voorstel, ter bevestiging door Bureau Certum)

Per inhoudelijke bewering, tegen de gevalideerde `relevantContent` van `src-1` (L1–L5) en `src-2` (Wa–Wc, W-slot).

| # | Bewering in de output | Bron | Oordeel |
| --- | --- | --- | --- |
| 1 | Een medewerker bepaalt zelf hoeveel hij over privéomstandigheden vertelt. | L1 | `supported` |
| 2 | Als leidinggevende vraag je niet door naar de inhoud van die omstandigheden. | L1 | `supported` |
| 3 | Je blijft verantwoordelijk voor het werk en het team. | L2 | `supported` |
| 4 | Je mag het functioneren, de werkafspraken en de gevolgen voor collega's bespreken. | L2 | `supported` |
| 5 | Je mag vragen wat de medewerker nodig heeft om de afspraken na te komen, zonder te vragen waarom. | L3 | `supported` |
| 6 | Afspraken over tijdelijke aanpassingen worden schriftelijk vastgelegd en na uiterlijk vier weken samen geëvalueerd. | L4 | `supported` |
| 7 | Bij twijfel over gezondheid verwijs je naar de bedrijfsarts; je stelt zelf geen vragen over de aard van klachten. | L5 | `supported` |
| 8 | Scheid de persoon en het werk: eerst de grens benoemen, daarna concreet welk werk blijft liggen. | Wa | `supported` |
| 9 | Beschrijf feiten, geen interpretaties; waarneembare gevolgen zoals gemiste overdrachten, geen vermoedens over oorzaken. | Wb | `supported` |
| 10 | Vraag "Wat heb je nodig om deze afspraak na te komen?" in plaats van "Wat is er aan de hand?". | Wc | `supported` |
| 11 | Sluit af met een concrete afspraak en een moment om samen terug te kijken. | W-slot | `supported` |
| 12 | "Ze beschrijven geen vast script." (over de bronnen) | – | `ambiguous`: redelijke typering van de bronnen, maar staat er niet letterlijk in |
| 13 | "Verschillende aanpakken kunnen binnen deze ruimte passen." | – (Blueprint: `open_choice`) | `ambiguous`: volgt uit het trusted routebeleid, niet uit de bron; geen kennisclaim |

Niet als bewering geteld: de inleidende zin over de eerdere trainingsstappen (volgt uit het Block Plan), de
reflectievragen (didactische vergelijkingsopdracht uit `configurationIntent`) en de slotopdracht ("benoem wat wordt
versterkt of herzien").

**Telling:** 11 `supported`, 0 `unsupported`, 2 `ambiguous`.

## Verwachtingen

| # | Verwachting | Uitkomst |
| --- | --- | --- |
| E-1 | Status `generated` | ✓ |
| E-2 | Geen claims buiten `relevantContent` | ✓ (0 unsupported; 2 ambiguous, geen kennis) |
| E-3 | Geen wet, richtlijn, methodiek, onderzoek of cijfer buiten de bron | ✓ (alleen "bedrijfsarts" en "vier weken", beide uit L4/L5) |
| E-4 | Parafraseren en didactisch toegankelijk maken toegestaan | ✓ (kopjes, je-vorm, vergelijkingsopdracht) |
| E-5 | Geen verzonnen bron, auteur, jaartal of URL | ✓ (alleen de aangeleverde titels) |
| E-6 | Provenance exact | ✓ |
| E-7 | `sourceNeedRefs` = SN1, SN2 | ✓ |
| E-8 | Leerdoel, dilemma, fase, bloktype ongewijzigd | ✓ (trusted; `learningGoalContribution` is een eigen, toegestaan veld) |
| E-9 | Geen kennis uit andere trainingsdelen binnensmokkelen | ✓ |
| E-10 | Alleen metadata in logs | ✓ |

## Opvallend

- Zeer dicht bij de brontekst: bijna letterlijke weergave, alleen omgezet naar je-vorm. Grounded, maar weinig
  didactische bewerking; voor een echte training mogelijk wat droog.
- Vijf reflectievragen, waarvan enkele met twee deelvragen (vgl. WATCH `reflection_question_density`).
- Opsommingen staan als losse regels zonder lijsttekens (Tekst-blok, platte tekst).
- Grammaticaal "hij" voor de medewerker, overgenomen uit de bron.
