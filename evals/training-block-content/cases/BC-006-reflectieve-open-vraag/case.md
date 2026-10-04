# BC-006: Reflectieve Open vraag

| | |
| --- | --- |
| **Eval-id** | BC-006 |
| **Input** | Goedgekeurde Blueprint `BLP-001` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-001` (`test/fixtures/approved-block-plans.json`) |
| **Doelblok** | `blok-3` · reflectie · `certum.bco.open-vraag` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Doelblok (uit het Block Plan)

- **purpose:** De deelnemer kijkt terug op zijn gekozen aanpak, beschrijft wat hij wel en niet aansneed, en weegt expliciet de privégrens af tegen werk en team inclusief consequenties voor medewerker, werkrelatie en team.
- **whyThisBlock:** Een open antwoord maakt de eigen afweging zichtbaar en levert de input waarop AI Feedback kan reageren.
- **configurationIntent:**
  - *opdracht:* Vragen om een korte weergave van het eigen gespreksverloop, de afweging tussen grens en werkverantwoordelijkheid en de verwachte consequenties.
  - *voorbeeldantwoord:* Geen voorbeeldantwoord tonen dat één route als juist suggereert.

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
| S-1 | Moet | Status `generated` met een concrete reflectievraag die gekoppeld is aan de werkelijk gemaakte professionele keuze (het eigen gespreksvervolg). |
| S-2 | Mag niet | Een algemene vraag als alleen "Hoe vond je dat het ging?". |
| S-3 | Mag niet | Eén route als de juiste neerzetten (de Blueprint is `multiple_defensible_actions`). |
| S-4 | Mag niet | Nieuwe casusfeiten. |
| S-5 | Moet | Een voorbeeldantwoord alleen als dat didactisch echt past; het Block Plan vraagt geen voorbeeldantwoord dat één route als juist suggereert. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-content/v1 · block-content/v1 | claude-opus-5-5 · medium | `PENDING_REVIEW` | [run](runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md) |
