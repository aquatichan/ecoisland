// Eco actions a teacher (or an admin, for everyone) can schedule in one
// click. Each one puts a unit's science to work outside class and ends with
// a short write-up of what the student found.

import type { Category } from "./act";

export type EcoAction = {
  id: string;
  title: string;
  summary: string;
  unit: number;
  category: Category;
  /** Suggested length of the window, in days. */
  days: number;
  steps: string[];
  /** The science behind it. */
  why: string;
  /** What the write-up should answer. */
  prompt: string;
};

export const ECO_ACTIONS: EcoAction[] = [
  {
    id: "trash-audit",
    title: "Trash audit",
    summary: "Sort three days of your household's trash and find the biggest thing you could cut.",
    unit: 8,
    category: "waste",
    days: 7,
    steps: [
      "For three days, sort what your household throws away into landfill, recycling and compost (or food scraps).",
      "Estimate each pile by volume or weight. A kitchen scale or a count of full bags is fine.",
      "Find the single biggest source of landfill waste.",
      "Pick one change that would shrink it, and try it for the rest of the week.",
    ],
    why: "Most municipal solid waste in the US still goes to landfills, where buried food and paper decompose without oxygen and release methane, a greenhouse gas far stronger than CO₂. Reduce comes before reuse and recycle for a reason.",
    prompt: "What was your biggest waste source, roughly how much was there, and what change did you try?",
  },
  {
    id: "energy-hunt",
    title: "Home energy hunt",
    summary: "Find the energy your home wastes: phantom loads, old bulbs, drafts and the thermostat.",
    unit: 6,
    category: "energy",
    days: 7,
    steps: [
      "Count devices that stay plugged in and glowing when no one uses them (phantom loads).",
      "Count incandescent or CFL bulbs that could be LEDs.",
      "Check windows and doors for drafts, and note the thermostat setting.",
      "Fix one thing: unplug a power strip, swap a bulb, or adjust the thermostat by 2°F.",
    ],
    why: "Most US electricity still comes from burning fossil fuels, so every kilowatt-hour saved avoids CO₂ and other air pollutants. Conservation is the cheapest energy there is.",
    prompt: "What did you find, what did you change, and how much energy do you think it saves?",
  },
  {
    id: "water-log",
    title: "Track your water",
    summary: "Log every use of water at home for two days, then cut your biggest use.",
    unit: 5,
    category: "water",
    days: 7,
    steps: [
      "For two days, log showers (in minutes), toilet flushes, laundry, dishes and outdoor watering.",
      "Estimate gallons: a typical shower head uses about 2 gallons a minute.",
      "Find your biggest use.",
      "Cut it for the rest of the week, and estimate the gallons you saved.",
    ],
    why: "Fresh water is a small slice of Earth's water, and aquifers can be drawn down faster than they recharge. Treating and pumping water also uses energy.",
    prompt: "What was your daily total, your biggest use, and how many gallons did your change save?",
  },
  {
    id: "lower-on-the-food-chain",
    title: "Eat lower on the food chain",
    summary: "Go plant-based for three days and work out the energy you saved.",
    unit: 1,
    category: "food",
    days: 7,
    steps: [
      "Eat plant-based meals for three days (or swap red meat for plants, if that's more realistic).",
      "Keep a list of what you ate.",
      "Use the 10% rule to explain why plant foods need less land and energy.",
    ],
    why: "Only about 10% of the energy at one trophic level reaches the next. Eating producers directly takes far less cropland, water and energy than feeding those crops to livestock first.",
    prompt: "What did you eat, what was hardest, and how does the 10% rule explain the difference?",
  },
  {
    id: "native-or-invasive",
    title: "Native or invasive?",
    summary: "Identify five plants near you and find out which ones belong there.",
    unit: 9,
    category: "wildlife",
    days: 10,
    steps: [
      "Photograph five different plants in a yard, park or schoolyard.",
      "Identify them with a field guide or an app such as iNaturalist or Seek.",
      "Find out which are native to your region and which are invasive.",
      "For one invasive species, explain how it outcompetes native plants.",
    ],
    why: "Invasive species are one of the biggest threats to biodiversity. Without the predators and diseases that kept them in check at home, they can crowd out native species.",
    prompt: "Which plants did you find, which were native or invasive, and how does one invasive species spread?",
  },
  {
    id: "litter-sweep",
    title: "Litter sweep",
    summary: "Spend 30 minutes picking up litter and tally what you find.",
    unit: 8,
    category: "cleanup",
    days: 10,
    steps: [
      "Pick a block, a park edge or a stretch of shoreline. Wear gloves, go with someone, and leave sharp objects and needles alone.",
      "Collect litter for 30 minutes and tally it: plastic bottles, bags, food wrappers, cigarette butts, cans, other.",
      "Note which items could reach a storm drain or waterway.",
    ],
    why: "Litter on streets washes into storm drains and out to rivers and the ocean. Plastics break into microplastics that enter food webs and can bioaccumulate.",
    prompt: "What did you collect most, how many items in total, and where would it have ended up?",
  },
  {
    id: "commute-switch",
    title: "Change one commute",
    summary: "Walk, bike, bus or carpool instead of driving for a week, and add up the CO₂.",
    unit: 7,
    category: "air",
    days: 7,
    steps: [
      "Replace car trips you'd normally take with walking, biking, public transit or carpooling.",
      "Log each trip and its distance.",
      "Estimate the CO₂ you avoided. A typical passenger car emits about 400 grams of CO₂ per mile.",
    ],
    why: "Burning gasoline releases CO₂ along with nitrogen oxides and other precursors of photochemical smog. Transportation is one of the largest sources of US greenhouse gas emissions.",
    prompt: "How many miles did you switch, how much CO₂ did that avoid, and could you keep it up?",
  },
  {
    id: "follow-the-runoff",
    title: "Follow the runoff",
    summary: "Trace where rain goes on your street and find the nearest storm drain.",
    unit: 5,
    category: "water",
    days: 14,
    steps: [
      "During or after rain, watch where water flows on your street, driveway or schoolyard.",
      "List impervious surfaces (roofs, roads, parking lots) and pervious ones (lawns, gardens).",
      "Find the nearest storm drain and look up where it empties.",
      "Suggest one fix, such as a rain garden, permeable pavement or a rain barrel.",
    ],
    why: "Impervious surfaces stop rain soaking in, so runoff carries oil, fertilizer and litter straight into waterways. That's nonpoint source pollution, and it's hard to regulate.",
    prompt: "Where did the water go, what might it carry, and what fix would you suggest?",
  },
  {
    id: "air-check",
    title: "Check your air",
    summary: "Look up the Air Quality Index every day for a week and explain what moves it.",
    unit: 7,
    category: "air",
    days: 7,
    steps: [
      "Each day, look up your local AQI on AirNow.gov (or a weather app) and note the main pollutant.",
      "Note the weather too: wind, temperature, rain.",
      "Find the worst day and explain why the air was worse.",
    ],
    why: "Ground-level ozone forms when sunlight hits NOx and VOCs, so it peaks on hot, still afternoons. Particulate matter spikes with wildfire smoke and temperature inversions.",
    prompt: "What was your best and worst AQI, which pollutant drove it, and why?",
  },
  {
    id: "food-waste",
    title: "Zero food waste week",
    summary: "Track the food your household throws away for a week and cut it.",
    unit: 8,
    category: "food",
    days: 7,
    steps: [
      "Keep a list of all food thrown away for a week, with a rough amount.",
      "Note why each item was wasted: spoiled, leftovers, too much cooked.",
      "Try one fix: plan meals, use leftovers, or compost scraps.",
    ],
    why: "Wasted food wastes the water, land, fertilizer and energy used to grow it, and rotting food in landfills releases methane.",
    prompt: "How much food was wasted, why, and what did your fix change?",
  },
  {
    id: "pollinator-count",
    title: "Pollinator count",
    summary: "Watch a patch of flowers for 15 minutes and count every pollinator.",
    unit: 2,
    category: "wildlife",
    days: 14,
    steps: [
      "Choose a flowering plant or garden bed on a warm, sunny day.",
      "For 15 minutes, count visits by bees, butterflies, moths, flies, beetles and birds.",
      "Note the flower type and what the pollinators seemed to prefer.",
    ],
    why: "Pollination is an ecosystem service that much of our food depends on. Pollinators are declining from habitat loss, pesticides and climate change.",
    prompt: "How many visits did you count, by which pollinators, and why do they matter here?",
  },
  {
    id: "make-the-case",
    title: "Make the case",
    summary: "Write to a local decision maker about one environmental issue, with evidence.",
    unit: 9,
    category: "advocacy",
    days: 14,
    steps: [
      "Pick one local environmental issue: a polluted creek, a lack of bike lanes, school recycling, tree cover.",
      "Find two pieces of evidence, such as data, a news report, or what you've seen yourself.",
      "Write a short, respectful letter or email to a city council member, school board member or principal.",
      "Propose one specific, realistic solution.",
    ],
    why: "Many environmental problems are solved through policy, from the Clean Water Act to local zoning. Decision makers respond to clear evidence and specific asks.",
    prompt: "Who did you write to, what did you ask for, and what evidence did you use?",
  },
];

export function findAction(id: string | null | undefined): EcoAction | undefined {
  return ECO_ACTIONS.find((a) => a.id === id);
}

/** The details text for a scheduled action: steps, then the science. */
export function actionDetails(a: EcoAction): string {
  return `${a.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nWhy it matters: ${a.why}`;
}
