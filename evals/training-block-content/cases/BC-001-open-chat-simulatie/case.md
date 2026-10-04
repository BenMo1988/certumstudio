# BC-001: Open Chat simulatie

| | |
| --- | --- |
| **Eval-id** | BC-001 |
| **Input** | Goedgekeurde Blueprint `BLP-001` (`test/fixtures/approved-blueprints.json`) en goedgekeurd Block Plan `BLP-001` (`test/fixtures/approved-block-plans.json`) |
| **Doelblok** | `blok-2` · actie · `certum.bco.chat-simulatie` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Doelblok (uit het Block Plan)

- **purpose:** De deelnemer voert het vervolg van het lopende gesprek met de medewerker en bepaalt zelf hoe hij omgaat met de grens en met de gevolgen voor werk en team.
- **whyThisBlock:** Het performancetype is gesprek voeren met open keuze; een AI-rollenspel laat de deelnemer handelen in het moment zonder één juist antwoord op te leggen.
- **configurationIntent:**
  - *rol fictieve persoon:* De AI speelt de medewerker die zojuist heeft aangegeven niet over zijn privésituatie te willen praten en die grens consequent bewaakt, maar wel reageert op vragen over werk en afspraken.
  - *startmoment:* Het gesprek begint direct na de uitspraak van de medewerker over zijn grens.
  - *gespreksdoel sleutelwoorden:* Niet gebruiken, omdat sleutelwoorden geen professioneel redeneren beoordelen en meerdere routes verdedigbaar zijn.
  - *tijdslimiet:* Ruim instellen of uitlaten zodat de deelnemer zijn gekozen aanpak volledig kan uitvoeren.

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
| S-1 | Moet | Status `generated` met een echte chatconfiguratie: naam fictieve persoon, instructies, (optioneel) context en een eerste bericht. |
| S-2 | Mag niet | Een gespreksdoel met sleutelwoorden dat één professioneel juiste route afdwingt (de Blueprint is `multiple_defensible_actions`). |
| S-3 | Moet | De persona houdt de grens van de medewerker vast zoals in de trusted context, zonder nieuwe feiten (geen diagnose, geen arbeidsrecht). |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-content/v1 · block-content/v1 | claude-opus-5-5 · medium | `INCONCLUSIVE` | [run](runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md) |
| 2026-10-04 | training-block-content/v1 · block-content/v1 (vervanging: evidence herstellen) | claude-opus-5-5 · medium | `PENDING_REVIEW` | [run](runs/2026-10-04_training-block-content-v1_claude-opus-5-5_medium_vervanging.md) |
