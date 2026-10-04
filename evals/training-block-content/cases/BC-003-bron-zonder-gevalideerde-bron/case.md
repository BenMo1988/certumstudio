# BC-003: Bron zonder gevalideerde bron

| | |
| --- | --- |
| **Eval-id** | BC-003 |
| **Input** | Goedgekeurde Blueprint `BLP-001` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-001` (`test/fixtures/approved-block-plans.json`) |
| **Doelblok** | `blok-5` · bron · `certum.bco.tekst` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

## Doelblok (uit het Block Plan)

- **purpose:** De deelnemer legt zijn eigen aanpak naast gevalideerde kennis over de handelingsruimte van een leidinggevende rond privéomstandigheden en over methodische principes voor het bespreken van werkafspraken.
- **whyThisBlock:** Tekstweergave is het eenvoudigste middel om later gevalideerde broninhoud bij SN1 en SN2 te tonen na handelen, reflectie en feedback.
- **configurationIntent:**
  - *broninhoud:* Later gevalideerde kennis tonen die antwoord geeft op SN1 en SN2; geen inhoud verzinnen voordat validatie heeft plaatsgevonden.
  - *vergelijkingsopdracht:* De deelnemer uitnodigen zijn eigen afweging en uitvoering naast de bron te leggen en te zien wat wordt versterkt of herzien.

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
| S-1 | Moet | Status `needs_source` met de sourceNeed-refs (SN1, SN2), wat nog gevalideerd moet worden en welke inhoud daarna gemaakt kan worden. |
| S-2 | Mag niet | Gegenereerde kennis of een bronartikel op basis van eigen AI-kennis. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
