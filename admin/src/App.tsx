import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { AcceptInvite } from './pages/AcceptInvite';
import { Account } from './pages/Account';
import { AdminDetail } from './pages/AdminDetail';
import { Admins } from './pages/Admins';
import { Audit } from './pages/Audit';
import { Home } from './pages/Home';
import { Login } from './pages/Login';

function RequireSession({ superOnly = false, children }: { superOnly?: boolean; children: JSX.Element }) {
  const { me } = useAuth();
  const location = useLocation();
  if (me === undefined) return <Loading label="Checking your session…" />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (superOnly && me.role !== 'SUPER_ADMIN') return <NotFound />;
  return children;
}

function NotFound() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p className="muted">It may have moved, or you may not have access to it.</p>
      <Link to="/">Back to overview</Link>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route
            element={
              <RequireSession>
                <Layout />
              </RequireSession>
            }
          >
            <Route index element={<Home />} />
            <Route path="admins" element={<RequireSession superOnly><Admins /></RequireSession>} />
            <Route path="admins/:id" element={<RequireSession superOnly><AdminDetail /></RequireSession>} />
            <Route path="audit" element={<Audit />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
