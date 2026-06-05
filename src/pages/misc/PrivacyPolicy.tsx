import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Globe2, Mail, ShieldCheck } from "lucide-react";

import DotField from "@/components/DotField";

const updated = "June 2, 2026";

const summaryCards = [
  {
    label: "Built for students globally",
    text: "Ecoisland welcomes users from many places, so this policy describes broad privacy rights while preserving local protections that may apply where you live.",
  },
  {
    label: "Minimal data, practical use",
    text: "We use account, profile, carbon, community, and AI-submitted data to run the app, personalize learning, and keep the community useful and safe.",
  },
  {
    label: "Your controls matter",
    text: "You can update profile details, make your profile less public, delete posts you created, and contact us for access, correction, deletion, or export requests.",
  },
];

const sections = [
  {
    title: "1. Information We Collect",
    body: [
      "Account information: your Google/Firebase sign-in details, such as name, email address, profile photo, and user ID.",
      "Profile information: username, bio, city, country, ZIP or postal code, preferences, avatar, privacy setting, Treecoins, XP, island items, and onboarding status.",
      "Ecoisland activity: carbon entries, action feed posts, comments, likes, images you add to posts, Danger Scan submissions, APES learning activity, and reward or progress data.",
      "AI and regional inputs: prompts, uploaded images, city or location searches, and related responses used for EcoAI, Danger Scan, Impact, and Regional Data features.",
      "Technical information: basic logs, device/browser data, security signals, and hosting or database records collected through Firebase, Vercel, and similar service providers.",
    ],
  },
  {
    title: "2. How We Use Information",
    body: [
      "Provide authentication, profiles, carbon tracking, islands, leaderboards, action feeds, learning tools, AI features, and other app functionality.",
      "Personalize your experience, including regional sustainability suggestions, city-based tips, progress views, and unit preferences.",
      "Moderate public spaces, prevent abuse, investigate security issues, and enforce our Terms of Service.",
      "Improve Ecoisland, measure usage, debug errors, and understand which features help users take real environmental action.",
      "Respond to support, legal, safety, or rights requests.",
    ],
  },
  {
    title: "3. Public Content And Visibility",
    body: [
      "Action Feed posts, comments, usernames, avatars, tags, and public profile details may be visible to other users.",
      "Your profile privacy setting can limit profile visibility, but content you post in shared spaces may still be visible to others until deleted or moderated.",
      "Do not post sensitive personal details, private addresses, school IDs, other people's personal information, or images you do not have permission to share.",
    ],
  },
  {
    title: "4. Sharing And Service Providers",
    body: [
      "We do not sell personal information. We share information only as needed to operate Ecoisland, comply with law, protect users, or support features you choose to use.",
      "Service providers may include Firebase/Google for authentication, database, and storage; Vercel for hosting; OpenRouter or model providers for AI features; and OpenStreetMap/Nominatim for location lookup.",
      "When you use AI features, prompts and uploaded images may be sent to model providers for processing. Avoid submitting highly sensitive information.",
    ],
  },
  {
    title: "5. International Use",
    body: [
      "Ecoisland is designed for a global audience. Your information may be processed in the United States and other countries where our providers operate.",
      "Privacy rights vary by region. We aim to honor applicable rights for users in the EEA, UK, Switzerland, California, and other jurisdictions with similar privacy laws.",
      "If local law gives you stronger rights than this policy describes, those rights still apply.",
    ],
  },
  {
    title: "6. Your Privacy Rights",
    body: [
      "Depending on where you live, you may request access, correction, deletion, portability, restriction, objection, or withdrawal of consent.",
      "California residents may have rights to know, access, delete, correct, opt out of sale or sharing, limit certain sensitive information uses, and be free from discrimination for exercising privacy rights.",
      "EEA, UK, and Swiss users may also have rights to object to processing, restrict processing, and complain to a data protection authority.",
      "To make a request, contact us using the email below. We may need to verify your identity before acting on the request.",
    ],
  },
  {
    title: "7. Children And Students",
    body: [
      "Ecoisland is built with students in mind, but it is not intended for children under 13.",
      "If you are under the age required to consent to online services in your region, use Ecoisland only with permission from a parent, guardian, or authorized school contact.",
      "If you believe a child provided personal information without proper permission, contact us so we can review and delete it where required.",
    ],
  },
  {
    title: "8. Retention And Security",
    body: [
      "We keep information while needed to provide Ecoisland, maintain records, resolve disputes, enforce rules, and comply with legal obligations.",
      "Posts and account data may remain until you delete them, request deletion, or they are removed through moderation or maintenance.",
      "We use reasonable technical and organizational safeguards, but no internet service can guarantee perfect security.",
    ],
  },
  {
    title: "9. Updates",
    body: [
      "We may update this policy as Ecoisland, our providers, or privacy laws change.",
      "When we make material changes, we will update the date above and may provide additional notice in the app or through reasonable means.",
    ],
  },
];

function PolicySection({ title, body }: { title: string; body: string[] }) {
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

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030807] text-white">
      <div className="absolute inset-0 opacity-80">
        <DotField
          dotRadius={1.6}
          dotSpacing={18}
          cursorRadius={420}
          bulgeStrength={52}
          gradientFrom="rgba(0, 200, 150, 0.42)"
          gradientTo="rgba(117, 205, 221, 0.26)"
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
            to="/tos"
            className="text-sm font-semibold text-slate-400 transition-colors hover:text-emerald-200"
          >
            Terms of Service
          </Link>
        </nav>

        <header className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy Policy
          </div>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            Ecoisland Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-300 sm:text-lg">
            This policy explains how Ecoisland collects, uses, shares, and protects information for a student-centered, global sustainability community.
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
            <PolicySection key={section.title} {...section} />
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
                Send privacy questions, deletion requests, accessibility concerns, or regional-rights requests to the Ecoisland team.
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
