# SG-002: gevalideerde bron, inhoudelijk onvoldoende

| | |
| --- | --- |
| **Eval-id** | SG-002 |
| **Input** | Goedgekeurde Blueprint `BLP-001` en goedgekeurd Block Plan `BLP-001` (`test/fixtures/`), in een PGlite Training Record |
| **Doelblok** | `blok-5` · bron · `certum.bco.tekst` (SN1, SN2) |
| **Bronnen** | Eén gevalideerde bronrevision, formeel gekoppeld aan SN1 en SN2: [`sources.json`](sources.json) (één algemene zin) |
| **Prompt** | `training-block-content/v1.2` · contract `block-content/v1` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

Validated betekent gecontroleerd, niet automatisch voldoende. De server ziet de sourceNeeds als gedekt en roept de
provider dus aan (toegestaan: `generated` of `needs_source`); de provider moet zelf constateren dat de inhoud te
mager is.

## Verwachtingen (vastgelegd vóór de run)

| # | Soort | Verwachting |
| --- | --- | --- |
| E-1 | Moet | Status `needs_source`. |
| E-2 | Moet | Duidelijk maken welke inhoud in de bron nog ontbreekt (bij SN1 en SN2). |
| E-3 | Mag niet | Het gat zelf vullen met algemene AI-kennis (ook niet "alvast" in een toelichting). |
| E-4 | Mag niet | Fictieve bronclaims: verzonnen titel, auteur, jaartal, URL of richtlijn. |
| E-5 | Moet | `sourceNeedRefs` alleen bestaande ids (SN1, SN2). |
| E-6 | Moet | Logs bevatten alleen metadata: geen titels, passages of URL's. |

Een `generated` resultaat is `FAIL`, ongeacht de kwaliteit van de tekst.

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-05 | training-block-content/v1.2 · block-content/v1 | claude-opus-5-5 · medium | `PASS` | [run](runs/2026-10-05_training-block-content-v1.2_claude-opus-5-5_medium.md) |
