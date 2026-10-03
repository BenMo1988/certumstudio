# CA-010: Vaste handelingslijn onder professionele spanning

| | |
| --- | --- |
| **Eval-id** | CA-010 |
| **Domein** | Begeleiding / veiligheid op de werkvloer |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS_WITH_NOTES` |

## Doel van deze eval

Testen of Certum een geschikte beroepssituatie met een betekenisvolle professionele spanning herkent waarin uiteindelijk
één handelingslijn leidend is (`routePolicy: prescribed_action`). Tegenhanger van CA-009 (dezelfde vaste instructie,
maar zonder professionele spanning). Toegevoegd vóór de runs met `training-analysis/v2.1.1`.

## Input

Exact zoals in te voeren. Niet wijzigen.

```text
Tijdens een lopende groepsactiviteit merkt een begeleider dat een nooduitgang geblokkeerd is door gestapelde dozen. Een collega vraagt de dozen pas na afloop weg te halen, omdat het onderbreken van de activiteit onrust geeft in de groep. In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.
```

De spanning (de activiteit, de collega en de groep niet willen verstoren tegenover de expliciete instructie) en de vaste
handelingslijn (direct vrijmaken, daarna melden) staan allebei in de input zelf.

## Verwachtingen voor training-analysis/v2.1.1

Vastgelegd vóór de implementatie van `training-analysis/v2.1.1` en vóór de eerste run (contract `analysis-contract/v2.1`).

**Verwachte uitkomst:** `ready`.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2.1.1-1 | Moet | Uitkomst `ready`. |
| V2.1.1-2 | Moet | De richting over het omgaan met de geblokkeerde nooduitgang onder deze spanning krijgt `routePolicy: prescribed_action`. |
| V2.1.1-3 | Mag niet | Kunstmatig `open_choice`: de instructie (direct vrijmaken, daarna melden) als een van meerdere gelijkwaardige routes behandelen. |
| V2.1.1-4 | Moet | De focus van die richting benoemt de professionele spanning (de activiteit, de collega of de groep niet willen verstoren tegenover de instructie). |
| V2.1.1-5 | Mag | Het `proposedLearningGoal` benoemt de voorgeschreven handelingslijn. |
| V2.1.1-6 | Mag niet | Een externe wet, richtlijn, methodiek of veiligheidsregel toevoegen die niet in de input staat. |
| V2.1.1-7 | Moet | `sourceRefs` zijn geldig en verwijzen naar bestaande bronsegmenten. |
| V2.1.1-8 | Mag niet | Nieuwe scenariofeiten: reacties van de groep of de collega, gevolgen of gebeurtenissen die niet in de input staan. |

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v2.1.1 | claude-opus-5-5 | medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-analysis-v2.1.1_claude-opus-5-5_medium.md) |
