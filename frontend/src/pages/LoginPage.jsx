import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/navigator');
        } catch (err) {
            // Comprehensive error messages
            if (err.message.includes('timeout') || err.message.includes('AbortError')) {
                setError('⏱️ Server timeout. Please check your connection and try again.');
            } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                setError('🔌 Cannot connect to server. Please check your internet connection.');
            } else if (err.message.includes('pending_approval')) {
                setError('⏳ Your staff account is pending admin approval. Please check back later or contact an administrator.');
            } else if (err.message.includes('401') || err.message.includes('Invalid')) {
                setError('❌ Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }

    async function handleTestLogin(testEmail, testPassword) {
        setEmail(testEmail);
        setPassword(testPassword);
        setError('');
        setIsLoading(true);

        try {
            await login(testEmail, testPassword);
            navigate('/navigator');
        } catch (err) {
            // Comprehensive error messages
            if (err.message.includes('timeout') || err.message.includes('AbortError')) {
                setError('⏱️ Server timeout. Please check your connection and try again.');
            } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                setError('🔌 Cannot connect to server. Please check your internet connection.');
            } else if (err.message.includes('pending_approval')) {
                setError('⏳ Your staff account is pending admin approval. Please check back later or contact an administrator.');
            } else if (err.message.includes('401') || err.message.includes('Invalid')) {
                setError('❌ Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <style>{`
                html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; }
                #root { width:100%; height:100%; }

                /* Full-page scroll container */
                .login-page {
                    display: flex;
                    min-height: 100vh;
                    width: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: fixed;
                    inset: 0;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }

                /* Left column */
                .login-col {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 40px;
                    min-height: 100%;
                }

                /* Card */
                .login-card {
                    width: 100%;
                    max-width: 480px;
                    background: rgba(255,255,255,0.97);
                    border-radius: 24px;
                    padding: 48px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }

                /* Right decorative column */
                .login-right {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 80px;
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
                }

                /* Inputs / buttons */
                .lp-input {
                    width: 100%;
                    padding: 14px 16px;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 15px;
                    outline: none;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .lp-btn-primary {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(102,126,234,0.4);
                    transition: all 0.2s;
                }
                .lp-btn-primary:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
                .lp-btn-test {
                    width: 100%;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid;
                }

                /* ── Mobile ── */
                @media (max-width: 768px) {
                    input, select, textarea { font-size: 16px !important; }
                    .login-right { display: none !important; }
                    .login-col { padding: 32px 20px 48px; justify-content: flex-start; }
                    .login-card { padding: 32px 20px; border-radius: 20px; }
                    .lp-btn-primary, .lp-btn-test { min-height: 48px; font-size: 16px !important; }
                }
            `}</style>

            <div className="login-page">
                {/* ── Left: form ── */}
                <div className="login-col">
                    <div className="login-card">
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '36px', fontWeight: '800', background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px 0', letterSpacing: '-1px' }}>
                                Welcome Back
                            </h1>
                            <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
                                Sign in to continue to Smart Campus Navigator
                            </p>
                        </div>

                        {error && (
                            <div style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#dc2626', fontSize: '14px', marginBottom: '20px', textAlign: 'center', lineHeight: 1.5 }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Email Address</label>
                                <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="you@salford.ac.uk" required disabled={isLoading}
                                    style={{ background: isLoading ? '#f1f5f9' : 'white' }}
                                    onFocus={e => e.target.style.borderColor = '#667eea'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Password</label>
                                    <button type="button" onClick={() => navigate('/forgot-password')}
                                        style={{ background: 'none', border: 'none', color: '#667eea', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                                        Forgot password?
                                    </button>
                                </div>
                                <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••" required disabled={isLoading}
                                    style={{ background: isLoading ? '#f1f5f9' : 'white' }}
                                    onFocus={e => e.target.style.borderColor = '#667eea'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                            </div>

                            <button className="lp-btn-primary" type="submit" disabled={isLoading}>
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '12px', fontWeight: '600' }}>
                                🧪 Quick Test Accounts
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: '🔴 Admin Account', email: 'admin@salford.ac.uk', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#dc2626' },
                                    { label: '🔵 Staff Account', email: 'staff@salford.ac.uk', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: '#2563eb' },
                                    { label: '🟢 Student Account', email: 'student@salford.ac.uk', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#059669' },
                                ].map(t => (
                                    <button key={t.email} className="lp-btn-test" type="button"
                                        onClick={() => handleTestLogin(t.email, 'password123')}
                                        disabled={isLoading}
                                        style={{ background: t.bg, borderColor: t.border, color: t.color, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '10px', fontStyle: 'italic' }}>All passwords: password123</p>
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 8px' }}>
                                Don't have an account?{' '}
                                <button onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}>
                                    Sign up
                                </button>
                            </p>
                            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                                ← Back to Home
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right: decorative (desktop only) ── */}
                <div className="login-right">
                    <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)', borderRadius: '50%', top: '-200px', right: '-200px' }} />
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white' }}>
                        <h2 style={{ fontSize: '42px', fontWeight: '800', margin: '0 0 20px', letterSpacing: '-1px' }}>Smart Campus Navigator</h2>
                        <p style={{ fontSize: '18px', opacity: 0.9, lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
                            Find your way around campus with real-time navigation and live updates
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
