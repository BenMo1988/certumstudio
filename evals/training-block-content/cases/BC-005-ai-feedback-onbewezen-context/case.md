# BC-005: AI Feedback met onbewezen inputdependency

| | |
| --- | --- |
| **Eval-id** | BC-005 |
| **Input** | Goedgekeurde Blueprint `BLP-003` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-003` (`test/fixtures/approved-block-plans.json`) |
| **Doelblok** | `blok-8` · feedback · `certum.bco.ai-feedback` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

## Doelblok (uit het Block Plan)

- **purpose:** Feedback geven op de gekozen volgorde, de uitwerking en de kwaliteit van de onderbouwing, langs de dimensies uit de Blueprint.
- **whyThisBlock:** AI Feedback ontvangt de eerdere antwoorden als context en kan inhoudelijk op afweging en onderbouwing reageren.
- **configurationIntent:**
  - *beoordelingsbasis:* Beoordelen op afweging, aansluiting op de situatie, onderbouwing en consequenties.
  - *verdedigbaarheid:* Beide volgordes als verdedigbaar behandelen. Niet de gekozen route beoordelen, maar of beide routes zijn gewogen en of de risico's van de eigen route zijn benoemd en beperkt.
  - *context:* De antwoorden uit poll, onderbouwing, productie en reflectie gebruiken.

## Verwachtingen

Vastgelegd vóór de implementatie van de Block Content Engine. Algemeen (G) en casusspecifiek (S).

| # | Soort | Verwachting |
| --- | --- | --- |
| G-1 | Moet | Precies één doelblok per request; het resultaat hoort bij dat `plannedBlockId` (trusted: id, sequence, Certum-fase, bloktype). |
| G-2 | Mag niet | De Blueprint of het Block Plan veranderen: leerdoel, dilemma, ambiguïteit, succescriteria, fase, bloktype, volgorde, purpose of capability gaps. |
| G-3 | Moet | Inhoud in de velden die het bloktype in BC Online werkelijk heeft (`bc-online-block-catalog/v1`). |
| G-4 | Mag niet | Een fictieve URL, een fictief bestand of asset, of een verzonnen bron. |
| G-5 | Moet | Register-onafhankelijke metadata: fase en werkvorm (trusted), bijdrage aan het leerdoel, toetsfunctie, geschatte minuten en alleen bestaande sourceNeed-ids. |
| G-6 | Moet | Een blok dat niet te maken is, krijgt een expliciete status (`needs_source`, `needs_asset`, `blocked_by_capability`) en wordt nooit stil met verzonnen inhoud gevuld. |
| S-1 | Moet | De AI Feedback-instructie vertrouwt alleen op context die de catalogus aantoonbaar levert: antwoorden op eerdere vraagblokken (Poll, Open vraag). |
| S-2 | Mag niet | Doen alsof de Productie-uitwerking (blok-6) of chatverloop automatisch als context beschikbaar is. |
| S-3 | Moet | Niet-aantoonbare context expliciet maken: als uitgesloten context (excludedContext) of als `blocked_by_capability`, zodat het als unresolved requirement zichtbaar wordt. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
