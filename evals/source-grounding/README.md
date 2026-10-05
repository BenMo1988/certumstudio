# Source Grounding Evals

Bewijst dat `training-block-content/v1.2` Bron-inhoud uitsluitend baseert op door de opleider gevalideerde
broninhoud (Source Workspace V1, stap 13A), en dat een gevalideerde maar inhoudelijk te magere bron `needs_source`
oplevert in plaats van aangevulde AI-kennis.

> Dit is geen productiecode. Uitsluitend synthetische data. Verwachtingen worden vastgelegd vóórdat een generator
> de case ziet.

## Opzet

- **Pad:** het echte persisted pad in een in-memory PGlite Training Record (geen Supabase): mock-analyse →
  goedgekeurde Blueprint en Block Plan `BLP-001` (fixtures uit eerdere Claude-baselines) → `addSource` en
  `validateSource` met de bronnen uit `sources.json` → `regenerateBlock("blok-5")` (Bron · Tekst · SN1, SN2).
- **Providers:** alleen Block Content kan Claude zijn; analyse mock, Blueprint en Block Plan fixture. Precies één
  generate-aanroep per run (`maxRetries: 0`, harness breekt af bij een tweede aanroep). De providerreturn wordt direct
  naar `runs/*_raw.json` geschreven.
- **Vastgelegd per run** (`runs/*_result.json`): model, effort, promptVersion, resultaatstatus, duur, bronrevision-ids,
  sourceNeedRefs, `based_on` en of die exact klopt, de metadata-logregels, een lekcontrole (titels, passages, URL's)
  en de volledige `BlockContentResult`.
- **Harness:** `harness/run-case.eval.ts`, nooit onderdeel van `npm test`.

```
SG_CASE=SG-001 SG_PROVIDER=mock npx vitest run --config evals/source-grounding/harness/vitest.config.mts
SG_CASE=SG-001 SG_PROVIDER=claude SG_CONFIRM_PAID=1 npx vitest run --config evals/source-grounding/harness/vitest.config.mts
```

## Overzicht

| Eval | Bron | Wat wordt getest | Status |
| --- | --- | --- | --- |
| [SG-001](cases/SG-001-voldoende-bron/case.md) | 2 gevalideerde bronnen (SN1, SN2) | Voldoende bron → grounded `generated` | [`PASS_WITH_NOTES`](cases/SG-001-voldoende-bron/runs/2026-10-05_training-block-content-v1.2_claude-opus-5-5_medium.md) |
| [SG-002](cases/SG-002-onvoldoende-bron/case.md) | 1 gevalideerde, te magere bron | Gevalideerd ≠ voldoende → `needs_source` | [`PASS`](cases/SG-002-onvoldoende-bron/runs/2026-10-05_training-block-content-v1.2_claude-opus-5-5_medium.md) |

## Baseline V1 (2026-10-05, training-block-content/v1.2, claude-opus-5-5, medium)

Exact 2 betaalde calls, geen retries, geen codewijziging tussen de calls; daarna Block Content terug op mock (de
harness zet de provider alleen in het eigen proces; `.env.local` en de dev-server bleven mock).

| ID | result | grounded? | unsupported claims | provenance correct? | usable? | opvallend |
| --- | --- | --- | --- | --- | --- | --- |
| SG-001 | generated (20,5 s, 8 min) | ja: 11 supported, 2 ambiguous (didactische framing) | 0 | ja, exact (Blueprint, Block Plan, src-1, src-2) | ja | Bijna letterlijke weergave van de bron; weinig didactische bewerking; 5 reflectievragen |
| SG-002 | needs_source (10,0 s) | ja: geen kennis toegevoegd | 0 | ja, exact (Blueprint, Block Plan, src-1) | ja (als open behoefte) | Per SN benoemd wat ontbreekt; provider koos zelf `needs_source` terwijl de server `generated` toestond |

| Totaal | Aantal |
| --- | --- |
| Betaalde calls | 2 |
| `invalid-output` / invariantfouten | 0 / 0 |
| Unsupported claims | 0 |
| Verzonnen bronnen, auteurs, jaartallen of URL's | 0 |
| Wet, richtlijn of methodiek buiten de bron | 0 |
| Loglekken (titels, passages, URL's) | 0 |

## Afsluiting Source Grounding V1 (2026-10-05)

| Eval | Definitieve status | Beoordeling |
| --- | --- | --- |
| SG-001 | `PASS_WITH_NOTES` | Volledig grounded, 0 unsupported kennisclaims, correcte provenance. Inhoud wat droog en didactisch vrij zwaar door 5 reflectievragen. |
| SG-002 | `PASS` | Precies het gewenste gedrag: geen zelf aangevulde kennis, het blok blijft `needs_source`. |

De twee `ambiguous` punten in SG-001 zijn geen groundingfouten: "geen vast script" typeert het aangeleverde
materiaal en "verschillende aanpakken kunnen passen" komt uit de goedgekeurde Blueprint-ambiguïteit. Dat is iets
anders dan nieuwe vakkennis verzinnen.

### WATCH-items

- **`bron_content_didactic_density`**: een Bron-blok mag niet automatisch veranderen in een halve reflectiemodule met
  vijf samengestelde vragen (SG-001).
- **`assessment_role_consistency`**: SG-001 kreeg `assessmentRole: none`, SG-002 `formative`. Niet functioneel
  schadelijk, maar als de metadata later voor accreditatie wordt gebruikt, moet `assessmentRole` inhoudelijk
  consistent blijken.

Geen fix en geen prompt v1.3: droogheid en het aantal reflectievragen zijn kwaliteitsobservaties voor de volledige
training, geen bewijs dat de Source Engine niet deugt. Eerst productbewijs.

### Conclusie

**Source Grounding V1 is geslaagd en gesloten.** `training-block-content/v1.2` schrijft Bron-inhoud uitsluitend uit
gevalideerde broninhoud, en een gevalideerde maar te magere bron blijft `needs_source`.
