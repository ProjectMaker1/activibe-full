// frontend/src/App.jsx
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import HomePage from './routes/HomePage.jsx';
import CampaignsPage from './routes/CampaignsPage.jsx';
import ChatBotPage from './routes/ChatBotPage.jsx';
import UploadPage from './routes/UploadPage.jsx';
import LoginPage from './routes/LoginPage.jsx';
import SignupPage from './routes/SignupPage.jsx';
import AdminPanelPage from './routes/AdminPanelPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import IntroLogoOverlay from './components/IntroLogoOverlay.jsx';
import AboutPage from "./routes/AboutPage";
import ContactPage from "./routes/ContactPage";
import PrivacyPage from "./routes/PrivacyPage";
import ScrollToTop from "./components/ScrollToTop.jsx";
function App() {
  // light / dark theme toggle
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // ✅ Intro overlay state (პირველ შესვლაზე/refresh-ზე)
  const [introActive, setIntroActive] = useState(true);

  // ❌ ბექგრაუნდის ფოტოები ამოვიღეთ, მარტო ფერი დავტოვეთ
  const rootStyle =
    theme === 'light'
      ? { backgroundColor: '#fff3d3' }
      : { backgroundColor: '#3b213d' };

  // theme class – რომ CSS ცვლადები შევცვალოთ
  const rootClassName =
    theme === 'light' ? 'app-root theme-light' : 'app-root theme-dark';

  return (
    <AuthProvider>
      <div className={rootClassName} style={rootStyle}>
        {/* ✅ Intro overlay (blur + animated logo draw + move to navbar logo-slot) */}
        {introActive && (
          <IntroLogoOverlay onDone={() => setIntroActive(false)} />
        )}

        {/* ✅ Navbar-ს ვაწვდით introActive-ს, რომ static logo დამალოს სანამ intro მიდის */}
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
          introActive={introActive}
        />

        <main className="app-main">
            <ScrollToTop />

          <Routes>
            <Route path="/" element={<HomePage theme={theme} />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/:id" element={<CampaignsPage />} />
            <Route path="/chatbot" element={<ChatBotPage />} />
<Route path="/about" element={<AboutPage />} />
<Route path="/contact" element={<ContactPage />} />
<Route path="/privacy" element={<PrivacyPage />} />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPanelPage />
                </ProtectedRoute>
              }
            />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;