# Training Block Content Evals

Kwaliteitsbasis voor de laag ná het goedgekeurde BC Online Block Plan: per gepland blok de daadwerkelijke
trainingsinhoud (Block Content), samengebracht in een Certum-eigen Training Content Package.

> Dit is geen productiecode. Uitsluitend synthetische data. Verwachtingen worden vastgelegd vóórdat een generator
> (mock of AI) de case ziet.

## Plaats in de keten

Training Blueprint → BC Online Block Plan → **Block Content** (per blok) → later Training Review / Editor →
persistence → preview → Accreditation Readiness. De BC Online Adapter blijft buiten scope.

## Uitgangspunten

- Eén request genereert inhoud voor precies één gepland blok (individueel regenereren en goedkeuren).
- Input: uitsluitend de goedgekeurde Blueprint, het goedgekeurde Block Plan, het doelblok, de catalogusdefinitie en
  eventueel eerder goedgekeurde blokinhoud. Nooit de oorspronkelijke casus, de analyse of bronsegmenten.
- Geen fictieve URL's, assets of bronnen. Bron zonder gevalideerde bron → `needs_source`; media zonder asset →
  `needs_asset`; een behoefte die BC Online niet aantoonbaar ondersteunt → `blocked_by_capability`.
- AI Feedback vertrouwt alleen op context die de catalogus aantoonbaar levert (antwoorden op eerdere vraagblokken).

## Statussen

| Status | Betekenis |
| --- | --- |
| `PASS` | Voldoet aan alle verwachtingen. |
| `PASS_WITH_NOTES` | Bruikbaar, met aandachtspunten. |
| `FAIL` | Wijkt af van een kernverwachting. |
| `PENDING_REVIEW` | Run vastgelegd; menselijke beoordeling volgt. |
| `NOT_RUN` | Verwachtingen vastgelegd; nog geen run. |

## Overzicht

| Eval | Block Plan | Doelblok | Wat wordt getest | Status |
| --- | --- | --- | --- | --- |
| [BC-001](cases/BC-001-open-chat-simulatie/case.md) | BLP-001 | `blok-2` · `certum.bco.chat-simulatie` | Open Chat simulatie | [`PASS_WITH_NOTES`](cases/BC-001-open-chat-simulatie/runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium_vervanging.md) |
| [BC-002](cases/BC-002-voorgeschreven-productie/case.md) | BLP-002 | `blok-3` · `certum.bco.productie` | Voorgeschreven Productie | [`FAIL`](cases/BC-002-voorgeschreven-productie/runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md) |
| [BC-003](cases/BC-003-bron-zonder-gevalideerde-bron/case.md) | BLP-001 | `blok-5` · `certum.bco.tekst` | Bron zonder gevalideerde bron | [`PENDING_REVIEW`](cases/BC-003-bron-zonder-gevalideerde-bron/runs/2026-10-04_deterministisch.md) |
| [BC-004](cases/BC-004-media-zonder-asset/case.md) | BLP-001-MEDIA | `blok-1` · `certum.bco.video` | Media zonder asset | [`PENDING_REVIEW`](cases/BC-004-media-zonder-asset/runs/2026-10-04_deterministisch.md) |
| [BC-005](cases/BC-005-ai-feedback-onbewezen-context/case.md) | BLP-002-UNPROVEN-FEEDBACK | `blok-5` · `certum.bco.ai-feedback` | AI Feedback met uitsluitend onbewezen context (deterministisch) | [`PENDING_REVIEW`](cases/BC-005-ai-feedback-onbewezen-context/runs/2026-10-04_deterministisch.md) |
| [BC-006](cases/BC-006-reflectieve-open-vraag/case.md) | BLP-001 | `blok-3` · `certum.bco.open-vraag` | Reflectieve Open vraag | [`PASS_WITH_NOTES`](cases/BC-006-reflectieve-open-vraag/runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md) |
| [BC-007](cases/BC-007-ai-feedback-bewezen-context/case.md) | BLP-003 | `blok-8` · `certum.bco.ai-feedback` | AI Feedback met bewezen context | [`PASS`](cases/BC-007-ai-feedback-bewezen-context/runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium_vervanging.md) |

## Betaald en deterministisch

Claude wordt alleen aangeroepen als een blok werkelijk `generated` kan worden. Bron, media en AI Feedback zonder
aantoonbare context bepaalt de server zelf, zonder provider.

| Soort | Evals |
| --- | --- |
| Betaald (één Claude-aanroep per case) | BC-001, BC-002, BC-006, BC-007 |
| Deterministisch (0 providercreaties) | BC-003 (`needs_source`), BC-004 (`needs_asset`), BC-005 (`blocked_by_capability`) |

## Baseline V1 (2026-10-04, training-block-content/v1, claude-opus-5-5, medium)

| ID | type | result | ms | minutes | assessmentRole | content grounded? | usable? | opvallend |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BC-001 | chat-simulatie | generated (niet vastgelegd) | 25787 | 15 | ? | ? | ? | Output niet vastgelegd (harnessfout) |
| BC-002 | productie | generated | 16472 | 8 | formative | ja | ja, na tekstcorrectie | Capability overclaim in deelnemertekst (melding "wordt gebruikt bij de feedback"); minimumWords 40 niet gevraagd |
| BC-003 | tekst (Bron) | needs_source | 0 | – | none | ja (alleen trusted) | ja (als open behoefte) | Server-side, 0 providercreaties |
| BC-004 | video | needs_asset | 0 | – | none | ja (alleen trusted) | ja (als open behoefte) | Server-side, 0 providercreaties |
| BC-005 | ai-feedback | blocked_by_capability | 0 | – | formative | ja (alleen trusted) | ja (als open behoefte) | Server-side, 0 providercreaties |
| BC-006 | open-vraag | generated | 11284 | 10 | formative | ja | ja | Concreet en route-neutraal; vier deelvragen in één veld |
| BC-007 | ai-feedback | generated (niet vastgelegd) | 22963 | 5 | ? | ? | ? | Output niet vastgelegd (harnessfout) |

"ms" is de providerduur (`durationMs`); 0 betekent geen provider.

| Totaal | Aantal |
| --- | --- |
| Betaalde Block Content-aanroepen | 4 (exact één per betaalde case, `maxRetries: 0`, geen retry) |
| Deterministische resultaten zonder provider | 3 (BC-003, BC-004, BC-005; 0 providercreaties) |
| Geslaagd `generated` | 4 van 4 aanroepen (waarvan 2 met vastgelegde output) |
| `invalid-output` | 0 |
| Invariantfouten | 0 |
| Nieuwe feiten | 0 (in de 2 vastgelegde outputs) |
| Ongevalideerde bronclaims | 0 |
| Capability overclaims | 1 (BC-002: Productie-uitwerking "wordt gebruikt bij de feedback") |
| Mogelijke content creep | 1 klein (BC-002: `minimumWords: 40` zonder vraag in het Block Plan) |
| Niet vastgelegd (harnessfout) | 2 (BC-001, BC-007): `INCONCLUSIVE`; herhaling vraagt toestemming |

### Vervangende runs BC-001 en BC-007 (2026-10-04)

De oorspronkelijke calls waren technisch geslaagd, maar hun inhoud is niet opgeslagen (harnessfout; die runs blijven
`INCONCLUSIVE`). Met expliciete toestemming exact twee extra calls onder dezelfde condities, uitsluitend om de
human-review evidence te herstellen. Alleen `certum.block_content`-events in de serverlog: Analysis, Blueprint en
Block Plan deden geen calls.

| ID | type | result | ms | minutes | assessmentRole | content grounded? | usable? | opvallend |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BC-001 | chat-simulatie | generated | 27147 | 15 | formative | ja | ja | Geen gespreksdoel of keywords; persona reageert op gesprekskwaliteit; doelgroep van "Scenario/context" niet aangetoond |
| BC-007 | ai-feedback | generated | 19851 | 8 | formative | ja | ja | Alleen `availableContext`; Productie expliciet uitgesloten (corrigeert de Block Plan-intentie); route-neutraal |

| Totaal (bijgewerkt) | Aantal |
| --- | --- |
| Betaalde Block Content-calls | 6 (4 baseline + 2 vervangende) |
| Vastgelegde `generated` outputs | 4 (BC-001, BC-002, BC-006, BC-007) |
| `invalid-output` / invariantfouten | 0 / 0 |
| Nieuwe feiten | 0 |
| Ongevalideerde bronclaims | 0 |
| Capability overclaims | 1 (BC-002); BC-007 corrigeert juist een overclaim uit het Block Plan |
| Capability-onzekerheid | 1 (BC-001: aan wie BC Online "Scenario/context" toont) |
| Mogelijke content creep | 1 klein (BC-002: `minimumWords: 40`) |

## Review baseline V1 (2026-10-04)

| ID | Status | Kern |
| --- | --- | --- |
| BC-001 | `PASS_WITH_NOTES` | Geloofwaardige, route-neutrale simulatie; `scenarioContext` aan één ontvanger gericht |
| BC-002 | `FAIL` | Capability overclaim (Productie "wordt gebruikt bij de feedback") en verzonnen `minimumWords: 40` |
| BC-006 | `PASS_WITH_NOTES` | Inhoudelijke reflectie; **WATCH**: vier deelvragen in één veld |
| BC-007 | `PASS` | Sterk bewijs dat alleen aantoonbare AI Feedback-context wordt gebruikt |

BC-003, BC-004 en BC-005 (deterministisch, 0 providercreaties) zijn in deze review niet apart beoordeeld en blijven
`PENDING_REVIEW`.

Gevolg: één kleine, gerichte correctie (`fix: tighten block content grounding`, prompt `training-block-content/v1.1`,
contract blijft `block-content/v1`), gevolgd door twee bevestigingsruns (BC-001, BC-002).
