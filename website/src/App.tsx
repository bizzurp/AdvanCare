import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { PlansPage } from './pages/PlansPage';
import { ProgramPage } from './pages/ProgramPage';
import { DonatePage } from './pages/DonatePage';
import { ContactPage } from './pages/ContactPage';
import { MotionLayer } from './components/MotionLayer';

// Scroll to top or anchor on route change
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    // Jump instantly: a new page should not visibly scroll up from the old position.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}

// Re-keys the page on navigation so each route fades in.
function RouteView({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="route-view">
      {children}
    </div>
  );
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <MotionLayer />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <RouteView>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/program" element={<ProgramPage />} />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/contact" element={<ContactPage />} />
            {/* Fallback to Home */}
            <Route path="*" element={<HomePage />} />
          </Routes>
          </RouteView>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
