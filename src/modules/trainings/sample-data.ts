import type { Training } from "./types";

/**
 * Fictieve voorbeeldtrainingen om de interface te testen. Tijdelijk: wordt
 * vervangen door echte opslag. Alleen gebruiken via de functies in
 * `queries.ts`, nooit rechtstreeks in de UI.
 */
export const SAMPLE_TRAININGS: Training[] = [
  {
    id: "professioneel-begrenzen",
    title: "Professioneel begrenzen",
    status: "concept",
    createdAt: "2026-09-29T09:00:00.000Z",
    updatedAt: "2026-10-01T14:20:00.000Z",
    targetAudience: "Ambulant begeleiders",
    sections: {
      context: {
        blocks: [
          {
            type: "paragraph",
            text: "Een cliënt stuurt je regelmatig 's avonds en in het weekend berichten op je werktelefoon. Als je niet direct antwoordt, reageert hij teleurgesteld en zegt hij dat je hem in de steek laat.",
          },
        ],
      },
    },
  },
  {
    id: "veiligheid-bij-ouderconflict",
    title: "Veiligheid bij ouderconflict",
    status: "review",
    createdAt: "2026-09-18T08:30:00.000Z",
    updatedAt: "2026-09-27T10:05:00.000Z",
    targetAudience: "Jeugd- en gezinsprofessionals in lokale teams",
    learningGoal:
      "De deelnemer kan in een gesprek met een ouder in een scheidingsconflict de veiligheid van het kind centraal stellen, onpartijdig blijven en een zorgvuldige vervolgstap bepalen volgens de meldcode.",
    sections: {
      context: {
        blocks: [
          {
            type: "paragraph",
            text: "Je werkt als jeugd- en gezinsprofessional in een lokaal team. De ouders van een jongen van acht jaar zijn een half jaar uit elkaar en hebben een aanhoudend conflict over de omgangsregeling.",
          },
          {
            type: "paragraph",
            text: "In een gesprek vertelt de moeder dat de vader bij overdrachten regelmatig schreeuwt en dat haar zoon de laatste weken niet meer naar zijn vader wil. Ze vraagt je om aan haar kant te staan en te bevestigen dat de omgang moet stoppen. De vader heeft eerder tegen een collega gezegd dat de moeder hun zoon tegen hem opzet.",
          },
        ],
      },
      actie: {
        blocks: [
          { type: "paragraph", text: "Wat doe je als eerste in dit gesprek?" },
          {
            type: "list",
            items: [
              "Je bevestigt dat de omgang beter even kan stoppen, zodat de moeder zich gesteund voelt.",
              "Je erkent de zorgen van de moeder, vraagt door naar concrete situaties en naar wat haar zoon zelf zegt, en legt uit dat je ook met de vader in gesprek gaat.",
              "Je geeft aan dat je je niet mengt in conflicten tussen ouders en verwijst naar een mediator.",
              "Je neemt direct contact op met Veilig Thuis.",
            ],
          },
        ],
      },
      reflectie: {
        blocks: [
          {
            type: "list",
            items: [
              "Wat maakte het lastig om in dit gesprek onpartijdig te blijven?",
              "Welke informatie heb je nodig om de veiligheid van het kind in te schatten?",
              "Hoe zorg je dat het perspectief van het kind zelf in beeld komt?",
            ],
          },
        ],
      },
      feedback: {
        blocks: [
          {
            type: "paragraph",
            text: "De tweede optie past het best. Je neemt de zorgen van de moeder serieus zonder partij te kiezen, en je verzamelt feiten in plaats van interpretaties.",
          },
          {
            type: "paragraph",
            text: "Partij kiezen vergroot het conflict en sluit de vader buiten. Terughoudendheid laat mogelijke signalen van onveiligheid liggen. Direct Veilig Thuis inschakelen is nodig bij acuut gevaar, maar daar is op basis van deze informatie nog geen sprake van: de meldcode vraagt eerst om signalen in kaart te brengen en zo nodig te overleggen.",
          },
        ],
      },
      bron: {
        blocks: [
          {
            type: "list",
            items: [
              "Meldcode huiselijk geweld en kindermishandeling: stap 1 (signalen in kaart brengen) en stap 2 (collegiale consultatie en zo nodig advies vragen aan Veilig Thuis).",
              "Jeugdwet: het belang van het kind staat centraal bij hulp aan het gezin.",
            ],
          },
        ],
      },
      toets: {
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Noem twee signalen in deze casus die aanleiding geven om de veiligheid van het kind nader te onderzoeken.",
              "Welke stap van de meldcode zet je als eerste, en waarom?",
              "Hoe leg je aan de moeder uit dat je ook met de vader in gesprek gaat, zonder haar zorgen te bagatelliseren?",
            ],
          },
        ],
      },
    },
  },
  {
    id: "omgaan-met-weerstand",
    title: "Omgaan met weerstand",
    status: "gereed",
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-15T16:40:00.000Z",
    targetAudience: "Professionals in het sociaal domein",
    learningGoal:
      "De deelnemer kan weerstand in een gesprek herkennen als signaal en het gesprek gericht voortzetten.",
    sections: {
      context: {
        blocks: [
          {
            type: "paragraph",
            text: "Je hebt een vervolggesprek met een inwoner die hulp krijgt bij schulden. Bij binnenkomst zegt hij: “Dit heeft toch geen zin, jullie doen toch wat je zelf wilt.”",
          },
        ],
      },
      actie: {
        blocks: [
          {
            type: "list",
            items: [
              "Je legt nogmaals uit waarom de gemaakte afspraken belangrijk zijn.",
              "Je benoemt wat je hoort en vraagt wat er sinds het vorige gesprek is gebeurd.",
              "Je stelt voor het gesprek te verzetten naar een beter moment.",
            ],
          },
        ],
      },
      reflectie: {
        blocks: [
          {
            type: "paragraph",
            text: "Wat gebeurt er bij jou als iemand een gesprek begint met weerstand?",
          },
        ],
      },
      feedback: {
        blocks: [
          {
            type: "paragraph",
            text: "Weerstand zegt vaak iets over de situatie of de relatie, niet over de persoon. Door te benoemen wat je hoort en open door te vragen, maak je ruimte voor wat erachter zit. Opnieuw uitleggen versterkt de weerstand meestal.",
          },
        ],
      },
      bron: {
        blocks: [
          {
            type: "list",
            items: ["Motiverende gespreksvoering (Miller & Rollnick): meebewegen met weerstand."],
          },
        ],
      },
      toets: {
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Waarom werkt opnieuw uitleggen vaak averechts bij weerstand?",
              "Formuleer een reflectie op de uitspraak van de inwoner.",
            ],
          },
        ],
      },
    },
  },
];
