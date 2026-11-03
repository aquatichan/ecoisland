import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { DesktopGate } from "@/components/app/DesktopGate";
import { ErrorBoundary } from "@/components/app/ErrorBoundary";
import { FullPageLoader, RequireProfile } from "@/components/app/Guards";
import { SessionProvider } from "@/lib/session";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";

const Landing = lazy(() => import("@/pages/Landing"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Today = lazy(() => import("@/pages/Today"));
const Practice = lazy(() => import("@/pages/Practice"));
const Study = lazy(() => import("@/pages/Study"));
const UnitPage = lazy(() => import("@/pages/UnitPage"));
const Lesson = lazy(() => import("@/pages/Lesson"));
const FrqList = lazy(() => import("@/pages/FrqList"));
const FrqAttempt = lazy(() => import("@/pages/FrqAttempt"));
const Flashcards = lazy(() => import("@/pages/Flashcards"));
const Guide = lazy(() => import("@/pages/Guide"));
const IslandPage = lazy(() => import("@/pages/IslandPage"));
const Classes = lazy(() => import("@/pages/Classes"));
const ClassDetail = lazy(() => import("@/pages/ClassDetail"));
const Settings = lazy(() => import("@/pages/Settings"));
const PrivacyPolicy = lazy(() => import("@/pages/misc/PrivacyPolicy"));
const TOS = lazy(() => import("@/pages/misc/TOS"));
const IslandLab = import.meta.env.DEV ? lazy(() => import("@/pages/dev/IslandLab")) : null;

function OldLessonRedirect() {
  const { unit, lesson } = useParams();
  return <Navigate to={`/study/unit/${unit}/${encodeURIComponent(lesson ?? "")}`} replace />;
}

function Gated() {
  return (
    <DesktopGate>
      <Outlet />
    </DesktopGate>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <SessionProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <Suspense fallback={<FullPageLoader />}>
                  <Routes>
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/tos" element={<TOS />} />
                    <Route element={<Gated />}>
                      <Route path="/" element={<Landing />} />
                      <Route path="/start" element={<Onboarding />} />
                      <Route element={<RequireProfile />}>
                        <Route path="/today" element={<Today />} />
                        <Route path="/practice" element={<Practice />} />
                        <Route path="/study" element={<Study />} />
                        <Route path="/study/unit/:unit" element={<UnitPage />} />
                        <Route path="/study/unit/:unit/:lesson" element={<Lesson />} />
                        <Route path="/study/frq" element={<FrqList />} />
                        <Route path="/study/frq/:frqId" element={<FrqAttempt />} />
                        <Route path="/study/flashcards" element={<Flashcards />} />
                        <Route path="/study/guide" element={<Guide />} />
                        <Route path="/island" element={<IslandPage />} />
                        <Route path="/class" element={<Classes />} />
                        <Route path="/class/:classId" element={<ClassDetail />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>
                      {IslandLab && <Route path="/dev/island" element={<IslandLab />} />}
                      {/* Older links keep working. */}
                      <Route path="/onboarding" element={<Navigate to="/start" replace />} />
                      <Route path="/dashboard" element={<Navigate to="/today" replace />} />
                      <Route path="/apes" element={<Navigate to="/study" replace />} />
                      <Route path="/apes/unit/:unit/:lesson" element={<OldLessonRedirect />} />
                      <Route path="/leaderboard" element={<Navigate to="/class" replace />} />
                      {["/action-feed", "/impact", "/regional-data", "/danger-scan", "/carbon-footprint"].map((p) => (
                        <Route key={p} path={p} element={<Navigate to="/today" replace />} />
                      ))}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </SessionProvider>
        </ToastProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
