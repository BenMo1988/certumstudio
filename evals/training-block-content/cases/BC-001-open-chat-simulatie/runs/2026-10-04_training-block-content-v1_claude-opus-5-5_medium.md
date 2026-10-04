# BC-001 · 2026-10-04 · training-block-content/v1 · claude-opus-5-5 · medium

Eén betaalde aanroep via de Server Action `regenerateBlockContent` op de dev-server (alle andere providers op mock,
`CERTUM_BLOCK_CONTENT_PROVIDER=claude`), met de goedgekeurde Blueprint en het goedgekeurde Block Plan `BLP-001`
uit de fixtures en doelblok `blok-2`. Precies één poging (`maxRetries: 0`), geen retry.

**Status: `INCONCLUSIVE`**

## Metadata (uit `certum.block_content_generation`)

| Veld | Waarde |
| --- | --- |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-block-content/v1 |
| contentContractVersion | block-content/v1 |
| plannedBlockId | blok-2 |
| catalogBlockId | certum.bco.chat-simulatie |
| certumPhase | actie |
| durationMs | 25787 |
| outcome | success |
| resultStatus | generated |
| estimatedMinutes | 15 |

## Output niet vastgelegd (harnessfout)

De generatie is geslaagd (`outcome: success`, `resultStatus: generated`, door alle server-side invarianten), maar
de volledige output is **niet vastgelegd**. Het runscript las alleen JSON-regels uit de RSC-respons; lange teksten
komen als aparte tekstchunks (`T…`) en werden niet bewaard. De server logt bewust geen inhoud, dus de output is niet
te herstellen. Dit is geen modelbevinding.

Het runscript is gecorrigeerd: de ruwe respons wordt nu altijd eerst bewaard en tekstchunks worden opgelost
(gecontroleerd op een synthetische stroom en tegen de mock). Conform de regels is er geen handmatige retry gedaan; een
herhaling vraagt expliciete toestemming (één extra betaalde aanroep).

## Menselijke evaluatie

**Status: `INCONCLUSIVE`** (output niet vastgelegd; inhoud niet te beoordelen).
