// Field quests: one real-world action per unit that applies what the unit
// teaches. Students write a short field note; it earns Treecoins once per
// unit and shows up in their class's field notes for the teacher to read.

export type Quest = {
  unit: number;
  title: string;
  prompt: string;
  /** Bullet prompts that shape a good field note. */
  steps: string[];
};

export const QUEST_MIN_CHARS = 80;
export const QUEST_MAX_CHARS = 1200;

export const QUESTS: Quest[] = [
  {
    unit: 1,
    title: "Map a food web",
    prompt: "Spend ten minutes in a park, yard or schoolyard and sketch the food web you can actually see.",
    steps: ["Name three producers and three consumers you found.", "Name one decomposer, or where decomposition is happening.", "Describe one energy transfer, and where energy is lost as heat."],
  },
  {
    unit: 2,
    title: "Count the species",
    prompt: "Take a ten-minute walk and count how many different plant and animal species you can spot.",
    steps: ["How many species did you count?", "Pick one and name an ecosystem service it provides.", "Would this area count as high or low biodiversity? Why?"],
  },
  {
    unit: 3,
    title: "Population check",
    prompt: "Choose a species you see every day: pigeons, squirrels, dandelions, ants.",
    steps: ["Is it r-selected or K-selected? Give one piece of evidence.", "What limits its population where you live?", "Which survivorship curve fits it best?"],
  },
  {
    unit: 4,
    title: "Read the soil",
    prompt: "Find exposed soil (a garden bed, a plant pot, a construction site) and look closely.",
    steps: ["Describe its color and texture. Is it sandy, silty or clay-rich?", "Can you see organic matter or distinct layers?", "Which watershed does rain on your street drain into?"],
  },
  {
    unit: 5,
    title: "Trace your lunch",
    prompt: "Pick one food from a meal today and trace where it most likely came from.",
    steps: ["Where was it probably grown or raised?", "Name one agricultural practice behind it and its effect on soil or water.", "Suggest one more sustainable alternative."],
  },
  {
    unit: 6,
    title: "Energy audit",
    prompt: "Find three things at home or school that use energy and follow the energy back to its source.",
    steps: ["List the three devices.", "What fuel or source ultimately powers each one?", "Propose one change that would cut energy use, and estimate the effect."],
  },
  {
    unit: 7,
    title: "Check the air",
    prompt: "Look up today's Air Quality Index for your area on airnow.gov or a weather app.",
    steps: ["What is the AQI, and which pollutant is highest?", "What is the most likely source of that pollutant where you live?", "Is it a primary or secondary pollutant?"],
  },
  {
    unit: 8,
    title: "Trash audit",
    prompt: "Sort everything you throw away in one day into landfill, recycling and compost.",
    steps: ["Roughly how much ended up in each category?", "What surprised you?", "Which waste reduction method would have helped most?"],
  },
  {
    unit: 9,
    title: "Carbon day",
    prompt: "Estimate the carbon emissions from your transportation for one full day.",
    steps: ["List each trip with its distance and mode (car, bus, bike, walk).", "Estimate the CO₂ (about 0.17 kg per km for a car, 0.1 for a bus, 0 for walking).", "Name one change that would cut that number, and by how much."],
  },
];

export function questForUnit(unit: number): Quest | undefined {
  return QUESTS.find((q) => q.unit === unit);
}
