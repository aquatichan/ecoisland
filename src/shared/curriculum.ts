// The AP Environmental Science course, as Ecoisland teaches it.
// Single source of truth for units and lessons: the study pages, the lesson
// reader, teacher assignments and the server all read from here, so a lesson
// link can never point at a folder that does not exist.
// Lesson `id` is the folder name under public/APES_Modules/Unit_<n>/.

export type Lesson = {
  id: string;
  code: string;
  title: string;
  /** Whether the lesson folder ships a questions.json (10-question quiz). */
  hasQuiz: boolean;
};

export type Unit = {
  n: number;
  title: string;
  examWeight: string;
  lessons: Lesson[];
};

export const UNITS: Unit[] = [
  {
    n: 1,
    title: "The Living World: Ecosystems",
    examWeight: "6–8%",
    lessons: [
      { id: "1.0_The_Living_World_Ecosystems", code: "1.0", title: "The Living World: Ecosystems", hasQuiz: false },
      { id: "1.1_Introduction_to_Ecosystems", code: "1.1", title: "Introduction to Ecosystems", hasQuiz: true },
      { id: "1.2_Terrestrial_Biomes", code: "1.2", title: "Terrestrial Biomes", hasQuiz: true },
      { id: "1.3_Aquatic_Biomes", code: "1.3", title: "Aquatic Biomes", hasQuiz: true },
      { id: "1.4_The_Carbon_Cycle", code: "1.4", title: "The Carbon Cycle", hasQuiz: true },
      { id: "1.5_The_Nitrogen_Cycle", code: "1.5", title: "The Nitrogen Cycle", hasQuiz: true },
      { id: "1.6_The_Phosphorous_Cycle", code: "1.6", title: "The Phosphorous Cycle", hasQuiz: true },
      { id: "1.7_The_Hydrologic_Cycle", code: "1.7", title: "The Hydrologic Cycle", hasQuiz: true },
      { id: "1.8_Primary_Productivity", code: "1.8", title: "Primary Productivity", hasQuiz: true },
      { id: "1.9_Trophic_Levels", code: "1.9", title: "Trophic Levels", hasQuiz: true },
      { id: "1.10_Energy_Flow_and_the_10_Percent_Rule", code: "1.10", title: "Energy Flow and the 10% Rule", hasQuiz: true },
      { id: "1.11_Food_Chains_and_Food_Webs", code: "1.11", title: "Food Chains and Food Webs", hasQuiz: true },
    ],
  },
  {
    n: 2,
    title: "The Living World: Biodiversity",
    examWeight: "6–8%",
    lessons: [
      { id: "2.0_The_Living_World_Biodiversity", code: "2.0", title: "The Living World: Biodiversity", hasQuiz: false },
      { id: "2.1_Introduction_to_Biodiversity", code: "2.1", title: "Introduction to Biodiversity", hasQuiz: true },
      { id: "2.2_Ecosystem_Services", code: "2.2", title: "Ecosystem Services", hasQuiz: true },
      { id: "2.3_Island_Biogeography", code: "2.3", title: "Island Biogeography", hasQuiz: true },
      { id: "2.4_Ecological_Tolerance", code: "2.4", title: "Ecological Tolerance", hasQuiz: true },
      { id: "2.5_Natural_Disruptions_to_Ecosystems", code: "2.5", title: "Natural Disruptions to Ecosystems", hasQuiz: true },
      { id: "2.6_Adaptations", code: "2.6", title: "Adaptations", hasQuiz: true },
      { id: "2.7_Ecological_Succession", code: "2.7", title: "Ecological Succession", hasQuiz: true },
    ],
  },
  {
    n: 3,
    title: "Populations",
    examWeight: "10–15%",
    lessons: [
      { id: "3.0_Populations", code: "3.0", title: "Populations", hasQuiz: false },
      { id: "3.1_Generalist_and_Specialist_Species", code: "3.1", title: "Generalist and Specialist Species", hasQuiz: true },
      { id: "3.2_K-Selected_r-Selected_Species", code: "3.2", title: "K-Selected r-Selected Species", hasQuiz: true },
      { id: "3.3_Survivorship_Curves", code: "3.3", title: "Survivorship Curves", hasQuiz: true },
      { id: "3.4_Carrying_Capacity", code: "3.4", title: "Carrying Capacity", hasQuiz: true },
      { id: "3.5_Population_Growth_and_Resource_Availability", code: "3.5", title: "Population Growth and Resource Availability", hasQuiz: true },
      { id: "3.6_Age_Structure_Diagrams", code: "3.6", title: "Age Structure Diagrams", hasQuiz: true },
      { id: "3.7_Total_Fertility_Rate", code: "3.7", title: "Total Fertility Rate", hasQuiz: true },
      { id: "3.8_Human_Population_Dynamics", code: "3.8", title: "Human Population Dynamics", hasQuiz: true },
      { id: "3.9_Demographic_Transition", code: "3.9", title: "Demographic Transition", hasQuiz: true },
    ],
  },
  {
    n: 4,
    title: "Earth Systems and Resources",
    examWeight: "10–15%",
    lessons: [
      { id: "4.0_Earth_Systems_and_Resources", code: "4.0", title: "Earth Systems and Resources", hasQuiz: false },
      { id: "4.1_Tectonic_Plates", code: "4.1", title: "Tectonic Plates", hasQuiz: true },
      { id: "4.2_Soil_Formation_and_Erosion", code: "4.2", title: "Soil Formation and Erosion", hasQuiz: true },
      { id: "4.3_Soil_Composition_and_Properties", code: "4.3", title: "Soil Composition and Properties", hasQuiz: true },
      { id: "4.4_Earth's_Atmosphere", code: "4.4", title: "Earth's Atmosphere", hasQuiz: true },
      { id: "4.5_Global_Wind_Patterns", code: "4.5", title: "Global Wind Patterns", hasQuiz: true },
      { id: "4.6_Watersheds", code: "4.6", title: "Watersheds", hasQuiz: true },
      { id: "4.7_Solar_Radiation_and_Earth's_Seasons", code: "4.7", title: "Solar Radiation and Earth's Seasons", hasQuiz: true },
      { id: "4.8_Earth's_Geography_and_Climate", code: "4.8", title: "Earth's Geography and Climate", hasQuiz: true },
      { id: "4.9_El_Nino_and_La_Nina", code: "4.9", title: "El Niño and La Niña", hasQuiz: true },
    ],
  },
  {
    n: 5,
    title: "Land and Water Use",
    examWeight: "10–15%",
    lessons: [
      { id: "5.0_Required_Environmental_Legislation", code: "5.0", title: "Required Environmental Legislation", hasQuiz: false },
      { id: "5.1_The_Tragedy_of_the_Commons", code: "5.1", title: "The Tragedy of the Commons", hasQuiz: true },
      { id: "5.2_Clearcutting", code: "5.2", title: "Clearcutting", hasQuiz: true },
      { id: "5.3_The_Green_Revolution", code: "5.3", title: "The Green Revolution", hasQuiz: true },
      { id: "5.4_Impacts_of_Agricultural_Practices", code: "5.4", title: "Impacts of Agricultural Practices", hasQuiz: true },
      { id: "5.5_Irrigation_Methods", code: "5.5", title: "Irrigation Methods", hasQuiz: true },
      { id: "5.6_Pest_Control_Methods", code: "5.6", title: "Pest Control Methods", hasQuiz: true },
      { id: "5.7_Meat_Production_Methods", code: "5.7", title: "Meat Production Methods", hasQuiz: true },
      { id: "5.8_Impacts_of_Overfishing", code: "5.8", title: "Impacts of Overfishing", hasQuiz: true },
      { id: "5.9_Impacts_of_Mining", code: "5.9", title: "Impacts of Mining", hasQuiz: true },
      { id: "5.10_Impacts_of_Urbanization", code: "5.10", title: "Impacts of Urbanization", hasQuiz: true },
      { id: "5.11_Ecological_Footprints", code: "5.11", title: "Ecological Footprints", hasQuiz: true },
      { id: "5.12_Intro_to_Sustainability", code: "5.12", title: "Intro to Sustainability", hasQuiz: true },
      { id: "5.13_Methods_to_Reduce_Urban_Runoff", code: "5.13", title: "Methods to Reduce Urban Runoff", hasQuiz: true },
      { id: "5.14_Integrated_Pest_Management", code: "5.14", title: "Integrated Pest Management", hasQuiz: true },
      { id: "5.15_Sustainable_Agriculture", code: "5.15", title: "Sustainable Agriculture", hasQuiz: true },
      { id: "5.16_Aquaculture", code: "5.16", title: "Aquaculture", hasQuiz: true },
      { id: "5.17_Sustainable_Forestry", code: "5.17", title: "Sustainable Forestry", hasQuiz: true },
    ],
  },
  {
    n: 6,
    title: "Energy Resources and Consumption",
    examWeight: "10–15%",
    lessons: [
      { id: "6.0_Energy_Resources_and_Consumption", code: "6.0", title: "Energy Resources and Consumption", hasQuiz: false },
      { id: "6.1_Renewable_and_Nonrenewable_Resources", code: "6.1", title: "Renewable and Nonrenewable Resources", hasQuiz: true },
      { id: "6.2_Global_Energy_Consumption", code: "6.2", title: "Global Energy Consumption", hasQuiz: true },
      { id: "6.3_Fuel_Types_and_Uses", code: "6.3", title: "Fuel Types and Uses", hasQuiz: true },
      { id: "6.4_Distribution_of_Natural_Resources", code: "6.4", title: "Distribution of Natural Resources", hasQuiz: true },
      { id: "6.5_Fossil_Fuels", code: "6.5", title: "Fossil Fuels", hasQuiz: true },
      { id: "6.6_Nuclear_Power", code: "6.6", title: "Nuclear Power", hasQuiz: true },
      { id: "6.7_Energy_from_Biomass", code: "6.7", title: "Energy from Biomass", hasQuiz: true },
      { id: "6.8_Solar_Energy", code: "6.8", title: "Solar Energy", hasQuiz: true },
      { id: "6.9_Hydroelectric_Power", code: "6.9", title: "Hydroelectric Power", hasQuiz: true },
      { id: "6.10_Geothermal_Energy", code: "6.10", title: "Geothermal Energy", hasQuiz: true },
      { id: "6.11_Hydrogen_Fuel_Cell", code: "6.11", title: "Hydrogen Fuel Cell", hasQuiz: true },
      { id: "6.12_Wind_Energy", code: "6.12", title: "Wind Energy", hasQuiz: true },
      { id: "6.13_Energy_Conservation", code: "6.13", title: "Energy Conservation", hasQuiz: true },
    ],
  },
  {
    n: 7,
    title: "Atmospheric Pollution",
    examWeight: "7–10%",
    lessons: [
      { id: "7.0_Atmospheric_Pollution", code: "7.0", title: "Atmospheric Pollution", hasQuiz: false },
      { id: "7.1_Introduction_to_Air_Pollution", code: "7.1", title: "Introduction to Air Pollution", hasQuiz: true },
      { id: "7.2_Photochemical_Smog", code: "7.2", title: "Photochemical Smog", hasQuiz: true },
      { id: "7.3_Thermal_Inversion", code: "7.3", title: "Thermal Inversion", hasQuiz: true },
      { id: "7.4_Atmospheric_CO2_and_Particulates", code: "7.4", title: "Atmospheric CO2 and Particulates", hasQuiz: true },
      { id: "7.5_Indoor_Air_Pollutants", code: "7.5", title: "Indoor Air Pollutants", hasQuiz: true },
      { id: "7.6_Reduction_of_Air_Pollutants", code: "7.6", title: "Reduction of Air Pollutants", hasQuiz: true },
      { id: "7.7_Acid_Rain", code: "7.7", title: "Acid Rain", hasQuiz: true },
      { id: "7.8_Noise_Pollution", code: "7.8", title: "Noise Pollution", hasQuiz: true },
    ],
  },
  {
    n: 8,
    title: "Aquatic and Terrestrial Pollution",
    examWeight: "7–10%",
    lessons: [
      { id: "8.0_Aquatic_&_Terrestrial_Pollution", code: "8.0", title: "Aquatic & Terrestrial Pollution", hasQuiz: false },
      { id: "8.1_Sources_of_Pollution", code: "8.1", title: "Sources of Pollution", hasQuiz: true },
      { id: "8.2_Human_Impacts_on_Ecosystems", code: "8.2", title: "Human Impacts on Ecosystems", hasQuiz: true },
      { id: "8.3_Endocrine_Disruptors", code: "8.3", title: "Endocrine Disruptors", hasQuiz: true },
      { id: "8.4_Human_Impacts_on_Wetlands_and_Mangroves", code: "8.4", title: "Human Impacts on Wetlands and Mangroves", hasQuiz: true },
      { id: "8.5_Eutrophication", code: "8.5", title: "Eutrophication", hasQuiz: true },
      { id: "8.6_Thermal_Pollution", code: "8.6", title: "Thermal Pollution", hasQuiz: false },
      { id: "8.7_Persistent_Organic_Pollutants_(POPs)", code: "8.7", title: "Persistent Organic Pollutants (POPs)", hasQuiz: false },
      { id: "8.8_Bioaccumulation_and_Biomagnification", code: "8.8", title: "Bioaccumulation and Biomagnification", hasQuiz: true },
      { id: "8.9_Solid_Waste_Disposal", code: "8.9", title: "Solid Waste Disposal", hasQuiz: false },
      { id: "8.10_Waste_Reduction_Methods", code: "8.10", title: "Waste Reduction Methods", hasQuiz: false },
      { id: "8.11_Sewage_Treatment", code: "8.11", title: "Sewage Treatment", hasQuiz: false },
      { id: "8.12_Lethal_Dose_50_(LD50)", code: "8.12", title: "Lethal Dose 50% (LD50)", hasQuiz: false },
      { id: "8.13_Dose_Response_Curve", code: "8.13", title: "Dose Response Curve", hasQuiz: false },
      { id: "8.14_Pollution_and_Human_Health", code: "8.14", title: "Pollution and Human Health", hasQuiz: false },
      { id: "8.15_Pathogens_and_Infectious_Diseases", code: "8.15", title: "Pathogens and Infectious Diseases", hasQuiz: false },
    ],
  },
  {
    n: 9,
    title: "Global Change",
    examWeight: "15–20%",
    lessons: [
      { id: "9.0_Global_Change", code: "9.0", title: "Global Change", hasQuiz: false },
      { id: "9.1_Stratospheric_Ozone_Depletion", code: "9.1", title: "Stratospheric Ozone Depletion", hasQuiz: true },
      { id: "9.2_Reducing_Ozone_Depletion", code: "9.2", title: "Reducing Ozone Depletion", hasQuiz: true },
      { id: "9.3_The_Greenhouse_Effect", code: "9.3", title: "The Greenhouse Effect", hasQuiz: true },
      { id: "9.4_Increases_in_the_Greenhouse_Gases", code: "9.4", title: "Increases in the Greenhouse Gases", hasQuiz: true },
      { id: "9.5_Global_Climate_Change", code: "9.5", title: "Global Climate Change", hasQuiz: true },
      { id: "9.6_Ocean_Warming", code: "9.6", title: "Ocean Warming", hasQuiz: true },
      { id: "9.7_Ocean_Acidification", code: "9.7", title: "Ocean Acidification", hasQuiz: true },
      { id: "9.8_Invasive_Species", code: "9.8", title: "Invasive Species", hasQuiz: true },
      { id: "9.9_Endangered_Species", code: "9.9", title: "Endangered Species", hasQuiz: true },
      { id: "9.10_Human_Impacts_on_Biodiversity", code: "9.10", title: "Human Impacts on Biodiversity", hasQuiz: true },
    ],
  },
];

export const UNIT_NUMBERS = UNITS.map((u) => u.n);

const LESSON_INDEX = new Map<string, { lesson: Lesson; unit: Unit; index: number }>();
for (const unit of UNITS) {
  unit.lessons.forEach((lesson, index) => LESSON_INDEX.set(lesson.id, { lesson, unit, index }));
}

export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export function getUnit(n: number): Unit | undefined {
  return UNITS.find((u) => u.n === n);
}

export function findLesson(id: string): { lesson: Lesson; unit: Unit; index: number } | undefined {
  return LESSON_INDEX.get(id);
}

export function unitOfLesson(id: string): number | undefined {
  return LESSON_INDEX.get(id)?.unit.n;
}

/** Previous and next lessons in course order (crossing unit boundaries). */
export function neighbours(id: string): { prev?: Lesson; next?: Lesson } {
  const i = ALL_LESSONS.findIndex((l) => l.id === id);
  if (i < 0) return {};
  return { prev: ALL_LESSONS[i - 1], next: ALL_LESSONS[i + 1] };
}

/** Path of a lesson's content folder under /public. */
export function lessonAssetBase(id: string): string {
  const unit = unitOfLesson(id);
  return `/APES_Modules/Unit_${unit}/${encodeURIComponent(id)}`;
}

/** Firestore-safe key for a lesson ("1.4_The_Carbon_Cycle" -> "L1_4"). */
export function lessonKey(id: string): string {
  const code = findLesson(id)?.lesson.code ?? id.split("_")[0];
  return `L${code.replace(/\./g, "_")}`;
}

export function unitKey(n: number): string {
  return `u${n}`;
}

/** Firestore-safe map key for arbitrary ids such as FRQ ids ("u1-frq-1" -> "u1_frq_1"). */
export function safeKey(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}
