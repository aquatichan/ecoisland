// @ts-nocheck
import React from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/Layout";

import Homepage from "@/pages/Homepage";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Island from "@/pages/Island";
import CarbonFootprint from "@/pages/CarbonFootprint";
import RegionalData from "@/pages/RegionalData";
import DangerScan from "@/pages/DangerScan";
import ActionFeed from "@/pages/ActionFeed";
import Impact from "@/pages/Impact";
import Settings from "@/pages/Settings";
import Leaderboard from "@/pages/Leaderboard";
import APES from "@/pages/APES";
import LessonPage from "@/pages/LessonPage";

import PrivacyPolicy from "@/pages/misc/PrivacyPolicy";
import TOS from "@/pages/misc/TOS";

import "leaflet/dist/leaflet.css";
import "@/App.css";

function App() {
  return (
    <ThemeProvider>
    <Router>
      <div className="App">
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
      </div>
    </Router>
    </ThemeProvider>
  );
}

export default App;
