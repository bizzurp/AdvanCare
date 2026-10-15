import { useEffect, useRef } from 'react';
import { CaregiverHome, CaregiverShiftScreen } from './screens/CaregiverMode';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './state/AppState';
import { Help, Onboarding, SignIn, Welcome } from './screens/Auth';
import { Register } from './screens/Register';
import { Home, More, Plans, Services } from './screens/Main';
import { EditProfile, FamilyMemberScreen, PlanEnroll, Profile, Settings } from './screens/Account';
import { ChooseDoctor, RhuServices, TeleHealth, Triage } from './screens/Modules';
import { CaregiverRequest, EditVisit, Prescription, PrescriptionReview, Transport } from './screens/Care';
import { RequestDetail, RequestReceived, RequestsList } from './screens/Requests';
import { Dashboard, ExportReport, PrintRecords, Reports, ServiceRecords, ServiceTrends } from './screens/Reports';
import { Assistant } from './screens/Assistant';
import { ErrorBoundary } from './components/ErrorBoundary';

/** Moves focus to the new screen's heading and resets scroll after navigation. */
function RouteFocus() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-autofocus], h1');
      el?.setAttribute('tabindex', '-1');
      el?.focus({ preventScroll: true });
    });
  }, [pathname]);
  return null;
}

function RequireAuth() {
  const { session } = useApp();
  const location = useLocation();
  if (!session) return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function Entry() {
  const { session, onboarded } = useApp();
  return <Navigate to={session ? (session.role === 'caregiver' ? '/caregiver' : '/home') : onboarded ? '/sign-in' : '/welcome'} replace />;
}

export default function App() {
  return (
    <HashRouter>
      <RouteFocus />
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Entry />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/help" element={<Help />} />
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<Home />} />
          <Route path="/caregiver" element={<CaregiverHome />} />
          <Route path="/caregiver/shift/:id" element={<CaregiverShiftScreen />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/telehealth" element={<TeleHealth />} />
          <Route path="/services/telehealth/doctors" element={<ChooseDoctor />} />
          <Route path="/services/rhu" element={<RhuServices />} />
          <Route path="/services/triage" element={<Triage />} />
          <Route path="/services/prescription" element={<Prescription />} />
          <Route path="/services/prescription/review" element={<PrescriptionReview />} />
          <Route path="/services/transport" element={<Transport />} />
          <Route path="/services/home-caregiver" element={<CaregiverRequest kind="home-caregiver" key="home" />} />
          <Route path="/services/cvmc-caregiver" element={<CaregiverRequest kind="cvmc-caregiver" key="cvmc" />} />
          <Route path="/services/:kind/visit" element={<EditVisit />} />
          <Route path="/request-received/:id" element={<RequestReceived />} />
          <Route path="/requests" element={<RequestsList />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/records" element={<ServiceRecords />} />
          <Route path="/reports/records/export" element={<ExportReport />} />
          <Route path="/reports/records/print" element={<PrintRecords />} />
          <Route path="/reports/trends" element={<ServiceTrends />} />
          <Route path="/reports/dashboard" element={<Dashboard />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/more" element={<More />} />
          <Route path="/profile" element={<Profile tab="client" />} />
          <Route path="/profile/family" element={<Profile tab="family" />} />
          <Route path="/profile/family/:id" element={<FamilyMemberScreen />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/:planId" element={<PlanEnroll />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Entry />} />
      </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
}
