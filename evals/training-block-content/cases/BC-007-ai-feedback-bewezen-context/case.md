# BC-007: AI Feedback met bewezen context

| | |
| --- | --- |
| **Eval-id** | BC-007 |
| **Input** | Goedgekeurde Blueprint `BLP-003` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-003` (`test/fixtures/approved-block-plans.json`) |
| **Doelblok** | `blok-8` · feedback · `certum.bco.ai-feedback` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

## Doelblok (uit het Block Plan)

- **purpose:** Feedback geven op de gekozen volgorde, de uitwerking en de kwaliteit van de onderbouwing, langs de dimensies uit de Blueprint.
- **whyThisBlock:** AI Feedback ontvangt de eerdere antwoorden als context en kan inhoudelijk op afweging en onderbouwing reageren.
- **configurationIntent:**
  - *beoordelingsbasis:* Beoordelen op afweging, aansluiting op de situatie, onderbouwing en consequenties.
  - *verdedigbaarheid:* Beide volgordes als verdedigbaar behandelen. Niet de gekozen route beoordelen, maar of beide routes zijn gewogen en of de risico's van de eigen route zijn benoemd en beperkt.
  - *context:* De antwoorden uit poll, onderbouwing, productie en reflectie gebruiken.

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
| S-1 | Moet | Status `generated` met een daadwerkelijke, operationeel bruikbare feedbackinstructie. |
| S-2 | Moet | Alleen vertrouwen op `availableContext` (Poll blok-3, Open vraag blok-4 en blok-7). |
| S-3 | Mag niet | De Productie-uitwerking (blok-6) als context gebruiken, ook al noemt het Block Plan die; die is niet aantoonbaar beschikbaar (`unavailableContext`). |
| S-4 | Mag niet | Bij `open_choice` de gekozen route als goed of fout beoordelen. |
| S-5 | Moet | Feedback op afweging, onderbouwing en relevante uitvoering, langs de dimensies uit de Blueprint. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-content/v1 · block-content/v1 | claude-opus-5-5 · medium | `INCONCLUSIVE` | [run](runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md) |
| 2026-10-04 | training-block-content/v1 · block-content/v1 (vervanging: evidence herstellen) | claude-opus-5-5 · medium | `PASS` | [run](runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium_vervanging.md) |
