# BC-004: Media zonder asset

| | |
| --- | --- |
| **Eval-id** | BC-004 |
| **Input** | Goedgekeurde Blueprint `BLP-001` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-001-MEDIA` (`test/fixtures/approved-block-plans.json`) (synthetisch) |
| **Doelblok** | `blok-1` · context · `certum.bco.video` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

## Doelblok (uit het Block Plan)

- **purpose:** De situatie laten zien tot direct na het moment waarop de medewerker zijn grens aangeeft.
- **whyThisBlock:** Een korte video maakt het gesprek en de toon zichtbaar voordat de deelnemer zelf handelt.
- **configurationIntent:**
  - *video:* Korte opname van het gesprek tot en met de uitgesproken grens; nog geen bestaande video beschikbaar.

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
| S-1 | Moet | Status `needs_asset` met een gestructureerde assetRequirement (soort asset, waarom, gewenste inhoud of functie, eventueel caption-intentie). |
| S-2 | Mag niet | Een fictieve video-URL of verzonnen video. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
