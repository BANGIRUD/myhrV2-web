import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
  useSearchParams,
} from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/auth/ProtectedRoute";
// Ticketing portal disabled — project is HR-only.
// import PortalHome from "./pages/Portal/PortalHome";
import MasterTablePage from "./pages/Master/MasterTablePage";
import LevelPermissionsPage from "./pages/Master/LevelPermissionsPage";
import FingerPulsePage from "./pages/Reconciliation/FingerPulsePage";

/** Keep ?month=… when bouncing old /master/… bookmarks. */
function PreserveSearchRedirect({ to }: { to: string }) {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={`${to}${qs ? `?${qs}` : ""}`} replace />;
}

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              index
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/master/level-permissions"
              element={
                <ProtectedRoute>
                  <LevelPermissionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/personalia/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/department/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/group/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/section/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            {/* Reconciliation domain (parent hr_reconciliation) — not under /master */}
            <Route
              path="/reconciliation/finger-pulse"
              element={
                <ProtectedRoute>
                  <FingerPulsePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reconciliation/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            {/* Employees domain (parent hr_employees) — SIS / LS master lists */}
            <Route
              path="/employees/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            {/* Old bookmarks → English module paths */}
            <Route
              path="/master/pola-kerja"
              element={
                <PreserveSearchRedirect to="/reconciliation/work-pattern" />
              }
            />
            <Route
              path="/master/work-pattern"
              element={
                <PreserveSearchRedirect to="/reconciliation/work-pattern" />
              }
            />
            <Route
              path="/master/roster-kerja"
              element={<PreserveSearchRedirect to="/reconciliation/roster" />}
            />
            <Route
              path="/master/roster"
              element={<PreserveSearchRedirect to="/reconciliation/roster" />}
            />
            <Route
              path="/reconciliation/pola-kerja"
              element={
                <PreserveSearchRedirect to="/reconciliation/work-pattern" />
              }
            />
            <Route
              path="/reconciliation/roster-kerja"
              element={<PreserveSearchRedirect to="/reconciliation/roster" />}
            />
            <Route
              path="/reconciliation/sakit"
              element={
                <PreserveSearchRedirect to="/reconciliation/sickness" />
              }
            />
            <Route
              path="/reconciliation/ijin"
              element={<PreserveSearchRedirect to="/reconciliation/permit" />}
            />
            <Route
              path="/section/sakit"
              element={<PreserveSearchRedirect to="/section/sickness" />}
            />
            <Route
              path="/section/ijin"
              element={<PreserveSearchRedirect to="/section/permit" />}
            />
            <Route
              path="/group/sakit"
              element={<PreserveSearchRedirect to="/group/sickness" />}
            />
            <Route
              path="/group/ijin"
              element={<PreserveSearchRedirect to="/group/permit" />}
            />
            <Route
              path="/department/sakit"
              element={<PreserveSearchRedirect to="/department/sickness" />}
            />
            <Route
              path="/department/ijin"
              element={<PreserveSearchRedirect to="/department/permit" />}
            />
            <Route
              path="/personalia/sakit"
              element={<PreserveSearchRedirect to="/personalia/sickness" />}
            />
            <Route
              path="/personalia/ijin"
              element={<PreserveSearchRedirect to="/personalia/permit" />}
            />

            <Route
              path="/master/:resource"
              element={
                <ProtectedRoute>
                  <MasterTablePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfiles />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* <Route path="/portal" element={<PortalHome />} /> */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
