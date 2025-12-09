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

function App() {
  // light / dark theme toggle
  const [theme, setTheme] = useState('light'); // 'light' | 'dark'

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // ❌ ბექგრაუნდის ფოტოები ამოვიღეთ, მარტო ფერი დავტოვეთ
  const rootStyle =
    theme === 'light'
      ? {
          backgroundColor: '#fff3d3',
        }
      : {
          backgroundColor: '#3b213d',
        };

  // theme class – რომ CSS ცვლადები შევცვალოთ
  const rootClassName =
    theme === 'light' ? 'app-root theme-light' : 'app-root theme-dark';

  return (
    <AuthProvider>
      <div className={rootClassName} style={rootStyle}>
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
        <main className="app-main">
          <Routes>
          <Route path="/" element={<HomePage theme={theme} />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/chatbot" element={<ChatBotPage />} />

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
