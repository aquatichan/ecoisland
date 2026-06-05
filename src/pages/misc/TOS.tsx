import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Globe2, Mail } from "lucide-react";

import DotField from "@/components/DotField";

const updated = "June 5, 2026";

const summaryCards = [
  {
    label: "Use Ecoisland responsibly",
    text: "Ecoisland turns sustainability into a game, but real-world actions should always be lawful, safe, respectful, and appropriate for your location.",
  },
  {
    label: "A global student community",
    text: "These terms are written for users in many regions. Local consumer, privacy, school, and safety rules may provide additional protections.",
  },
  {
    label: "Your content stays yours",
    text: "You keep ownership of posts, comments, images, and submissions, while giving Ecoisland permission to host, display, moderate, and operate them.",
  },
];

const sections = [
  {
    title: "1. Acceptance",
    body: [
      "By using Ecoisland, you agree to these Terms of Service and our Privacy Policy.",
      "If you do not agree, do not use Ecoisland.",
      "If you use Ecoisland for a school, club, organization, or team, you are responsible for making sure your use is allowed by that group and by applicable local rules.",
    ],
  },
  {
    title: "2. Eligibility And Accounts",
    body: [
      "You must provide accurate account and profile information and keep your login secure.",
      "Ecoisland is not intended for children under 13. If you are under the age required to consent to online services where you live, use Ecoisland only with permission from a parent, guardian, or authorized school contact.",
      "You are responsible for activity on your account, including posts, comments, uploads, carbon logs, AI prompts, and island customization.",
    ],
  },
  {
    title: "3. Community Rules",
    body: [
      "Be respectful. Do not harass, threaten, bully, shame, impersonate, or target people based on identity, background, location, or beliefs.",
      "Do not post illegal, hateful, sexually explicit, exploitative, graphic, misleading, spammy, or privacy-invasive content.",
      "Do not upload personal information about other people without permission, including private addresses, school IDs, faces in sensitive contexts, or contact details.",
      "Do not manipulate points, likes, Treecoins, leaderboards, rewards, AI features, or Firebase data.",
      "When documenting environmental action, follow local law, avoid trespassing, avoid unsafe cleanup attempts, and contact qualified authorities for hazards.",
    ],
  },
  {
    title: "4. User Content",
    body: [
      "You own the content you create or upload to Ecoisland, including posts, comments, images, reports, and profile text.",
      "You give Ecoisland a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, adapt for formatting, moderate, and distribute your content within the app and related Ecoisland services.",
      "You confirm that you have the rights and permissions needed for anything you upload.",
      "We may remove or restrict content if it violates these terms, creates safety or legal risk, or harms the Ecoisland community.",
    ],
  },
  {
    title: "5. Treecoins, Rewards, And Progress",
    body: [
      "Treecoins, XP, island items, ranks, badges, and similar features are virtual app features, not money, property, cryptocurrency, or guaranteed rewards.",
      "Ecoisland may adjust, remove, reset, or rebalance virtual items and progress to fix bugs, prevent abuse, or improve the app.",
      "Any real-world rewards, volunteer perks, credentials, or partner benefits may have separate requirements, availability limits, and verification rules.",
    ],
  },
  {
    title: "6. Educational And Environmental Information",
    body: [
      "Ecoisland provides environmental outreach, carbon estimates, AP Environmental Science study support, regional insights, and civic suggestions for general educational purposes.",
      "Ecoisland is not a substitute for professional, legal, environmental, emergency, academic, medical, or safety advice.",
      "Carbon calculations, AI analysis, regional data, volunteer ideas, and study materials may be incomplete or inaccurate. Check important information before relying on it.",
      "Ecoisland is not affiliated with or endorsed by the College Board unless expressly stated.",
    ],
  },
  {
    title: "7. AI Features",
    body: [
      "EcoAI, Danger Scan, Regional Data, Impact tips, and similar tools may send prompts, images, and context to third-party model providers for processing.",
      "AI responses may be incorrect, outdated, biased, or unsuitable for your situation. Use judgment and verify important outputs.",
      "Do not submit highly sensitive information, private information about other people, or content you are not allowed to share.",
    ],
  },
  {
    title: "8. Third-Party Services",
    body: [
      "Ecoisland uses services such as Firebase/Google, Vercel, OpenRouter or model providers, and OpenStreetMap/Nominatim.",
      "Those providers may have their own terms and privacy practices. Ecoisland is not responsible for third-party services outside our control.",
      "Links to outside websites, volunteer opportunities, or resources are provided for convenience and do not mean Ecoisland endorses or controls them.",
    ],
  },
  {
    title: "9. Suspension And Termination",
    body: [
      "We may suspend, restrict, or terminate accounts or content that violate these terms, create risk, or interfere with Ecoisland.",
      "You may stop using Ecoisland at any time and may contact us about account or data deletion.",
      "Some records may remain as needed for security, legal compliance, dispute resolution, backups, or legitimate operational needs.",
    ],
  },
  {
    title: "10. Disclaimers And Liability",
    body: [
      "Ecoisland is provided as is and as available. We do not promise that it will be uninterrupted, error-free, secure, or suitable for every purpose.",
      "To the maximum extent allowed by law, Ecoisland and its creators are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages.",
      "Nothing in these terms limits rights that cannot be waived under laws that apply to you, including mandatory consumer or student protections in your region.",
    ],
  },
  {
    title: "11. Changes To These Terms",
    body: [
      "We may update these terms as Ecoisland changes, as providers change, or as laws and safety expectations evolve.",
      "When we make material changes, we will update the date above and may provide notice in the app or through other reasonable means.",
      "Continuing to use Ecoisland after changes means you accept the updated terms.",
    ],
  },
];

function TermsSection({ title, body }: { title: string; body: string[] }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 backdrop-blur-md">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-300">
        {body.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  );
}

export default function TOS() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030807] text-white">
      <div className="absolute inset-0 opacity-80">
        <DotField
          dotRadius={1.6}
          dotSpacing={18}
          cursorRadius={420}
          bulgeStrength={52}
          gradientFrom="rgba(0, 200, 150, 0.42)"
          gradientTo="rgba(6, 182, 212, 0.26)"
          glowColor="#00c896"
          glowRadius={190}
          sparkle
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,200,150,0.18),transparent_34%),linear-gradient(180deg,rgba(3,8,7,0.48),#030807_76%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
        <nav className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 backdrop-blur-md transition-colors hover:border-emerald-300/50 hover:text-emerald-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link
            to="/privacy-policy"
            className="text-sm font-semibold text-slate-400 transition-colors hover:text-emerald-200"
          >
            Privacy Policy
          </Link>
        </nav>

        <header className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase text-emerald-200">
            <FileText className="h-3.5 w-3.5" />
            Terms of Service
          </div>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            Ecoisland Terms of Service
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
            These terms explain the rules for using Ecoisland as a student-centered, global sustainability community.
          </p>
          <p className="mt-3 text-sm font-semibold text-emerald-200">Last updated: {updated}</p>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          {summaryCards.map((card) => (
            <article key={card.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-4 backdrop-blur-md">
              <h2 className="text-sm font-black text-white">{card.label}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <TermsSection key={section.title} {...section} />
          ))}
        </div>

        <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-5 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase text-emerald-200">
                <Globe2 className="h-4 w-4" />
                Contact
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                Send questions about these terms, account issues, moderation decisions, or accessibility concerns to the Ecoisland team.
              </p>
            </div>
            <a
              href="mailto:aaronhanqin@gmail.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 transition-colors hover:bg-emerald-300"
            >
              <Mail className="h-4 w-4" />
              Email Us
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
