import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'student',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pendingApproval, setPendingApproval] = useState(false);

    function handleChange(e) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError('❌ Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('❌ Password must be at least 6 characters');
            return;
        }

        if (!formData.fullName.trim()) {
            setError('❌ Please enter your full name');
            return;
        }

        setIsLoading(true);

        try {
            const result = await register(
                formData.email,
                formData.password,
                formData.fullName,
                formData.role
            );
            if (result.pending) {
                setPendingApproval(true);
                return;
            }
            navigate('/navigator');
        } catch (err) {
            // Comprehensive error messages
            if (err.message.includes('timeout') || err.message.includes('AbortError')) {
                setError('⏱️ Server timeout. Please check your connection and try again.');
            } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
                setError('🔌 Cannot connect to server. Please check your internet connection.');
            } else if (err.message.includes('already exists') || err.message.includes('409')) {
                setError('❌ An account with this email already exists. Please use a different email or try logging in.');
            } else if (err.message.includes('400')) {
                setError('❌ Invalid registration data. Please check your information and try again.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
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

                .login-col {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 40px;
                    min-height: 100%;
                }

                .login-card {
                    width: 100%;
                    max-width: 480px;
                    background: rgba(255,255,255,0.97);
                    border-radius: 24px;
                    padding: 48px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }

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

                @media (max-width: 768px) {
                    input, select, textarea { font-size: 16px !important; }
                    .login-right { display: none !important; }
                    .login-col { padding: 32px 20px 48px; justify-content: flex-start; }
                    .login-card { padding: 32px 20px; border-radius: 20px; }
                    .lp-btn-primary { min-height: 48px; font-size: 16px !important; }
                }
            `}</style>

            <div className="login-page">
                {/* ── Left: form ── */}
                <div className="login-col">
                    <div className="login-card">
                        {pendingApproval ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '56px', marginBottom: '16px' }}>⏳</div>
                                <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#1e293b', margin: '0 0 12px' }}>Account Pending Approval</h2>
                                <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.6, marginBottom: '20px' }}>
                                    Your staff account is awaiting admin verification. You can sign in once approved.
                                </p>
                                <div style={{ padding: '14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', color: '#92400e', fontSize: '14px', marginBottom: '20px' }}>
                                    💡 Contact your campus administrator to speed up the process.
                                </div>
                                <button className="lp-btn-primary" onClick={() => navigate('/login')}>Back to Sign In</button>
                            </div>
                        ) : (<>
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h1 style={{ fontSize: '36px', fontWeight: '800', background: 'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 8px', letterSpacing: '-1px' }}>
                                    Create Account
                                </h1>
                                <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>Join Smart Campus Navigator today</p>
                            </div>

                            {error && (
                                <div style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#dc2626', fontSize: '14px', marginBottom: '16px', textAlign: 'center', lineHeight: 1.5 }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                    { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'John Doe' },
                                    { label: 'Email Address', name: 'email', type: 'email', placeholder: 'you@salford.ac.uk' },
                                    { label: 'Password', name: 'password', type: 'password', placeholder: '••••••••' },
                                    { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: '••••••••' },
                                ].map(f => (
                                    <div key={f.name}>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>{f.label}</label>
                                        <input className="lp-input" type={f.type} name={f.name} value={formData[f.name]}
                                            onChange={handleChange} placeholder={f.placeholder} required disabled={isLoading}
                                            style={{ background: isLoading ? '#f1f5f9' : 'white' }}
                                            onFocus={e => e.target.style.borderColor = '#667eea'}
                                            onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                                    </div>
                                ))}

                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>I am a...</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {['student', 'staff'].map(r => (
                                            <button key={r} type="button" onClick={() => setFormData({ ...formData, role: r })} disabled={isLoading}
                                                style={{ flex: 1, padding: '12px', border: `2px solid ${formData.role === r ? '#667eea' : '#e2e8f0'}`, borderRadius: '12px', background: formData.role === r ? 'rgba(102,126,234,0.1)' : 'white', color: formData.role === r ? '#667eea' : '#64748b', fontSize: '14px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                                                {r === 'student' ? '🎓 Student' : '👨‍🏫 Staff'}
                                            </button>
                                        ))}
                                    </div>
                                    {formData.role === 'staff' && (
                                        <div style={{ marginTop: '10px', padding: '12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
                                            ⚠️ <strong>Staff accounts require admin approval</strong> before you can sign in.
                                        </div>
                                    )}
                                </div>

                                <button className="lp-btn-primary" type="submit" disabled={isLoading}>
                                    {isLoading ? 'Creating Account...' : 'Create Account'}
                                </button>
                            </form>

                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 8px' }}>
                                    Already have an account?{' '}
                                    <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#667eea', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}>Sign in</button>
                                </p>
                                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
                                    ← Back to Home
                                </button>
                            </div>
                        </>)}
                    </div>
                </div>

                {/* ── Right: decorative (desktop only) ── */}
                <div className="login-right">
                    <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle,rgba(255,255,255,0.1) 0%,transparent 70%)', borderRadius: '50%', top: '-200px', right: '-200px' }} />
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white' }}>
                        <h2 style={{ fontSize: '42px', fontWeight: '800', margin: '0 0 20px', letterSpacing: '-1px' }}>Smart Campus Navigator</h2>
                        <p style={{ fontSize: '18px', opacity: 0.9, lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
                            Join thousands of students and staff navigating campus with ease
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
