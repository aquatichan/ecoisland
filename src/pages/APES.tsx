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
import { useNavigate } from "react-router-dom";
import { learningModules } from "../data/units"

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

  const navigate = useNavigate();

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

  const goToLesson = (lesson) => {
    const unit = lesson.code.split(".")[0]

    const folderName =
      lesson.code + "_" + lesson.title.replaceAll(" ", "_")

    navigate(`/apes/unit/${unit}/${folderName}`)
  }

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
                        <button
                          onClick={() => goToLesson(lesson)}
                          className="text-blue-600 hover:underline"
                        >
                          {lesson.code}: {lesson.title}
                        </button>
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
