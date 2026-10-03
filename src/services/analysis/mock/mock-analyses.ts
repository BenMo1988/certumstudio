import type { InputAnalysis } from "@/modules/training-agent";

/*
 * Fictieve, representatieve analyses voor de mockservice.
 * Alleen gebruikt door `MockTrainingAnalysisService`, nooit door de UI.
 */

export const MOCK_ANALYSIS_ONDERWERP: InputAnalysis = {
  summary:
    "Het onderwerp gaat over het bewaken van grenzen in de professionele relatie met cliënten, met name rond bereikbaarheid en persoonlijke betrokkenheid.",
  professionalDilemma:
    "Betrokken en beschikbaar willen zijn voor de cliënt, tegenover het bewaken van professionele afstand en de eigen belastbaarheid.",
  proposedLearningGoal:
    "De deelnemer kan in een concrete situatie een professionele grens benoemen en onderbouwen, zonder de werkrelatie met de cliënt te schaden.",
  targetAudience: null,
  suitability: {
    verdict: "aanpassen",
    explanation:
      "Een onderwerp is nog geen praktijksituatie. Kies hieronder een richting met een concreet dilemma; dan is het geschikt als simulatie.",
  },
  trainingDirections: [
    {
      id: "bereikbaarheid",
      title: "Bereikbaarheid buiten werktijd",
      description: "Een cliënt verwacht dat je ook 's avonds en in het weekend reageert op berichten.",
      proposedLearningGoal:
        "De deelnemer kan afspraken over bereikbaarheid helder maken en vasthouden, ook als de cliënt teleurgesteld reageert.",
    },
    {
      id: "persoonlijke-vragen",
      title: "Persoonlijke vragen en zelfonthulling",
      description: "Een cliënt stelt steeds vaker persoonlijke vragen en wil ‘vrienden’ worden.",
      proposedLearningGoal:
        "De deelnemer kan bewust kiezen wat hij of zij over zichzelf deelt en dat professioneel begrenzen.",
    },
    {
      id: "giften",
      title: "Cadeaus en gunsten",
      description: "Een cliënt wil je bedanken met een cadeau of een persoonlijke gunst.",
      proposedLearningGoal:
        "De deelnemer kan een gift beoordelen aan de hand van de beroepscode en het gesprek daarover respectvol voeren.",
    },
  ],
  privacyAssessment: { level: "geen", description: null },
  missingInformation: [
    "Voor welke beroepsgroep of setting is de training bedoeld?",
    "Is er een concrete aanleiding, zoals een signaal uit het team?",
  ],
  rationale:
    "Het onderwerp is breed. De voorgestelde richtingen vertalen het naar herkenbare situaties waarin een professional een keuze moet maken; dat is nodig voor een praktijksimulatie.",
};

export const MOCK_ANALYSIS_PRAKTIJKVRAAG: InputAnalysis = {
  summary:
    "Een professional vraagt hoe je reageert op een ouder die tijdens gesprekken herhaaldelijk boos wordt en het gesprek daarmee overneemt.",
  professionalDilemma:
    "Ruimte geven aan de emotie van de ouder, tegenover het begrenzen van het gesprek en het bewaken van het doel en de eigen veiligheid.",
  proposedLearningGoal:
    "De deelnemer kan oplopende boosheid van een ouder herkennen, de-escalerend reageren en zo nodig het gesprek begrenzen of beëindigen.",
  targetAudience: "Professionals die gesprekken voeren met ouders, zoals in jeugdhulp, onderwijs of lokale teams",
  suitability: {
    verdict: "geschikt",
    explanation: "De vraag beschrijft een herkenbare situatie met een duidelijke keuze voor de professional.",
  },
  trainingDirections: [
    {
      id: "de-escaleren",
      title: "De-escaleren in het gesprek",
      description: "Het gesprek loopt op; je kiest hoe je reageert op de boosheid van de ouder.",
      proposedLearningGoal:
        "De deelnemer kan met erkenning en structuur de spanning in een gesprek verlagen.",
    },
    {
      id: "gesprek-beeindigen",
      title: "Grens stellen en gesprek beëindigen",
      description: "De boosheid wordt grensoverschrijdend; je beslist of en hoe je het gesprek stopt.",
      proposedLearningGoal:
        "De deelnemer kan een grens aangeven, het gesprek zorgvuldig beëindigen en een vervolg afspreken.",
    },
  ],
  privacyAssessment: { level: "geen", description: null },
  missingInformation: ["Is de boosheid gericht op de professional zelf of op de situatie van het kind?"],
  rationale:
    "De vraag bevat een concreet terugkerend moment en een spanningsveld tussen erkennen en begrenzen. Dat maakt hem direct bruikbaar voor een simulatie met keuzemomenten.",
};

export const MOCK_ANALYSIS_CASUS: InputAnalysis = {
  summary:
    "Een mentor krijgt van een leerling te horen dat het thuis niet goed gaat en wordt gevraagd dit geheim te houden. De ouder vraagt later in een gesprek of er iets speelt.",
  professionalDilemma:
    "Het vertrouwen van de leerling bewaren, tegenover de plicht om zorgen over de veiligheid van het kind te bespreken.",
  proposedLearningGoal:
    "De deelnemer kan uitleggen waarom geheimhouding niet onvoorwaardelijk is en dit zorgvuldig met een leerling bespreken.",
  targetAudience: "Mentoren en zorgcoördinatoren in het voortgezet onderwijs",
  suitability: {
    verdict: "geschikt",
    explanation: "De casus bevat een realistisch moment waarop de professional moet kiezen tussen twee legitieme belangen.",
  },
  trainingDirections: [
    {
      id: "geheimhouding-bespreken",
      title: "Geheimhouding bespreekbaar maken",
      description: "De leerling vraagt om geheimhouding; je kiest hoe je daarop reageert.",
      proposedLearningGoal:
        "De deelnemer kan eerlijk zijn over de grenzen van geheimhouding zonder het contact met de leerling te verliezen.",
    },
    {
      id: "gesprek-met-ouder",
      title: "Het gesprek met de ouder",
      description: "De ouder vraagt of er iets speelt; je weegt af wat je wel en niet deelt.",
      proposedLearningGoal:
        "De deelnemer kan in een gesprek met een ouder de belangen van de leerling bewaken.",
    },
    {
      id: "meldcode-stappen",
      title: "Zorgen wegen volgens de meldcode",
      description: "Je brengt signalen in kaart en bepaalt de volgende stap.",
      proposedLearningGoal:
        "De deelnemer kan de eerste stappen van de meldcode toepassen op een concrete situatie.",
    },
  ],
  privacyAssessment: {
    level: "aandachtspunt",
    description:
      "De casus noemt de naam van de school en de leeftijd van de leerling. In combinatie kan dit herleidbaar zijn; overweeg deze gegevens algemener te maken.",
  },
  missingInformation: [],
  rationale:
    "De casus draait om één helder keuzemoment met een wettelijk kader (meldcode). Dat leent zich goed voor een simulatie waarin de deelnemer de afweging zelf maakt.",
};

export const MOCK_ANALYSIS_CASUS_BLOCKED: InputAnalysis = {
  ...MOCK_ANALYSIS_CASUS,
  privacyAssessment: {
    level: "blokkeren",
    description:
      "De casus bevat een volledige naam en een geboortedatum. Daarmee is de betrokkene direct herleidbaar. Verwijder of vervang deze gegevens en analyseer de casus opnieuw.",
  },
  rationale:
    "Inhoudelijk is de casus bruikbaar, maar met direct herleidbare persoonsgegevens kan hij niet verder worden verwerkt.",
};

export const MOCK_ANALYSIS_UNSUITABLE: InputAnalysis = {
  summary: "De input beschrijft geen professionele situatie, vraag of keuze.",
  professionalDilemma: "Geen professioneel dilemma herkend.",
  proposedLearningGoal: "Nog niet te bepalen.",
  targetAudience: null,
  suitability: {
    verdict: "ongeschikt",
    explanation:
      "Er is geen situatie waarin een professional een keuze moet maken. Zonder zo’n keuzemoment kan geen praktijksimulatie worden gemaakt.",
  },
  trainingDirections: [
    {
      id: "herformuleren",
      title: "Herformuleer als praktijksituatie",
      description: "Beschrijf wie er betrokken is, wat er gebeurde en welke keuze de professional moest maken.",
      proposedLearningGoal: "Nog niet te bepalen.",
    },
  ],
  privacyAssessment: { level: "geen", description: null },
  missingInformation: [
    "Om welke professionele situatie gaat het?",
    "Welke keuze of handeling stond centraal?",
  ],
  rationale: "Een praktijksimulatie vraagt om een herkenbaar keuzemoment. Dat ontbreekt in deze input.",
};
