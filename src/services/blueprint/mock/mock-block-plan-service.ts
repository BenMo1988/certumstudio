import { BC_ONLINE_BLOCK_PLAN_VERSION, type BcOnlineBlockPlan, type PlannedBlock } from "@/modules/block-plan/schema";
import type { TrainingBlueprint } from "@/modules/training-blueprint/schema";
import type { BlockPlanService } from "../services";

type Draft = Omit<PlannedBlock, "id" | "sequence">;

/**
 * Mock Block Plan Generation. Volgorde: didactische behoefte uit de Blueprint → eenvoudigste passende bestaand blok.
 *
 * - Context: Tekst (situatieschets).
 * - Actie: gesprek → Chat simulatie (zonder sleutelwoorden of tijdslimiet); keuze bij meerdere verdedigbare routes →
 *   Poll (geen juist antwoord) + Open vraag (onderbouwing); keuze met één beste actie → Open vraag.
 * - Reflectie: Open vraag. Feedback: AI Feedback. Bron: Tekst, pas te vullen na bronvalidatie.
 * - Toets: nieuwe situatie (Tekst) + hetzelfde type handelen (Chat simulatie of Open vraag) + AI Feedback.
 *   Geen formeel Toetsblok: de Blueprint vraagt transfer, geen kennistoets.
 * - Route-afhankelijke vervolgstappen bij meerdere routes worden een capabilityGap (geen branching in BC Online).
 */
export class MockBlockPlanService implements BlockPlanService {
  async generate(blueprint: TrainingBlueprint): Promise<BcOnlineBlockPlan> {
    const conversation = blueprint.learningArc.actie.performanceType === "gesprek_voeren";
    const multiple = blueprint.ambiguity === "multiple_defensible_actions";
    const drafts: Draft[] = [];
    const add = (d: Draft) => drafts.push(d);

    add({
      certumPhase: "context",
      catalogBlockId: "certum.bco.tekst",
      purpose: "De situatie schetsen tot en met het keuzemoment.",
      whyThisBlock: "Een tekst is het eenvoudigste middel om de situatie neer te zetten; er is geen interactie nodig.",
      configurationIntent: [
        { setting: "tekst", intent: "Situatieschets op basis van de scenariopremisse, zonder het verloop na de keuze." },
      ],
    });

    if (conversation) {
      add({
        certumPhase: "actie",
        catalogBlockId: "certum.bco.chat-simulatie",
        purpose: "Het keuzemoment in het gesprek zelf laten handelen.",
        whyThisBlock: "Het gevraagde handelen is een gesprek in het moment; een rollenspel-chat oefent dat direct.",
        configurationIntent: [
          { setting: "rol fictieve persoon", intent: "De betrokkene uit de situatie op het keuzemoment." },
          { setting: "gedragsintentie", intent: "Reageert realistisch op de situatie zoals beschreven, zonder nieuwe gebeurtenissen." },
          { setting: "scenario-intentie", intent: "Start op het keuzemoment uit de Blueprint." },
          { setting: "gespreksdoel", intent: "Geen sleutelwoorddoel: professioneel redeneren wordt via AI Feedback beoordeeld." },
          { setting: "tijdslimiet", intent: "Geen tijdslimiet." },
        ],
      });
    } else if (multiple) {
      add({
        certumPhase: "actie",
        catalogBlockId: "certum.bco.poll",
        purpose: "De deelnemer een route laten kiezen.",
        whyThisBlock: "Meerdere routes zijn verdedigbaar; een Poll laat kiezen zonder een juist antwoord te veronderstellen.",
        configurationIntent: [{ setting: "opties", intent: "De verdedigbare routes uit het keuzemoment, neutraal geformuleerd." }],
      });
      add({
        certumPhase: "actie",
        catalogBlockId: "certum.bco.open-vraag",
        purpose: "De gekozen route laten onderbouwen.",
        whyThisBlock: "De onderbouwing is het professionele handelen dat beoordeeld wordt; daar is een open antwoord voor nodig.",
        configurationIntent: [{ setting: "vraag", intent: "Vraag naar de onderbouwing van de gekozen route en wat die kost." }],
      });
    } else {
      add({
        certumPhase: "actie",
        catalogBlockId: "certum.bco.open-vraag",
        purpose: "De deelnemer laten beschrijven wat hij of zij in het keuzemoment doet en waarom.",
        whyThisBlock: "Een open antwoord laat handelen en onderbouwing samen zien.",
        configurationIntent: [{ setting: "vraag", intent: "Wat doe of zeg je op dit moment, en waarom?" }],
      });
    }

    add({
      certumPhase: "reflectie",
      catalogBlockId: "certum.bco.open-vraag",
      purpose: "Terugkijken op de eigen gemaakte keuze en de afweging expliciet maken.",
      whyThisBlock: "Reflectie vraagt een eigen formulering; een open vraag is daarvoor het eenvoudigste blok.",
      configurationIntent: [{ setting: "vraag", intent: "Terugkijken op de gemaakte keuze en de expliciete afweging uit de Blueprint." }],
    });

    add({
      certumPhase: "feedback",
      catalogBlockId: "certum.bco.ai-feedback",
      purpose: "Feedback op handelen en afweging.",
      whyThisBlock: "AI Feedback ontvangt de eerdere antwoorden en kan op handelen én onderbouwing reageren.",
      configurationIntent: [
        { setting: "instructies voor AI", intent: "Beoordeel de afweging en de uitvoering op de dimensies uit de Blueprint." },
        ...(multiple
          ? [{ setting: "meerdere routes", intent: "Beoordeel niet welke route is gekozen, maar de kwaliteit van de afweging." }]
          : []),
      ],
    });

    add({
      certumPhase: "bron",
      catalogBlockId: "certum.bco.tekst",
      purpose: "Gevalideerde kennis bij de afweging aanbieden.",
      whyThisBlock: "Een tekst is voldoende; een document kan later als er een gevalideerd brondocument is.",
      configurationIntent: [
        { setting: "tekst", intent: "Pas invullen na validatie van de kennisvragen (sourceNeeds); geen niet-gevalideerde bronnen." },
      ],
    });

    add({
      certumPhase: "toets",
      catalogBlockId: "certum.bco.tekst",
      purpose: "Een nieuwe, vergelijkbare situatie introduceren.",
      whyThisBlock: "Transfer vraagt een nieuwe situatie; een korte tekst zet die neer.",
      configurationIntent: [{ setting: "tekst", intent: "Vergelijkbaar keuzemoment met andere details, zoals in de Toets-intentie." }],
    });
    add({
      certumPhase: "toets",
      catalogBlockId: conversation ? "certum.bco.chat-simulatie" : "certum.bco.open-vraag",
      purpose: "Hetzelfde professionele handelen aantonen in de nieuwe situatie.",
      whyThisBlock: conversation
        ? "Transfer van gesprekshandelen wordt het best zichtbaar in een nieuw gesprek."
        : "Transfer van een afweging wordt zichtbaar in een nieuwe onderbouwde keuze.",
      configurationIntent: [{ setting: "opdracht", intent: "Dezelfde afweging toepassen; geen kennisvragen." }],
    });
    add({
      certumPhase: "toets",
      catalogBlockId: "certum.bco.ai-feedback",
      purpose: "Terugkoppeling op de transferopdracht.",
      whyThisBlock: "Dezelfde feedbackmogelijkheid, nu gericht op transfer.",
      configurationIntent: [{ setting: "instructies voor AI", intent: "Beoordeel of de afweging in de nieuwe situatie is toegepast." }],
    });

    return {
      version: BC_ONLINE_BLOCK_PLAN_VERSION,
      blueprintVersion: blueprint.version,
      courseShell: {
        title: blueprint.title,
        description: blueprint.learningGoal,
        estimatedDurationMinutes: null,
        skjPoints: null,
        status: "concept",
      },
      startIntent: {
        explanationIntent: "Uitleg over de praktijksimulatie: een situatie, een keuzemoment, reflectie, feedback, bron en toepassing.",
        estimatedDurationMinutes: null,
        learningGoals: [blueprint.learningGoal],
      },
      plannedBlocks: drafts.map((d, i) => ({ id: `blok-${i + 1}`, sequence: i + 1, ...d })),
      endIntent: {
        closingIntent: "Afronden met de kern van de afweging.",
        summaryIntent: "Samenvatting van het keuzemoment en de belangrijkste afwegingen.",
        followUpRecommendation: null,
      },
      capabilityGaps:
        multiple && !conversation
          ? [
              {
                certumPhase: "feedback",
                need: "Route-afhankelijke vervolgstappen na de gekozen route (branching).",
                whyNeeded: "Bij meerdere verdedigbare routes zou de vervolgsituatie per route kunnen verschillen.",
                workaround: {
                  type: "partial",
                  description:
                    "Conditionele logica toont een korte tekst die afhangt van een eerder antwoord; AI Feedback reageert op de onderbouwing.",
                  limitation:
                    "Conditionele logica is alleen conditionele tekstweergave: geen alternatieve routes of vervolgblokken. Iedere deelnemer doorloopt dezelfde blokken; branching blijft niet ondersteund.",
                },
              },
            ]
          : [],
    };
  }
}
