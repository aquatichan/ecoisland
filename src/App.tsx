// @ts-nocheck
import React, { Suspense, lazy } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";

// Route-level code splitting: each page loads on demand so the initial
// bundle stays small (the Impact/Island shader pages are especially heavy).
const Homepage = lazy(() => import("@/pages/Homepage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Island = lazy(() => import("@/pages/Island"));
const CarbonFootprint = lazy(() => import("@/pages/CarbonFootprint"));
const RegionalData = lazy(() => import("@/pages/RegionalData"));
const DangerScan = lazy(() => import("@/pages/DangerScan"));
const ActionFeed = lazy(() => import("@/pages/ActionFeed"));
const Impact = lazy(() => import("@/pages/Impact"));
const Settings = lazy(() => import("@/pages/Settings"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const APES = lazy(() => import("@/pages/APES"));
const LessonPage = lazy(() => import("@/pages/LessonPage"));
const PrivacyPolicy = lazy(() => import("@/pages/misc/PrivacyPolicy"));
const TOS = lazy(() => import("@/pages/misc/TOS"));

import "leaflet/dist/leaflet.css";
import "@/App.css";

function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #062d1e 0%, #020c08 70%)" }}
    >
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-t-emerald-400 border-transparent animate-spin" />
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
    <Router>
      <div className="App">
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/tos" element={<TOS />} />

          {/* App routes use Layout */}
          <Route path="/dashboard" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
          <Route path="/island" element={<Layout currentPageName="Island"><Island /></Layout>} />
          <Route path="/carbon-footprint" element={<Layout currentPageName="CarbonFootprint"><CarbonFootprint /></Layout>} />
          <Route path="/regional-data" element={<Layout currentPageName="RegionalData"><RegionalData /></Layout>} />
          <Route path="/danger-scan" element={<Layout currentPageName="DangerScan"><DangerScan /></Layout>} />
          <Route path="/action-feed" element={<Layout currentPageName="ActionFeed"><ActionFeed /></Layout>} />
          <Route path="/impact" element={<Layout currentPageName="Impact"><Impact /></Layout>} />
          <Route path="/settings" element={<Layout currentPageName="Settings"><Settings /></Layout>} />
          <Route path="/leaderboard" element={<Layout currentPageName="Leaderboard"><Leaderboard /></Layout>} />
          <Route path="/apes" element={<Layout currentPageName="APES"><APES /></Layout>} />
          <Route path="/apes/unit/:unit/:lesson" element={<Layout currentPageName="Lesson"><LessonPage /></Layout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>
    </Router>
    </ThemeProvider>
  );
}

export default App;
