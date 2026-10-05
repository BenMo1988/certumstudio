# SG-002 · run 2026-10-05 · training-block-content/v1.2 · claude-opus-5-5 · medium

| | |
| --- | --- |
| **Model / effort** | `claude-opus-5-5` · `medium` (`maxRetries: 0`, geen retry) |
| **Prompt / contract** | `training-block-content/v1.2` · `block-content/v1` |
| **Calls** | 1 (`generateCalls: 1`); alle andere providers mock of fixture |
| **Resultaat** | `needs_source` |
| **Duur** | 10 003 ms (provider), 10 137 ms (wall) |
| **Bronrevisions** | `src-1` `ce26f509-1223-4e89-94bc-20515f87b527` (SN1, SN2), gevalideerd |
| **Provenance** | `based_on` = Blueprint `3db3ae85…`, Block Plan `59c8db8a…`, `src-1`: **exact** (`provenanceExact: true`) |
| **sourceNeedRefs** | `SN1`, `SN2` |
| **Logs** | 1 × `certum.block_content_generation`, alleen metadata; 0 lekken |
| **Volledige output** | [`2026-10-05_training-block-content-v1.2_result.json`](2026-10-05_training-block-content-v1.2_result.json), ruwe providerreturn in `_raw.json` |
| **Status** | `PENDING_REVIEW` (voorstel: `PASS`) |

## Human grounding review (voorstel, ter bevestiging door Bureau Certum)

De output bevat geen inhoudelijke kennisbeweringen; alleen een vaststelling over de bron en wat ontbreekt.

| # | Bewering | Oordeel |
| --- | --- | --- |
| 1 | De bron bevat alleen de algemene uitspraak dat leidinggevenden zorgvuldig omgaan met privéomstandigheden. | `supported` (exacte weergave) |
| 2 | Dat beantwoordt geen van beide kennisvragen. | `supported` (juiste vaststelling) |
| 3 | Voor SN1 ontbreekt: handelingsruimte en verantwoordelijkheden, en wat wel/niet gevraagd mag worden. | `supported` (herhaalt de SN1-vraag, voegt geen antwoord toe) |
| 4 | Voor SN2 ontbreken gesprekstechnieken of methodische principes. | `supported` (herhaalt de SN2-vraag; geen techniek genoemd) |
| 5 | Daarna mogelijk: titel en tekst uitsluitend op basis van de broninhoud, met vergelijkingsopdracht, route-neutraal. | `supported` (Block Plan `configurationIntent`, Blueprint `open_choice`) |

**Telling:** 0 `unsupported`, 0 `ambiguous`. Geen enkele poging het gat te vullen: geen wet, AVG, poortwachter,
bedrijfsarts, gesprekstechniek met een naam of andere algemene kennis.

## Verwachtingen

| # | Verwachting | Uitkomst |
| --- | --- | --- |
| E-1 | Status `needs_source` | ✓ |
| E-2 | Duidelijk wat ontbreekt (SN1, SN2) | ✓ per sourceNeed |
| E-3 | Gat niet vullen met algemene AI-kennis | ✓ |
| E-4 | Geen fictieve bronclaims | ✓ (alleen de aangeleverde titel) |
| E-5 | Alleen bestaande sourceNeedRefs | ✓ |
| E-6 | Alleen metadata in logs | ✓ |

## Opvallend

- Validated ≠ voldoende werkt: de server liet `generated` toe (bronnen dekken formeel), de provider koos zelf
  `needs_source`.
- `assessmentRole: formative` bij `needs_source`, tegenover `none` bij de gegenereerde versie (SG-001). Klein
  verschil in metadata; geen gevolg zolang het blok niet gegenereerd is.
