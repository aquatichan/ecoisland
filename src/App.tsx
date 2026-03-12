// @ts-nocheck
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "@/Layout";

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
import LessonPage from "./pages/LessonPage"

import "leaflet/dist/leaflet.css";
import "@/App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Onboarding Route */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Other routes use Layout.tsx */}
          <Route
            path="/dashboard"
            element={
              <Layout currentPageName="Dashboard">
                <Dashboard />
              </Layout>
            }
          />

          <Route
            path="/island"
            element={
              <Layout currentPageName="Island">
                <Island />
              </Layout>
            }
          />

          <Route
            path="/carbon-footprint"
            element={
              <Layout currentPageName="CarbonFootprint">
                <CarbonFootprint />
              </Layout>
            }
          />

          <Route
            path="/regional-data"
            element={
              <Layout currentPageName="RegionalData">
                <RegionalData />
              </Layout>
            }
          />

          <Route
            path="/danger-scan"
            element={
              <Layout currentPageName="DangerScan">
                <DangerScan />
              </Layout>
            }
          />

          <Route
            path="/action-feed"
            element={
              <Layout currentPageName="ActionFeed">
                <ActionFeed />
              </Layout>
            }
          />

          <Route
            path="/impact"
            element={
              <Layout currentPageName="Impact">
                <Impact />
              </Layout>
            }
          />

          <Route
            path="/settings"
            element={
              <Layout currentPageName="Settings">
                <Settings />
              </Layout>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <Layout currentPageName="Leaderboard">
                <Leaderboard />
              </Layout>
            }
          />

          <Route
            path="/apes"
            element={
              <Layout currentPageName="APES">
                <APES />
              </Layout>
            }
          />

          <Route
            path="/apes/unit/:unit/:lesson"
            element={
              <Layout currentPageName="Lesson">
                <LessonPage />
              </Layout>
            }
          />

          {/* Default redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
