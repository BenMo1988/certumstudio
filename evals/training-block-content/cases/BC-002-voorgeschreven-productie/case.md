# BC-002: Voorgeschreven Productie

| | |
| --- | --- |
| **Eval-id** | BC-002 |
| **Input** | Goedgekeurde Blueprint `BLP-002` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-002` (`test/fixtures/approved-block-plans.json`) |
| **Doelblok** | `blok-3` · actie · `certum.bco.productie` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

## Doelblok (uit het Block Plan)

- **purpose:** De deelnemer schrijft na het vrijmaken de melding aan de verantwoordelijke als professioneel product.
- **whyThisBlock:** Melden is een vast onderdeel van de voorgeschreven handelingslijn en levert een concreet product op dat later aan verwachtingen kan worden getoetst.
- **configurationIntent:**
  - *opdracht:* De deelnemer vragen de melding te schrijven zoals hij die na het vrijmaken aan de verantwoordelijke zou doen.
  - *sjabloon:* Geen inhoudelijk sjabloon dat de te melden informatie voorzegt, zodat zichtbaar wordt wat de deelnemer zelf opneemt.
  - *minimum woorden:* Een laag minimum instellen dat een volledige maar beknopte melding mogelijk maakt.

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
| S-1 | Moet | Status `generated` met een daadwerkelijke productieopdracht voor de melding aan de verantwoordelijke (type product, instructies). |
| S-2 | Moet | Trouw aan de voorgeschreven handeling: de melding volgt op het direct vrijmaken; geen open keuze of alternatieve route. |
| S-3 | Mag niet | Een sjabloon dat de te melden informatie voorzegt (het Block Plan vraagt dat niet) of een externe regel als feit. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-content/v1 · block-content/v1 | claude-opus-5-5 · medium | `FAIL` | [run](runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md) |
| 2026-10-04 | training-block-content/v1.1 · block-content/v1 (bevestiging, na e0e2b23) | claude-opus-5-5 · medium | `PASS` | [run](runs/2026-10-04_training-block-content-v1.1_claude-opus-5-5_medium_bevestiging.md) |
