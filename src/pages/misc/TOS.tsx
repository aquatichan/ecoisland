import { LegalLayout, type Section } from "./LegalLayout";

const summary = [
  { label: "Study honestly", text: "Treecoins, streaks and leaderboards only mean something if they reflect real work. Don't try to game them." },
  { label: "Be kind in class", text: "Chat, field notes and usernames are visible to your class. Keep them respectful and about what you learned." },
  { label: "Your work is yours", text: "You own what you write. You let Ecoisland store and show it to your class so the app can work." },
];

const sections: Section[] = [
  {
    title: "1. Acceptance",
    body: [
      "By using Ecoisland you agree to these Terms of Service and to our Privacy Policy. If you don't agree, don't use Ecoisland.",
      "If you use Ecoisland through a school or class, make sure your use is allowed by your school and by local rules.",
    ],
  },
  {
    title: "2. Accounts",
    body: [
      "Sign in with your own Google account, keep it secure, and pick a username that isn't offensive or someone else's name.",
      "Ecoisland is not intended for children under 13. If you are under the age required to consent to online services where you live, use Ecoisland only with permission from a parent, guardian or your school.",
      "You are responsible for activity on your account, including answers, field notes and island customization.",
    ],
  },
  {
    title: "3. Teachers and classes",
    body: [
      "Anyone can create a teacher account. If you create a class, use it only for teaching, share its join code only with your students, and use what you see about students only to support their learning.",
      "Teachers can post assignments and class events, see class progress, verify volunteer hours, remove students from a class, and remove field notes.",
      "Class chat is off until the teacher turns it on. Teachers can read every message, delete messages, and mute students. Only verify volunteer hours you have reason to believe are accurate.",
      "Students can leave a class at any time from the class page.",
    ],
  },
  {
    title: "4. Community rules",
    body: [
      "Be respectful. Do not harass, bully, threaten or impersonate anyone, or target people for who they are.",
      "Do not post illegal, hateful, sexual, graphic, misleading or spammy content, or other people's personal information.",
      "Do not try to manipulate Treecoins, XP, streaks, leaderboards, assignments, grading or the database, or to access data that isn't yours.",
      "Field quests, eco actions and volunteer events happen in the real world. Follow local laws, stay safe, don't trespass, and leave wildlife and hazards to the professionals.",
      "Don't log volunteer hours you didn't do. Teachers may decline entries, and hours that turn out to be false can be removed.",
    ],
  },
  {
    title: "5. Events, eco actions and ambassadors",
    body: [
      "Community events listed in Act are run by the organizations named on them, not by Ecoisland. We don't supervise them or guarantee their safety, accuracy or that they happen. Check details with the organizer before you go.",
      "If you're under 18, get permission from a parent or guardian before attending any event, and bring a friend or a trusted adult.",
      "If you post a listing, keep it accurate, only share contact details you're allowed to share, and cancel it if plans change. Listings from people who aren't admins or ambassadors are reviewed before they appear.",
      "Ambassadors are approved by the Ecoisland team and can post community listings directly. We may remove ambassador status or listings at any time.",
    ],
  },
  {
    title: "6. Your content",
    body: [
      "You own what you write in Ecoisland, such as free-response answers and field notes.",
      "You give Ecoisland a worldwide, non-exclusive, royalty-free license to store, display and process that content to run the app, including showing chat messages and field notes to your class, showing listings you post, and sending FRQ answers for grading.",
      "We may remove content that breaks these terms or puts people at risk.",
    ],
  },
  {
    title: "7. Treecoins, XP and islands",
    body: [
      "Treecoins, XP, streaks, islands, decorations and landmarks are virtual features of the app. They are not money or property and cannot be exchanged for anything outside Ecoisland.",
      "We may adjust, rebalance or reset virtual items and progress to fix bugs, prevent abuse or improve the app. When we retired the original island shop, everything students had bought was refunded in Treecoins.",
    ],
  },
  {
    title: "8. Learning content and AI grading",
    body: [
      "Ecoisland's lessons, questions and FRQs are study aids for AP Environmental Science. They may contain mistakes, and they are not official College Board materials. Ecoisland is not affiliated with or endorsed by the College Board.",
      "FRQ scores are produced by AI against a rubric and can be wrong. Use the feedback to practice, and treat your teacher's grading as the one that counts.",
    ],
  },
  {
    title: "9. Third-party services",
    body: [
      "Ecoisland runs on Google Firebase, Cloudflare and Google Gemini, which have their own terms and privacy practices.",
      "Links to outside websites are provided for convenience and don't mean we endorse or control them.",
    ],
  },
  {
    title: "10. Suspension and termination",
    body: [
      "We may suspend or remove accounts or content that break these terms or put Ecoisland or its users at risk.",
      "You can stop using Ecoisland at any time and delete your account in Settings.",
    ],
  },
  {
    title: "11. Disclaimers and liability",
    body: [
      "Ecoisland is provided as is and as available. We don't promise it will always be available, error-free or suitable for every purpose.",
      "To the fullest extent the law allows, Ecoisland and its creators are not liable for indirect, incidental, special, consequential or punitive damages.",
      "Nothing in these terms limits rights that the law says can't be waived, including consumer and student protections where you live.",
    ],
  },
  {
    title: "12. Changes to these terms",
    body: ["We may update these terms as Ecoisland changes. We'll update the date above for material changes. Continuing to use Ecoisland means you accept the updated terms."],
  },
];

export default function TOS() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro="The rules for using Ecoisland as a student or a teacher."
      updated="November 3, 2026"
      summary={summary}
      sections={sections}
      other={{ to: "/privacy-policy", label: "Privacy Policy" }}
      footer="Questions about these terms, your account, moderation or accessibility? Email the Ecoisland team."
    />
  );
}
