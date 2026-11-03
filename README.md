# 🌿 Ecoisland 🏝️

> **Learn it, then go do it.**

> **All for a greener future.** 

Ecoisland is AP Environmental Science five minutes a day, plus real environmental action. Students answer a short daily set built on spaced repetition, finish the work their teacher assigns, take what they learned outside with eco actions and volunteer events, and grow an island that thrives when they show up and wilts when they don't.

<img width="1200" alt="Ecoisland" src="public/og.png" />

## 📄 Core Features

- **Daily set.** Ten questions from the class's current unit, mixed with reviews of anything the student missed before (a Leitner spaced-repetition schedule). It keeps the streak alive and keeps the island watered.
- **The island.** Drawn in SVG from the student's real progress. XP grows plants through six stages; every unit mastered at 70% adds a landmark from that unit, and missed days dry the island out until the next daily set. Treecoins buy skies and decorations.
- **Teachers.** Create a class, share a six-character code, and assign lessons, lesson or unit quizzes, FRQs, daily sets, or field quests with due dates. Completion fills in automatically as students do the work. Set the current unit and test date to focus every student's practice.
- **Study.** 9 units, 108 lessons, 1,221 practice questions, 27 FRQs graded part by part against a rubric, flashcards, and an exam guide. Every answer is checked on the server, so students can't fake scores from the browser.
- **Act.** Volunteer events and eco actions as upcoming, current, and past. Students RSVP, add events to their calendar, contact the organizer, and log volunteer hours that their teacher verifies onto a printable service record. Teachers schedule any of 12 eco actions (each tied to an APES unit) in one click; write-ups land in the class's field notes.
- **Class chat.** One room per class, off until the teacher turns it on. The teacher can delete any message, mute students, and review reports. Every message passes a language filter (tuned so course words like "assessment" and "Fukushima" get through) and flood limits.
- **Ambassadors.** Students and educators apply in the app. Approved ambassadors post community events for their area directly; anyone else's community post is a suggestion an admin reviews first.

Ecoisland is built for laptops, Chromebooks, and desktops. For now, windows narrower than 1024px will see a short "needs a bigger screen" page.

## 🖥️ Tech Stack

| Area | Technology |
|---|---|
| App | Vite, React 19, TypeScript, Tailwind CSS v4, framer-motion |
| Effects | Selected [React Bits](https://reactbits.dev) components (see `THIRD_PARTY_NOTICES.md`) |
| Auth & data | Firebase Authentication (Google), Firestore, Storage |
| API | Cloudflare Worker (`worker/`): verifies Firebase ID tokens and makes every write that is worth something |
| AI | Gemini, server-side only, for FRQ grading |
| Hosting | Cloudflare Workers at https://ecoisland.xyz |

### ⚙️ Repo Structure

- `src/shared/` is shared by the app and the Worker: curriculum, reward economy, island growth, shop catalog, assignment rules, Act limits, and the eco action catalog.
- `worker/` is the API: scored practice attempts, rewards, purchases, classes, chat, Act (events, RSVPs, hours, ambassadors), FRQ grading, account deletion, and reminders.
- `content/` holds the full question banks and FRQs, **with answers and rubrics**. `pnpm content` builds the answer-free copies in `public/` and the server-only key in `worker/generated/content.ts`. Run it after editing anything in `content/`; a unit test fails if they drift. Note that anyone who can read this repository can read `content/`, so keep the repository private if the answer key matters to you.
- `firestore.rules` and `storage.rules`: the browser can only change a student's own profile, cosmetic choices and spaced-repetition state (and a teacher's own class settings and assignments). The Worker writes Treecoins, XP, streaks, progress, class membership, submissions, chat messages, listings, RSVPs, and hours.
- `src/components/island/` is the island illustration: plants, decorations, landmarks, and skies.

## ⚠️ Browser Support

Tested in Chromium (Chrome, Edge, Chromebooks). I removed the code that kept older versions from working in Safari and Firefox, but those browsers weren't part of this round of testing. Tailwind CSS v4 needs Safari 16.4+, Chrome 111+, or Firefox 128+.

## 💡 Why Ecoisland?

> Many students understand that environmental sustainability is important—but few feel personally connected to it.

> As a current high school student myself, I understand how my generation learns and engages best: through games, social media, and interactive technology rather than traditional awareness campaigns.

> Ecoisland encompasses these means into a platform where conservation becomes something people genuinely want to participate in.

> By turning small, everyday actions into visible progress and meaningful rewards, Ecoisland encourages habits that collectively create real environmental impact.

🎥 Original demo (2025 Congressional App Challenge): [Click me!](https://www.youtube.com/watch?v=m4QyoFBDeEc)
