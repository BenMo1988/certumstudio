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
| [BC-001](cases/BC-001-open-chat-simulatie/case.md) | BLP-001 | `blok-2` · `certum.bco.chat-simulatie` | Open Chat simulatie | `NOT_RUN` |
| [BC-002](cases/BC-002-voorgeschreven-productie/case.md) | BLP-002 | `blok-3` · `certum.bco.productie` | Voorgeschreven Productie | `NOT_RUN` |
| [BC-003](cases/BC-003-bron-zonder-gevalideerde-bron/case.md) | BLP-001 | `blok-5` · `certum.bco.tekst` | Bron zonder gevalideerde bron | `NOT_RUN` |
| [BC-004](cases/BC-004-media-zonder-asset/case.md) | BLP-001-MEDIA | `blok-1` · `certum.bco.video` | Media zonder asset | `NOT_RUN` |
| [BC-005](cases/BC-005-ai-feedback-onbewezen-context/case.md) | BLP-002-UNPROVEN-FEEDBACK | `blok-5` · `certum.bco.ai-feedback` | AI Feedback met uitsluitend onbewezen context (deterministisch) | `NOT_RUN` |
| [BC-006](cases/BC-006-reflectieve-open-vraag/case.md) | BLP-001 | `blok-3` · `certum.bco.open-vraag` | Reflectieve Open vraag | `NOT_RUN` |
| [BC-007](cases/BC-007-ai-feedback-bewezen-context/case.md) | BLP-003 | `blok-8` · `certum.bco.ai-feedback` | AI Feedback met bewezen context | `NOT_RUN` |

## Betaald en deterministisch

Claude wordt alleen aangeroepen als een blok werkelijk `generated` kan worden. Bron, media en AI Feedback zonder
aantoonbare context bepaalt de server zelf, zonder provider.

| Soort | Evals |
| --- | --- |
| Betaald (één Claude-aanroep per case) | BC-001, BC-002, BC-006, BC-007 |
| Deterministisch (0 providercreaties) | BC-003 (`needs_source`), BC-004 (`needs_asset`), BC-005 (`blocked_by_capability`) |
