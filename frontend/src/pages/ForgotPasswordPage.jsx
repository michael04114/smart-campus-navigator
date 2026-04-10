import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const { forgotPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await forgotPassword(email);
            setSubmitted(true);
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '14px 16px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        background: isLoading ? '#f1f5f9' : 'white',
    };

    return (
        <>
            <style>{`
                html, body { margin: 0; padding: 0; width: 100%; min-height: 100vh; overflow-x: hidden; overflow-y: auto !important; }
                #root { width: 100%; min-height: 100vh; overflow-y: auto !important; }
                @media (max-width: 768px) {
                    input, select, textarea { font-size: 16px !important; }
                    button { min-height: 48px; }
                    .fp-right { display: none !important; }
                    .fp-wrapper { padding: 60px 20px !important; }
                    .fp-card { max-width: 100% !important; padding: 40px 20px !important; }
                }
            `}</style>

            <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
                {/* LEFT — form */}
                <div className="fp-wrapper" style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 40px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    minHeight: '100vh',
                }}>
                    <div className="fp-card" style={{
                        width: '100%',
                        maxWidth: '480px',
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: '24px',
                        padding: '48px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(20px)',
                    }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔑</div>
                            <h1 style={{
                                fontSize: '32px',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                margin: '0 0 10px 0',
                                letterSpacing: '-0.5px',
                            }}>
                                Forgot Password?
                            </h1>
                            <p style={{ fontSize: '15px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                                {submitted
                                    ? "Check your inbox for the reset link."
                                    : "Enter your email and we'll send you a reset link."}
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '16px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '12px',
                                color: '#dc2626',
                                fontSize: '14px',
                                marginBottom: '24px',
                                textAlign: 'center',
                            }}>
                                {error}
                            </div>
                        )}

                        {submitted ? (
                            /* Success state */
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    padding: '20px',
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: '12px',
                                    color: '#059669',
                                    fontSize: '15px',
                                    marginBottom: '28px',
                                    lineHeight: 1.6,
                                }}>
                                    ✅ If <strong>{email}</strong> is registered, a reset link has been sent. Check your spam folder too.
                                </div>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '15px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                                    }}
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        ) : (
                            /* Form state */
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        color: '#334155',
                                        marginBottom: '8px',
                                    }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@salford.ac.uk"
                                        required
                                        disabled={isLoading}
                                        style={inputStyle}
                                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: isLoading ? 'none' : '0 4px 15px rgba(102,126,234,0.4)',
                                    }}
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                        )}

                        {/* Footer links */}
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                }}
                            >
                                ← Back to Sign In
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT — decorative */}
                <div className="fp-right" style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute',
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                        borderRadius: '50%',
                        top: '-200px',
                        right: '-200px',
                    }} />
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white' }}>
                        <h2 style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0', letterSpacing: '-1px' }}>
                            Smart Campus Navigator
                        </h2>
                        <p style={{ fontSize: '20px', opacity: 0.9, lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>
                            Find your way around campus with real-time navigation and live updates
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
