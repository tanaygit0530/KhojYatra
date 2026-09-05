import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSessionStore } from './store/sessionStore';
import LandingPage from './pages/Landing';
import AuthPage from './pages/Auth';
import TravelerApp from './pages/app/TravelerApp';
import ItineraryPage from './pages/app/ItineraryPage';
import ProviderApp from './pages/provider/ProviderApp';
import ProviderOnboardingPage from './pages/provider/Onboarding';
import DesignSystemPage from './pages/DesignSystem';
import AdminIngestionQueue from './pages/admin/AdminIngestionQueue';
import PublicShareView from './pages/share/PublicShareView';

export const App: React.FC = () => {
  const initializeSession = useSessionStore((state) => state.initializeSession);

  useEffect(() => {
    // Initialize or restore client-side session UUID
    initializeSession();
  }, [initializeSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/itinerary" element={<ItineraryPage />} />
        <Route path="/app/itinerary" element={<ItineraryPage />} />
        <Route path="/saved" element={<TravelerApp defaultTab="saved" />} />
        <Route path="/messages" element={<TravelerApp defaultTab="messages" />} />
        <Route path="/settings" element={<TravelerApp defaultTab="settings" />} />
        <Route path="/app/saved" element={<TravelerApp defaultTab="saved" />} />
        <Route path="/app/messages" element={<TravelerApp defaultTab="messages" />} />
        <Route path="/app/settings" element={<TravelerApp defaultTab="settings" />} />
        <Route path="/app" element={<TravelerApp />} />
        <Route path="/app/*" element={<TravelerApp />} />
        <Route path="/provider/onboarding" element={<ProviderOnboardingPage />} />
        <Route path="/provider/*" element={<ProviderApp />} />
        <Route path="/admin/ingestion-queue" element={<AdminIngestionQueue />} />
        <Route path="/share/:token" element={<PublicShareView />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
