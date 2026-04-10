import { createContext, useContext, useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

const DARK_KEY = (userId) => `scn_dark_mode_${userId}`;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { setDarkMode } = useTheme();

    // CRITICAL: Use empty string to use Vite proxy (works on laptop AND phone)
    const API_BASE = '';

    // Check if user is already logged in on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Verify token with backend
            fetch(`${API_BASE}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        setUser(data.user);
                        setDarkMode(localStorage.getItem(DARK_KEY(data.user.id)) === 'true');
                    } else {
                        localStorage.removeItem('token');
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('token', data.token);
            setUser(data.user);
            setDarkMode(localStorage.getItem(DARK_KEY(data.user.id)) === 'true');

            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setDarkMode(false);
    };

    const register = async (email, password, fullName, role = 'student') => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                    role: role
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Staff accounts are pending approval — no token issued yet
            if (data.pending) {
                return data; // caller checks data.pending to show the right message
            }

            // Store token
            localStorage.setItem('token', data.token);

            // Set user
            setUser(data.user);

            return data;
        } catch (error) {
            throw error;
        }
    };

    const forgotPassword = async (email) => {
        const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    };

    const resetPassword = async (token, password) => {
        const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Reset failed');
        return data;
    };

    const changePassword = async (currentPassword, newPassword) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to change password');
        return data;
    };

    const updateProfile = async (full_name) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/auth/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ full_name }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update profile');
        setUser(data.user);
        return data;
    };

    const value = {
        user,
        loading,
        login,
        logout,
        register,
        forgotPassword,
        resetPassword,
        changePassword,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
