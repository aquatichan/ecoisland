// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Coins, ChevronDown, ChevronUp } from "lucide-react";

const learningModules = [
  {
    title: "Unit 1 – The Living World: Ecosystems",
    description: "Unit 1 Overview: The Living World: Ecosystems",
    lessons: [
      { code: "1.1", title: "Introduction to Ecosystems" },
      { code: "1.2", title: "Terrestrial Biomes" },
      { code: "1.3", title: "Aquatic Biomes" },
      { code: "1.4", title: "The Carbon Cycle" },
      { code: "1.5", title: "The Nitrogen Cycle" },
      { code: "1.6", title: "The Phosphorous Cycle" },
      { code: "1.7", title: "The Hydrologic Cycle" },
      { code: "1.8", title: "Primary Productivity" },
      { code: "1.9", title: "Trophic Levels" },
      { code: "1.10", title: "Energy Flow and the 10% Rule" },
      { code: "1.11", title: "Food Chains and Food Webs" },
    ],
    duration: "5-6 hours",
    treecoins: 900
  },
  {
    title: "Unit 2 – The Living World: Biodiversity",
    description: "Unit 2 Overview: The Living World: Biodiversity",
    lessons: [
      { code: "2.1", title: "Introduction to Biodiversity" },
      { code: "2.2", title: "Ecosystem Services" },
      { code: "2.3", title: "Island Biogeography" },
      { code: "2.4", title: "Ecological Tolerance" },
      { code: "2.5", title: "Natural Disruptions to Ecosystems" },
      { code: "2.6", title: "Adaptations" },
      { code: "2.7", title: "Ecological Succession" },
    ],
    duration: "3-4 hours",
    treecoins: 900
  },
  {
    title: "Unit 3 – Populations",
    description: "Unit 3 Overview: Populations",
    lessons: [
      { code: "3.1", title: "Generalist and Specialist Species" },
      { code: "3.2", title: "K-Selected r-Selected Species" },
      { code: "3.3", title: "Survivorship Curves" },
      { code: "3.4", title: "Carrying Capacity" },
      { code: "3.5", title: "Population Growth and Resource Availability" },
      { code: "3.6", title: "Age Structure Diagrams" },
      { code: "3.7", title: "Total Fertility Rate" },
      { code: "3.8", title: "Human Population Dynamics" },
      { code: "3.9", title: "Demographic Transition" },
    ],
    duration: "4-5 hours",
    treecoins: 900
  },
  {
    title: "Unit 4 – Earth Systems & Resources",
    description: "Unit 4 Overview: Earth Systems and Resources",
    lessons: [
      { code: "4.1", title: "Tectonic Plates" },
      { code: "4.2", title: "Soil Formation and Erosion" },
      { code: "4.3", title: "Soil Composition and Properties" },
      { code: "4.4", title: "Earth's Atmosphere" },
      { code: "4.5", title: "Global Wind Patterns" },
      { code: "4.6", title: "Watersheds" },
      { code: "4.7", title: "Solar Radiation and Earth's Seasons" },
      { code: "4.8", title: "Earth's Geography and Climate" },
      { code: "4.9", title: "El Niño and La Niña" },
    ],
    duration: "4-5 hours",
    treecoins: 900
  },
  {
    title: "Unit 5 – Land & Water Use",
    description: "Unit 5 Overview: Land and Water Use",
    lessons: [
      { code: "5.0", title: "Required Environmental Legislation" },
      { code: "5.1", title: "The Tragedy of the Commons" },
      { code: "5.2", title: "Clearcutting" },
      { code: "5.3", title: "The Green Revolution" },
      { code: "5.4", title: "Impacts of Agricultural Practices" },
      { code: "5.5", title: "Irrigation Methods" },
      { code: "5.6", title: "Pest Control Methods" },
      { code: "5.7", title: "Meat Production Methods" },
      { code: "5.8", title: "Impacts of Overfishing" },
      { code: "5.9", title: "Impacts of Mining" },
      { code: "5.10", title: "Impacts of Urbanization" },
      { code: "5.11", title: "Ecological Footprints" },
      { code: "5.12", title: "Intro to Sustainability" },
      { code: "5.13", title: "Methods to Reduce Urban Runoff" },
      { code: "5.14", title: "Integrated Pest Management" },
      { code: "5.15", title: "Sustainable Agriculture" },
      { code: "5.16", title: "Aquaculture" },
      { code: "5.17", title: "Sustainable Forestry" },
    ],
    duration: "8-9 hours",
    treecoins: 900
  },
  {
    title: "Unit 6 – Energy Resources & Consumption",
    description: "Unit 6 Overview: Energy Resources and Consumption",
    lessons: [
      { code: "6.1", title: "Renewable and Nonrenewable Resources" },
      { code: "6.2", title: "Global Energy Consumption" },
      { code: "6.3", title: "Fuel Types and Uses" },
      { code: "6.4", title: "Distribution of Natural Resources" },
      { code: "6.5", title: "Fossil Fuels" },
      { code: "6.6", title: "Nuclear Power" },
      { code: "6.7", title: "Energy from Biomass" },
      { code: "6.8", title: "Solar Energy" },
      { code: "6.9", title: "Hydroelectric Power" },
      { code: "6.10", title: "Geothermal Energy" },
      { code: "6.11", title: "Hydrogen Fuel Cell" },
      { code: "6.12", title: "Wind Energy" },
      { code: "6.13", title: "Energy Conservation" },
    ],
    duration: "6-7 hours",
    treecoins: 900
  },
  {
    title: "Unit 7 – Atmospheric Pollution",
    description: "Unit 7 Overview: Atmospheric Pollution",
    lessons: [
      { code: "7.1", title: "Introduction to Air Pollution" },
      { code: "7.2", title: "Photochemical Smog" },
      { code: "7.3", title: "Thermal Inversion" },
      { code: "7.4", title: "Atmospheric CO2 and Particulates" },
      { code: "7.5", title: "Indoor Air Pollutants" },
      { code: "7.6", title: "Reduction of Air Pollutants" },
      { code: "7.7", title: "Acid Rain" },
      { code: "7.8", title: "Noise Pollution" },
    ],
    duration: "4 hours",
    treecoins: 900
  },
  {
    title: "Unit 8 – Aquatic & Terrestrial Pollution",
    description: "Unit 8 Overview: Aquatic & Terrestrial Pollution",
    lessons: [
      { code: "8.1", title: "Sources of Pollution" },
      { code: "8.2", title: "Human Impacts on Ecosystems" },
      { code: "8.3", title: "Endocrine Disruptors" },
      { code: "8.4", title: "Human Impacts on Wetlands and Mangroves" },
      { code: "8.5", title: "Eutrophication" },
      { code: "8.6", title: "Thermal Pollution" },
      { code: "8.7", title: "Persistent Organic Pollutants (POPs)" },
      { code: "8.8", title: "Bioaccumulation and Biomagnification" },
      { code: "8.9", title: "Solid Waste Disposal" },
      { code: "8.10", title: "Waste Reduction Methods" },
      { code: "8.11", title: "Sewage Treatment" },
      { code: "8.12", title: "Lethal Dose 50% (LD50)" },
      { code: "8.13", title: "Dose Response Curve" },
      { code: "8.14", title: "Pollution and Human Health" },
      { code: "8.15", title: "Pathogens and Infectious Diseases" },
    ],
    duration: "7-8 hours",
    treecoins: 900
  },
  {
    title: "Unit 9 – Global Change",
    description: "Unit 9 Overview: Global Change",
    lessons: [
      { code: "9.1", title: "Major Environmental Disasters" },
      { code: "9.2", title: "Stratospheric Ozone Depletion" },
      { code: "9.3", title: "Reducing Ozone Depletion" },
      { code: "9.4", title: "The Greenhouse Effect" },
      { code: "9.5", title: "Increases in the Greenhouse Gases" },
      { code: "9.6", title: "Global Climate Change" },
      { code: "9.7", title: "Ocean Warming" },
      { code: "9.8", title: "Ocean Acidification" },
      { code: "9.9", title: "Invasive Species" },
      { code: "9.10", title: "Endangered Species" },
      { code: "9.11", title: "Human Impacts on Biodiversity" },
    ],
    duration: "5-6 hours",
    treecoins: 900
  },
];

export default function ApesPage() {
  const [openModules, setOpenModules] = useState({});
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [flashcards, setFlashcards] = useState([]);
  const [view, setView] = useState("dashboard");
  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let interval;
    if (view === "quiz") {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [view]);

  const toggleModule = (index) =>
    setOpenModules((prev) => ({ ...prev, [index]: !prev[index] }));

  // Load JSON file dynamically - requires /public/APES/
  const loadQuestions = async (unitNumber) => {
    try {
      const response = await fetch(`/APES/APES_Unit${unitNumber}.json`);
      const data = await response.json();
      setQuestions(data);
      setCurrentQuestion(0);
      setScore(0);
      setSelectedAnswer(null);
      setView("quiz");
    } catch (err) {
      console.error("Failed to load unit:", err);
    }
  };

  const loadAllQuestions = async () => {
    try {
      const promises = Array.from({ length: 9 }, (_, i) =>
        fetch(`/APES/APES_Unit${i + 1}.json`).then((r) => r.json())
      );
      const data = await Promise.all(promises);
      setQuestions(data.flat());
      setCurrentQuestion(0);
      setScore(0);
      setSelectedAnswer(null);
      setView("quiz");
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
  };

  const loadFlashcards = async () => {
    const response = await fetch("/APES/APES_Vocab.json");
    const data = await response.json();
    setFlashcards(data);
    setView("flashcards");
  };

  const checkAnswer = (choice) => {
    setSelectedAnswer(choice);
    if (choice === questions[currentQuestion].answer) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setSelectedAnswer(null);
    } else {
      setView("result");
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" + sec : sec}`;
  };

   if (view === "quiz") {
    const q = questions[currentQuestion];
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Unit Practice</h1>
        <p className="text-gray-600 mb-2">
          Question {currentQuestion + 1} of {questions.length}
        </p>
        <p className="mb-4 text-gray-700">⏱ {formatTime(timer)}</p>
        <h2 className="text-lg font-semibold mb-4">{q.question}</h2>
        <div className="flex flex-col items-center gap-2">
          {["A", "B", "C", "D"].map((choice) => (
            <Button
              key={choice}
              onClick={() => checkAnswer(choice)}
              className={`w-max ${
                selectedAnswer === choice
                  ? choice === q.answer
                    ? "bg-green-500"
                    : "bg-red-500"
                  : "bg-gray-100 text-gray-700"
              }`}
              disabled={!!selectedAnswer}
            >
              {choice}: {q[choice]}
            </Button>
          ))}
        </div>
        {selectedAnswer && (
          <Button className="mt-6" onClick={nextQuestion}>
            Next
          </Button>
        )}
      </div>
    );
  }

  if (view === "result") {
    return (
      <div className="p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">Quiz Complete!</h1>
        <p className="text-xl mb-4">
          You scored {score} / {questions.length}
        </p>
        <Button onClick={() => setView("dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  if (view === "flashcards") {
    const card = flashcards[flashIndex];
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Flashcards</h1>
        {card && (
          <div
            className="cursor-pointer bg-white p-8 rounded-xl shadow-lg max-w-lg mx-auto"
            onClick={() => setFlipped(!flipped)}
          >
            <h2 className="text-xl font-semibold">
              {flipped ? card.definition : card.term}
            </h2>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-4">
          <Button
            onClick={() =>
              setFlashIndex((i) => (i > 0 ? i - 1 : flashcards.length - 1))
            }
          >
            Prev
          </Button>
          <Button
            onClick={() =>
              setFlashIndex((i) => (i + 1) % flashcards.length)
            }
          >
            Next
          </Button>
        </div>
        <Button className="mt-6" onClick={() => setView("dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 bg-gray-50 min-h-screen">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          APES Guide Dashboard
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          Earn Treecoins as you review for the AP Environmental Science Exam
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningModules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg border border-gray-200">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg font-bold">{module.title}</CardTitle>
              <p className="text-gray-500 text-sm mt-1">
                {module.description}
              </p>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              <div>
                <Button
                  variant="outline"
                  className="w-full flex justify-between items-center bg-gray-100 hover:bg-gray-200"
                  onClick={() => toggleModule(index)}
                >
                  <span className="font-semibold text-gray-700">
                    {module.lessons.length} Lessons
                  </span>
                  {openModules[index] ? <ChevronUp /> : <ChevronDown />}
                </Button>
                {openModules[index] && (
                  <ul className="mt-2 list-disc list-inside text-gray-600 text-sm space-y-1">
                    {module.lessons.map((lesson, i) => (
                      <li key={i}>
                        {lesson.code}: {lesson.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between items-center text-gray-700 mt-2">
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-orange-500" />
                  <span className="text-sm">{module.duration}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Coins size={16} className="text-yellow-500" />
                  <span className="text-sm">{module.treecoins} Treecoins</span>
                </div>
              </div>

              <Button
                className="w-full mt-3 bg-gradient-to-r from-teal-500 to-green-500 text-white"
                onClick={() => loadQuestions(index + 1)}
              >
                Start Unit Practice
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Practice Resources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg border border-gray-200 text-center p-4">
            <CardTitle className="text-lg font-semibold mb-2">Practice Questions</CardTitle>
            <p className="text-gray-600 text-sm mb-4">
              Work through targeted questions to test your understanding of each unit.
            </p>
            <Button
              className="bg-gradient-to-r from-teal-500 to-green-500 text-white w-full"
              onClick={loadAllQuestions}
            >
              Start Questions
            </Button>
          </Card>

          <Card className="hover:shadow-lg border border-gray-200 text-center p-4">
            <CardTitle className="text-lg font-semibold mb-2">Practice Tests</CardTitle>
            <p className="text-gray-600 text-sm mb-4">
              Simulate full-length exams to prepare for the APES test.
            </p>
            <Button
              className="bg-gradient-to-r from-teal-500 to-green-500 text-white w-full"
              onClick={() =>
                window.open("https://highschooltestprep.com/ap/environmental-science/", "_blank")
              }
            >
              Take a Test
            </Button>
          </Card>

          <Card className="hover:shadow-lg border border-gray-200 text-center p-4">
            <CardTitle className="text-lg font-semibold mb-2">Flashcards</CardTitle>
            <p className="text-gray-600 text-sm mb-4">
              Quickly memorize key terms and concepts using flashcards.
            </p>
            <Button
              className="bg-gradient-to-r from-teal-500 to-green-500 text-white w-full"
              onClick={loadFlashcards}
            >
              View Flashcards
            </Button>
          </Card>

          <Card className="hover:shadow-lg border border-gray-200 text-center p-4">
            <CardTitle className="text-lg font-semibold mb-2">Key Diagrams</CardTitle>
            <p className="text-gray-600 text-sm mb-4">
              Explore diagrams and concise summaries for each unit.
            </p>
            <Button className="bg-gradient-to-r from-teal-500 to-green-500 text-white w-full">
              Coming Soon...
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
