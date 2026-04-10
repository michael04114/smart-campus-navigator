import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import TimetablePage from './pages/TimetablePage';
import App from './App';

export default function AppWrapper() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                    {/* Authenticated users */}
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/timetable" element={<TimetablePage />} />

                    {/* Campus Navigator - OPEN TO EVERYONE (guests + logged in users) */}
                    <Route path="/navigator" element={<App />} />
                </Routes>
            </AuthProvider>
        </ThemeProvider>
    );
}
