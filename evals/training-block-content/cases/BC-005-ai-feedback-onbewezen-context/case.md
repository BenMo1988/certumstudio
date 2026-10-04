# BC-005: AI Feedback met onbewezen inputdependency

| | |
| --- | --- |
| **Eval-id** | BC-005 |
| **Input** | Goedgekeurde Blueprint `BLP-002` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-002-UNPROVEN-FEEDBACK` (`test/fixtures/approved-block-plans.json`) (synthetisch) |
| **Doelblok** | `blok-5` · feedback · `certum.bco.ai-feedback` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

> **Input gewijzigd vóór de eerste run (2026-10-04).** Eerst `BLP-003` `blok-8`. Dat blok heeft aantoonbare context
> (Poll blok-3, Open vraag blok-4 en blok-7) naast een niet-aantoonbare Productie (blok-6); structureel is het dus een
> genereerbaar blok met uitgesloten context, niet een blok met uitsluitend onbewezen context. Die situatie is
> verplaatst naar **BC-007**, inclusief de verwachting dat de Productie niet als context wordt gebruikt. BC-005 test nu
> een AI Feedback-blok waarvoor álle eerdere invoer (Chat simulatie, Productie, Productie) niet aantoonbaar als context
> beschikbaar is: een deterministisch resultaat zonder provider.

## Doelblok (uit het Block Plan)

- **purpose:** Feedback geven op uitvoering van de handelingslijn, de verantwoording tegenover de collega en de omgang met diens zorg.
- **whyThisBlock:** AI Feedback kan de antwoorden uit de reflectievraag en de melding als context gebruiken en per dimensie terugkoppelen.
- **configurationIntent:**
  - *context eerdere antwoorden:* De open reflectievraag en de productie van de melding als input meegeven.
  - *beoordelingsdimensies:* Feedback structureren langs de drie dimensies uit de Blueprint, op basis van voorgeschreven handeling, onderbouwing en uitvoering, met uitstel van vrijmaken als duidelijk aandachtspunt.

## Verwachtingen

Vastgelegd vóór de eerste run met een AI-provider. Algemeen (G) en casusspecifiek (S).

| # | Soort | Verwachting |
| --- | --- | --- |
| G-1 | Moet | Precies één doelblok per request; het resultaat hoort bij dat `plannedBlockId` (trusted: id, sequence, Certum-fase, bloktype). |
| G-2 | Mag niet | De Blueprint of het Block Plan veranderen: leerdoel, dilemma, ambiguïteit, succescriteria, fase, bloktype, volgorde, purpose of capability gaps. |
| G-3 | Moet | Inhoud in de velden die het bloktype in BC Online werkelijk heeft (`bc-online-block-catalog/v1`). |
| G-4 | Mag niet | Een fictieve URL, een fictief bestand of asset, of een verzonnen bron. |
| G-5 | Moet | Register-onafhankelijke metadata: fase en werkvorm (trusted), bijdrage aan het leerdoel, toetsfunctie, geschatte minuten en alleen bestaande sourceNeed-ids. |
| G-6 | Moet | Een blok dat niet te maken is, krijgt een expliciete status (`needs_source`, `needs_asset`, `blocked_by_capability`) en wordt nooit stil met verzonnen inhoud gevuld. |
| S-1 | Moet | Status `blocked_by_capability`, server-side bepaald: 0 providercreaties en 0 AI-aanroepen, met de concrete trusted afhankelijkheid (`ai_context_buiten_vraagblokken`) en de niet-aantoonbare blokken. |
| S-2 | Mag niet | Doen alsof de Productie-uitwerking of het chatverloop automatisch als context beschikbaar is. |
| S-3 | Moet | De niet-aantoonbare context expliciet maken, zodat het als unresolved requirement zichtbaar wordt. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-content/v1 · block-content/v1 | server-side (geen provider) | `PASS` | [run](runs/2026-10-04_deterministisch.md) |
