import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ROUTES } from "@/app/routes";
import { RouteTransition } from "@/app/RouteTransition";
import { AppLoadingScreen } from "@/app/AppLoadingScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ToastCenter } from "@/features/notifications/ToastCenter";

const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("@/pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function App() {
  const location = useLocation();

  return (
    <ErrorBoundary fallbackTitle="SentinelX AI failed to load">
      <ToastCenter />
      <Suspense fallback={<AppLoadingScreen />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path={ROUTES.landing} element={<RouteTransition><LandingPage /></RouteTransition>} />
            <Route path={ROUTES.login} element={<RouteTransition><LoginPage /></RouteTransition>} />
            <Route path={ROUTES.signup} element={<RouteTransition><SignupPage /></RouteTransition>} />
            <Route
              path={ROUTES.dashboard}
              element={
                <ProtectedRoute>
                  <RouteTransition>
                    <DashboardPage />
                  </RouteTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.analytics}
              element={
                <ProtectedRoute>
                  <RouteTransition>
                    <AnalyticsPage />
                  </RouteTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.settings}
              element={
                <ProtectedRoute>
                  <RouteTransition>
                    <SettingsPage />
                  </RouteTransition>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RouteTransition><NotFoundPage /></RouteTransition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
