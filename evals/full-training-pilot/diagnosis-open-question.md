# Diagnose: `open_question_structured_output_failure` (TR-0014)

Step 15A, onderdeel F. Alleen diagnose, **geen wijziging**. 0 Claude-calls.

## Waarneming

In TR-0014 faalden 2 van de 5 eerste pogingen voor `certum.bco.open-vraag` (blok-4 en blok-8) met
`invalid-output` in de fase `structured_output` (`stop_reason: end_turn`, 979 en 898 outputtokens). Alle andere
bloktypes slaagden de eerste keer. De tweede poging slaagde telkens.

## Wat `structured_output` hier betekent

- `ClaudeBlockContentService.call` gebruikt `client.messages.parse()` met `zodOutputFormat(schema)`.
- De SDK zet het Zod-schema om naar een JSON-schema voor de API. **`minLength`, `maxLength`, `enum`, `const`,
  `minimum` en `maximum` gaan alleen als tekst in `description` mee** (vastgesteld door het schema dat daadwerkelijk
  wordt verstuurd te genereren; zie hieronder). De API dwingt die grenzen dus niet af.
- Na ontvangst doet de SDK `zodObject.safeParse(parsed)`. Faalt dat, dan gooit de SDK een `AnthropicError`, die in
  Certum wordt gemapt naar `invalid-output` → `BlockContentValidationError("structured_output", [])`. Daarom staan er
  geen `violationCodes` bij: de Zod-issues van de SDK worden (bewust, privacy) niet doorgegeven.

Voorbeeld uit het verstuurde schema voor een Open vraag:

```json
"question": { "type": "string", "description": "De vraag.\n\n{minLength: 1, maxLength: 600}" },
"exampleAnswer": { "anyOf": [{ "$ref": "…{minLength: 1, maxLength: 1500}" }, { "type": "null" }] },
"feedback": { "anyOf": [{ "type": "string", "description": "{minLength: 1, maxLength: 1500}" }, { "type": "null" }] }
```

## Concrete technische kandidaat-oorzaak

**De maximale lengte van `question` (600 tekens) wordt alleen client-side gecontroleerd, terwijl Claude's vragen er
structureel dicht tegenaan zitten.**

| Bron | `question` (tekens) | van 600 |
| --- | --- | --- |
| TR-0014 blok-2 | 500 | 83 % |
| TR-0014 blok-3 | 443 | 74 % |
| TR-0014 blok-4 (2e poging) | 482 | 80 % |
| TR-0014 blok-8 (2e poging) | 505 | 84 % |
| BC-006 (baseline) | 489 | 82 % |

Alle zes geslaagde open-vraag-outputs zitten op 74–84 % van de grens. Een iets langere vraag (bijvoorbeeld met de
gestapelde deelvragen die de pilot ook liet zien, `reflection_question_density`) overschrijdt 600 tekens en faalt
dan pas ná ontvangst. Dat past bij beide waarnemingen: een normaal outputvolume, `end_turn`, en de fase
`structured_output`.

Ter vergelijking: andere velden met ruime marge faalden niet (Tekst `text` 38–44 % van 4000). AI Feedback
`instructions` zat in TR-0014 op **83 % en 98 %** van 3000; dat is hetzelfde risico, maar het is daar (nog) niet
misgegaan.

Tweede, minder waarschijnlijke kandidaat: `exampleAnswer` en `feedback` zijn `nullable` met `min(1)`. Een lege
string `""` in plaats van `null` faalt ook alleen client-side. In alle geslaagde outputs was `exampleAnswer` `null`;
er is geen bewijs dat dit is opgetreden.

## Wat niet is vastgesteld

De inhoud van de twee mislukte outputs is niet bewaard of gelogd (privacy-ontwerp). De oorzaak is daarom
**aannemelijk, niet bewezen**.

## Voorstel (niet uitgevoerd)

Pas na een besluit en met een gerichte reliability-eval:

1. **Diagnose verbeteren zonder inhoud:** bij `structured_output` alleen `<zod-code>@<veldpad>` loggen (zoals bij
   `schema_validation`). Dat bewijst of het `too_big@result.content.question` is.
2. Daarna pas kiezen tussen: de grens verruimen (bijv. 1000 tekens; een open vraag in BC Online heeft geen
   aangetoonde limiet van 600), de lengte expliciet in de prompt noemen, of beide.
