import "../styles/content.css"

import { useRef, useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { units, learningModules } from "../data/units"

import { ChevronDown, ChevronUp } from "lucide-react"

type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; html: { __html: string } }
  | { type: "image"; src: string; width?: string; height?: string }
  | { type: "table"; html: string }
  | { type: "list"; "ordered": boolean; html: { __html: string }}

export default function LessonPage() {

  const { unit, lesson } = useParams()
  const contentRef = useRef<HTMLDivElement>(null)

  const unitNum = Number(unit)

  const [content, setContent] = useState<ContentBlock[]>([])
  const [title, setTitle] = useState<string>("")
  const [questions, setQuestions] = useState<any[]>([])
  const [vocab, setVocab] = useState<{}>({})
  const [openUnits, setOpenUnits] = useState<Record<number, boolean>>({
    [unitNum]: true
  })

  const [leftOffset, setLeftOffset] = useState(0)

  useEffect(() => {
    function updatePosition() {
      if (!contentRef.current) return
      const rect = contentRef.current.getBoundingClientRect()
      setLeftOffset(rect.left+32)
    }

    updatePosition()
    window.addEventListener("scroll", updatePosition)
    window.addEventListener("resize", updatePosition)

    return () => {
      window.removeEventListener("scroll", updatePosition)
      window.removeEventListener("resize", updatePosition)
    }
  }, [])

  const lessons = units[unitNum]
  const lessonFolder = lessons?.find(l => l == lesson)

  useEffect(() => {

    async function loadData() {

      if (!lessonFolder) return

      const base = `/APES_Modules/Unit_${unitNum}/${lessonFolder}`

      console.log(base)

      const contentData = await fetch(`${base}/content.json`).then(r => r.json())

      try {
        const questionData = await fetch(`${base}/questions.json`).then(r => r.json())
        setQuestions(questionData)
      } catch(e) {
        setQuestions([])
      }

      try {
        const vocabData = await fetch(`${base}/vocab.json`).then(r => r.json())
        setVocab(vocabData)
      } catch(e) {
        setVocab({})
      }

      setContent(contentData.content)
      setTitle(contentData.title)

    }
    window.scrollTo(0, 0); 

    loadData()

  }, [unitNum, lesson])

  function toggleUnit(u: number) {
    setOpenUnits(prev => ({
      ...prev,
      [u]: !prev[u]
    }))
  }

  function renderBlock(obj: ContentBlock, i: number) {

    if (obj.type === "heading")
      return <h2 key={i} className="text-2xl font-bold mt-8">{obj.text}</h2>

    if (obj.type === "paragraph")
      return (
        <p
          key={i}
          className="mt-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: obj.html }}
        />
      )

    if (obj.type === "image")
      return (
        <img
          key={i}
          src={obj.src}
          className="my-6 rounded-lg shadow-md max-w-full h-auto"
        />
      )

    if (obj.type === "table")
      return (
        <div
          key={i}
          className="my-6 overflow-x-auto border rounded-lg"
          dangerouslySetInnerHTML={{ __html: obj.html }}
        />
      )

    if (obj.type === "list")
      return (
        <div
          key={i}
          className="mt-4 ml-6 list-disc"
          dangerouslySetInnerHTML={{ __html: obj.html }}
        />
      )

    return null
  }

  const currentIndex = lessons?.findIndex(l => l === lessonFolder)

  const prevLesson =
    currentIndex !== undefined && currentIndex > 0 ? 
      lessons[currentIndex - 1]
      : (unitNum > 1 ? units[unitNum-1][units[unitNum-1].length-1] : null)

  const nextLesson =
    currentIndex !== undefined && currentIndex < lessons.length-1 ? 
      lessons[currentIndex + 1]
      : (unitNum < 9 ? units[unitNum+1][0] : null)

  return (
    <div ref={contentRef} className="flex justify-center">

      {/* Floating Sidebar */}

      <div className="w-[30%] h-[50vh] border-r bg-gray-50 p-5 overflow-y-auto mt-10 ml-10">

        <h2 className="font-bold text-lg mb-6">AP Environmental Science</h2>

        {Object.entries(units).map(([u, lessons]) => {

          const unitNumber = Number(u)
          const isOpen = openUnits[unitNumber]

          return (
            <div key={u} className="mb-4">

              {/* UNIT HEADER */}

              <button
                onClick={() => toggleUnit(unitNumber)}
                className="flex text-sm items-center justify-between gap-5 w-full font-semibold py-2 px-2 rounded hover:bg-gray-200 transition"
              >
                <span>{learningModules[Number(u)-1].title}</span>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
              </button>


              {/* LESSONS */}

              <div
                className={`ml-2 overflow-hidden transition-all duration-300 ${
                  isOpen ? `max-h-${lessons.length*10} mt-2` : "max-h-0"
                }`}
              >
                <div className="space-y-1">

                  {lessons.map((l,i) => {

                    const [code] = l.split("_")

                    const isActive = lesson === l

                    return (
                      <Link
                        key={l}
                        to={`/apes/unit/${u}/${l}`}
                        className={`flex items-center justify-between text-sm px-3 py-1.5 rounded transition
                          ${
                            isActive
                              ? "bg-green-100 text-green-700 font-medium"
                              : "hover:bg-gray-200 hover:text-green-600"
                          }
                        `}
                      >
                        <span>{code} {learningModules[Number(code[0])-1].lessons[i]?.realTitle || learningModules[Number(code[0])-1].lessons[i].title}</span>
                      </Link>
                    )

                  })}

                </div>
              </div>

            </div>
          )

        })}
      </div>


      {/* Main Content */}

      <div className="flex-1 max-w-4xl p-10 relative article">

        {/* HEADER */}

        <div className="mb-10 border-b pb-6">

          <p className="text-sm text-gray-500 mb-2">
            Unit {unitNum} • Lesson {title.split(" ")[0]}
          </p>

          <h1 className="text-4xl font-bold">
            {title}
          </h1>

        </div>

        {content.map(renderBlock)}

        {/* Quiz + Vocab */}

        <div className="flex gap-4 mt-12">
          {
            questions.length > 0 &&
            (
              <button className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 hover:cursor-pointer">
                Take Quiz
              </button>
            ) 
          }

          {
            Object.keys(vocab).length > 0 &&
            (
              <button className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:cursor-pointer">
                Study Vocab
              </button>
            ) 
          }

        </div>

      </div>


      {/* Previous Button */}

      <div
        style={{ left: leftOffset, bottom: 32 }}
        className="fixed"
      >
        {prevLesson ? (
          <Link
            to={`/apes/unit/${prevLesson.split(".")[0]}/${prevLesson}`}
            className="px-5 py-3 bg-gray-900 text-white rounded-full shadow hover:bg-black"
          >
            ← Previous
          </Link>
        ) : (
          <Link
            to=""
            className="px-5 py-3 bg-gray-300 text-gray-500 rounded-full hover:cursor-not-allowed"
          >
            ← Previous
          </Link>
        )}
      </div>


      {/* Next Button */}

      <div className="fixed bottom-8 right-8">

        {nextLesson ? (

          <Link
            to={`/apes/unit/${nextLesson.split(".")[0]}/${nextLesson}`}
            className="px-5 py-3 bg-green-600 text-white rounded-full shadow hover:bg-green-700"
          >
            Next →
          </Link>

        ) : (

          <Link
            to=""
            className="px-5 py-3 bg-gray-300 text-gray-500 rounded-full hover:cursor-not-allowed"
          >
            Next →
          </Link>

        )}

      </div>

    </div>
  )
}