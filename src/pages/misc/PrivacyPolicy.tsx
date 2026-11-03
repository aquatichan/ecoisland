import { LegalLayout, type Section } from "./LegalLayout";

const summary = [
  { label: "What we collect", text: "Your Google sign-in details, your profile, what you do while studying, and what you post: class chat messages, field notes, event RSVPs and volunteer hours." },
  { label: "Who sees it", text: "You. Your teacher sees your progress and your class's chat, and classmates see your username, island, stats and messages. Nobody sees your email." },
  { label: "How long we keep it", text: "Class chat messages are deleted after 90 days and chat safety records after a year. Everything else stays until you delete it or your account." },
  { label: "Your control", text: "Edit your profile, leave a class, or delete your account and its data from Settings at any time." },
];

const sections: Section[] = [
  {
    title: "1. Information we collect",
    body: [
      "Account information: the name, email address, profile photo and user ID that come with your Google sign-in.",
      "Profile information: your username, profile picture, whether you're a student or a teacher, your island's name and decorations, and preferences such as light or dark mode.",
      "Study activity: daily sets, quiz scores, lessons you mark as read, free-response answers and their scores, field notes you write, streaks, XP, Treecoins and shop purchases.",
      "Class information: the classes you join or teach, assignments, due dates and whether each assignment is complete.",
      "Class chat: messages you post in a class chat and when you posted them. There are no private messages: everything in a class chat is visible to the whole class and its teacher.",
      "Chat safety records: when a message is reported (with the reason and who reported it), deleted, kept after review, blocked before posting for harassment, or flagged because it suggests a student may be at risk, and when a student is muted or removed or chat is switched on or off. These records keep a copy of the message text.",
      "Act: events and eco actions you post or suggest (including the organizer contact details you enter), events you RSVP to, eco action write-ups, and volunteer hours you log: the activity, organization, date, hours, your description, the teacher you ask to verify them, when you submitted it, automatic checks on it (for example, a possible duplicate or an unusually long day), and when and by whom it was verified or declined.",
      "Ambassador applications: if you apply, your full name, school, grade, city or region, your answers, an optional sponsor name and your account email.",
      "Technical information: basic logs, browser and device details, security signals, and product analytics events (for example, that a daily set was completed) collected through Firebase, Google Analytics for Firebase and Cloudflare.",
    ],
  },
  {
    title: "2. How we use information",
    body: [
      "To run Ecoisland: save your progress, grow your island, score quizzes, build your daily sets and keep your streak.",
      "To let teachers support you: your teacher sees how you're doing in their class so they can assign work and help.",
      "To run class chat and Act: show messages to your class, show listings and RSVP counts, let your teacher verify your volunteer hours, and let our team review community listings and ambassador applications.",
      "To keep class chat safe: check messages for profanity, harassment, contact details, personal information and outside links before they're posted, and give teachers a record of moderation so they can follow up. If a message suggests a student may be at risk of harm, it is shown to their teacher straight away and the student is shown crisis resources. Ecoisland does not monitor chat in real time and is not an emergency service.",
      "To grade free-response answers with AI against each question's rubric.",
      "To keep things fair and safe: prevent cheating, abuse and spam, and investigate security problems.",
      "To improve Ecoisland: we look at overall usage, such as how many students finish a daily set, to decide what to build next.",
    ],
  },
  {
    title: "3. Who can see what",
    body: [
      "Teachers of a class you join can see your username, profile picture, streak, last active day, weekly XP and daily sets, unit quiz bests, number of lessons read, assignment completion and scores, your island, and the field notes you write.",
      "Teachers also see your class chat messages, who RSVP'd to their class events, and the volunteer hours you ask them to verify, including any automatic checks on them.",
      "Only the teacher (and Ecoisland admins, when investigating a safety concern) can see a class's chat safety records, including who reported a message. Classmates can see that a message was reported, but not by whom.",
      "Classmates can see your username, profile picture, your island, your class leaderboard stats, your field notes and your chat messages.",
      "Listings you post for everyone on Ecoisland show your username as the poster, along with the organizer contact details you entered. Your RSVPs to community events are visible to you and to Ecoisland admins, not to other users.",
      "Ambassador applications are visible only to you and to the Ecoisland team.",
      "Your email address is never shown to teachers or classmates. People who are not in your class cannot see your progress.",
      "Leaving a class, or being removed by the teacher, deletes your assignment records, field notes, chat messages and event RSVPs from that class.",
    ],
  },
  {
    title: "4. Sharing and service providers",
    body: [
      "We do not sell personal information. We share information only to run Ecoisland, to comply with the law, or to protect users.",
      "Our providers are Google Firebase (sign-in, database, file storage and analytics), Cloudflare (hosting) and Google Gemini (FRQ grading). When you submit an FRQ, your answers and the question's rubric are sent to Gemini to be scored.",
      "Ecoisland is used in many places, so your information may be processed in the United States and other countries where these providers operate.",
    ],
  },
  {
    title: "5. Your privacy rights",
    body: [
      "Depending on where you live, you may have the right to access, correct, delete or export your information, or to object to or restrict how it is used.",
      "California residents may have rights to know, access, delete and correct personal information, and to not be discriminated against for using these rights. EEA, UK and Swiss users may also complain to their data protection authority.",
      "To make a request, email us. We may need to confirm your identity first. If local law gives you stronger rights than this policy describes, those rights still apply.",
    ],
  },
  {
    title: "6. Children and students",
    body: [
      "Ecoisland is built for high school students and their teachers. It is not intended for children under 13.",
      "If you are under the age required to consent to online services where you live, use Ecoisland only with permission from a parent, guardian or your school.",
      "If you believe a child gave us personal information without the right permission, contact us and we will review and delete it where required.",
    ],
  },
  {
    title: "7. Retention, deletion and security",
    body: [
      "We keep information for as long as it's needed to run Ecoisland and meet legal obligations, with these limits:",
      "Class chat messages are deleted automatically 90 days after they're posted. Chat safety records are deleted automatically one year after they're made. Both are deleted right away if the class is deleted. A daily job enforces these limits.",
      "Because safety records exist to protect students, they stay for their full year even if the message's author deletes the message, leaves the class or deletes their account.",
      "Verified volunteer hours stay on your record until you delete your account; they can't be edited afterwards, and only unverified entries can be deleted by you.",
      "Deleting your account in Settings removes your profile, study history, class memberships, assignment records, field notes, chat messages, mutes and removals, RSVPs, volunteer hours and any ambassador application. If you teach, your classes are deleted too. Community listings you published stay up for the organizations running them, with your name removed. Chat safety records about your messages are kept until they expire, as described above.",
      "Teachers can delete any message in their class chat. Messages in a deleted class are deleted with it.",
      "We use reasonable safeguards: every answer is checked and every change to Treecoins, XP and progress is made by our server, chat messages pass safety checks, mutes and removals can't be undone by rejoining a class, and database rules stop anyone from reading another student's private information. No online service can promise perfect security.",
    ],
  },
  {
    title: "8. Updates",
    body: ["We may update this policy as Ecoisland or the law changes. When we make material changes, we will update the date above and may also tell you in the app."],
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="How Ecoisland collects, uses, shares and protects information for students and teachers."
      updated="November 3, 2026"
      summary={summary}
      sections={sections}
      other={{ to: "/tos", label: "Terms of Service" }}
      footer="Questions, deletion requests, accessibility concerns or regional rights requests? Email the Ecoisland team."
    />
  );
}
