import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    return (
        <>
            {/* Global style reset to ensure scrolling works */}
            <style>{`
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow-x: hidden;
                    overflow-y: auto;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    background-attachment: fixed;
                }
                
                #root {
                    width: 100%;
                    min-height: 100vh;
                    overflow: visible;
                }
                
                /* ===== MOBILE RESPONSIVE - DESKTOP STAYS THE SAME ===== */
                @media (max-width: 768px) {
                    /* Header responsive */
                    .landing-header {
                        padding: 16px 20px !important;
                        flex-direction: column !important;
                        gap: 16px !important;
                    }
                    
                    .landing-logo {
                        font-size: 18px !important;
                    }
                    
                    .landing-logo span:first-child {
                        font-size: 24px !important;
                    }
                    
                    .landing-beta-badge {
                        font-size: 10px !important;
                        padding: 3px 10px !important;
                    }
                    
                    .landing-header-buttons {
                        width: 100% !important;
                        flex-direction: column !important;
                        gap: 8px !important;
                    }
                    
                    .landing-header-buttons button {
                        width: 100% !important;
                        min-height: 44px !important;
                        font-size: 16px !important;
                    }
                    
                    /* Main content padding */
                    .landing-main {
                        padding: 60px 20px 40px 20px !important;
                    }
                    
                    /* Hero section */
                    .landing-hero-badge {
                        font-size: 13px !important;
                        padding: 6px 16px !important;
                    }
                    
                    .landing-hero-title {
                        font-size: 42px !important;
                        line-height: 1.1 !important;
                    }
                    
                    .landing-hero-subtitle {
                        font-size: 18px !important;
                        padding: 0 10px !important;
                    }
                    
                    .landing-hero-cta {
                        flex-direction: column !important;
                        gap: 12px !important;
                    }
                    
                    .landing-hero-cta button {
                        width: 100% !important;
                        justify-content: center !important;
                        min-height: 44px !important;
                        font-size: 16px !important;
                    }
                    
                    .landing-no-login-text {
                        text-align: center !important;
                    }
                    
                    /* Stats bar - stack vertically */
                    .landing-stats {
                        flex-direction: column !important;
                        gap: 24px !important;
                    }
                    
                    .landing-stat-icon {
                        font-size: 28px !important;
                    }
                    
                    .landing-stat-number {
                        font-size: 24px !important;
                    }
                    
                    /* Features section */
                    .landing-features-title {
                        font-size: 32px !important;
                    }
                    
                    .landing-features-grid {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                    }
                    
                    .landing-feature-card {
                        padding: 24px !important;
                    }
                    
                    .landing-feature-icon {
                        font-size: 40px !important;
                    }
                    
                    .landing-feature-title {
                        font-size: 20px !important;
                    }
                    
                    /* CTA section */
                    .landing-cta {
                        padding: 32px 20px !important;
                    }
                    
                    .landing-cta-title {
                        font-size: 28px !important;
                    }
                    
                    .landing-cta-text {
                        font-size: 16px !important;
                    }
                    
                    .landing-cta-buttons {
                        flex-direction: column !important;
                        width: 100% !important;
                        gap: 12px !important;
                    }
                    
                    .landing-cta-buttons button {
                        width: 100% !important;
                        min-height: 44px !important;
                        font-size: 16px !important;
                    }
                    
                    /* Footer */
                    .landing-footer {
                        padding: 20px !important;
                    }
                    
                    .landing-footer p {
                        font-size: 13px !important;
                    }
                }
            `}</style>

            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(30px); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

            <div style={{
                width: '100%',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                position: 'relative',
                overflow: 'visible',
            }}>
                {/* Animated Background Circles */}
                <div style={{
                    position: 'absolute',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    top: '-250px',
                    right: '-250px',
                    animation: 'float 20s infinite ease-in-out',
                }} />
                <div style={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                    borderRadius: '50%',
                    bottom: '0',
                    left: '-200px',
                    animation: 'float 15s infinite ease-in-out reverse',
                }} />

                {/* Navigation Header */}
                <header className="landing-header" style={{
                    position: 'relative',
                    zIndex: 10,
                    background: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px 80px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                }}>
                    <div className="landing-logo" style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        letterSpacing: '-0.5px',
                    }}>
                        <span style={{
                            fontSize: '28px',
                            animation: 'pulse 2s infinite',
                        }}>📍</span>
                        <span>Smart Campus Navigator</span>
                        <span className="landing-beta-badge" style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            background: 'rgba(255,255,255,0.2)',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            marginLeft: '8px',
                        }}>
                            BETA
                        </span>
                    </div>

                    <div className="landing-header-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '10px 28px',
                                borderRadius: '8px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                background: 'transparent',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                backdropFilter: 'blur(10px)',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.2)';
                                e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            🔐 Login
                        </button>

                        <button
                            onClick={() => navigate('/register')}
                            style={{
                                padding: '10px 28px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'white',
                                color: '#667eea',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                            }}
                        >
                            ✨ Get Started
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="landing-main" style={{
                    position: 'relative',
                    zIndex: 5,
                    padding: '100px 80px 80px 80px',
                }}>
                    {/* Hero Section */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '80px',
                        animation: 'fadeInUp 0.8s ease-out',
                    }}>
                        <div className="landing-hero-badge" style={{
                            display: 'inline-block',
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)',
                            padding: '8px 20px',
                            borderRadius: '30px',
                            marginBottom: '24px',
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}>
                            <span style={{
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: '600',
                            }}>
                                🎓 University of Salford
                            </span>
                        </div>

                        <h1 className="landing-hero-title" style={{
                            fontSize: '72px',
                            fontWeight: '900',
                            margin: '0 0 24px 0',
                            lineHeight: '1.1',
                            letterSpacing: '-2px',
                            color: 'white',
                            textShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        }}>
                            Navigate Campus
                            <br />
                            <span style={{
                                background: 'linear-gradient(to right, #ffffff, #e0e7ff)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                With Confidence
                            </span>
                        </h1>

                        <p className="landing-hero-subtitle" style={{
                            fontSize: '22px',
                            color: 'rgba(255,255,255,0.95)',
                            lineHeight: '1.7',
                            maxWidth: '700px',
                            margin: '0 auto 40px auto',
                            fontWeight: '400',
                        }}>
                            Real-time navigation, walking directions, and live campus updates — all in one intelligent platform
                        </p>

                        <div className="landing-hero-cta" style={{
                            display: 'flex',
                            gap: '16px',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <button
                                onClick={() => navigate('/navigator')}
                                style={{
                                    padding: '18px 40px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'white',
                                    color: '#667eea',
                                    fontSize: '17px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-4px) scale(1.02)';
                                    e.target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0) scale(1)';
                                    e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>🚀</span>
                                Start Navigating as Guest
                            </button>

                            <div className="landing-no-login-text" style={{
                                color: 'rgba(255,255,255,0.8)',
                                fontSize: '14px',
                                fontWeight: '500',
                            }}>
                                No login required
                            </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="landing-stats" style={{
                            display: 'flex',
                            gap: '40px',
                            justifyContent: 'center',
                            marginTop: '60px',
                        }}>
                            {[
                                { icon: '🏢', number: '15+', label: 'Campus Buildings' },
                                { icon: '🚪', number: '150+', label: 'Rooms Mapped' },
                                { icon: '📍', number: '24/7', label: 'Real-Time Updates' },
                            ].map((stat, idx) => (
                                <div key={idx} style={{
                                    textAlign: 'center',
                                }}>
                                    <div className="landing-stat-icon" style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
                                    <div className="landing-stat-number" style={{
                                        fontSize: '28px',
                                        fontWeight: '800',
                                        color: 'white',
                                        marginBottom: '4px',
                                    }}>
                                        {stat.number}
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: 'rgba(255,255,255,0.8)',
                                        fontWeight: '500',
                                    }}>
                                        {stat.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Features Section */}
                    <div style={{
                        marginBottom: '60px',
                    }}>
                        <h2 className="landing-features-title" style={{
                            fontSize: '42px',
                            fontWeight: '800',
                            color: 'white',
                            textAlign: 'center',
                            marginBottom: '50px',
                            letterSpacing: '-1px',
                        }}>
                            Everything You Need to Navigate
                        </h2>

                        <div className="landing-features-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '24px',
                        }}>
                            {[
                                {
                                    icon: '🗺️',
                                    title: 'Interactive Map',
                                    description: 'Visual campus navigation with real-time building and room locations',
                                    color: '#3b82f6',
                                },
                                {
                                    icon: '🚶',
                                    title: 'Smart Routes',
                                    description: 'AI-powered pathfinding with multiple route options and turn-by-turn directions',
                                    color: '#10b981',
                                },
                                {
                                    icon: '📊',
                                    title: 'Live Updates',
                                    description: 'Real-time campus events, room occupancy tracking, and instant notifications',
                                    color: '#f59e0b',
                                },
                                {
                                    icon: '🎯',
                                    title: 'Quick Search',
                                    description: 'Find any building or room instantly with smart search and autocomplete',
                                    color: '#ef4444',
                                },
                                {
                                    icon: '📱',
                                    title: 'Mobile Ready',
                                    description: 'Access from anywhere with GPS integration and responsive design',
                                    color: '#8b5cf6',
                                },
                                {
                                    icon: '🔐',
                                    title: 'Staff Tools',
                                    description: 'Create events, manage occupancy, and access admin features (login required)',
                                    color: '#ec4899',
                                },
                            ].map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="landing-feature-card"
                                    onMouseEnter={() => setHoveredCard(idx)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        background: hoveredCard === idx
                                            ? 'rgba(255, 255, 255, 0.25)'
                                            : 'rgba(255, 255, 255, 0.15)',
                                        backdropFilter: 'blur(20px)',
                                        borderRadius: '20px',
                                        padding: '32px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                        transform: hoveredCard === idx ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                                        boxShadow: hoveredCard === idx
                                            ? '0 20px 50px rgba(0,0,0,0.3)'
                                            : '0 8px 20px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div className="landing-feature-icon" style={{
                                        fontSize: '48px',
                                        marginBottom: '20px',
                                        transform: hoveredCard === idx ? 'scale(1.1)' : 'scale(1)',
                                        transition: 'transform 0.3s ease',
                                    }}>
                                        {feature.icon}
                                    </div>
                                    <h3 className="landing-feature-title" style={{
                                        fontSize: '22px',
                                        fontWeight: '700',
                                        color: 'white',
                                        margin: '0 0 12px 0',
                                    }}>
                                        {feature.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '15px',
                                        color: 'rgba(255,255,255,0.9)',
                                        lineHeight: '1.7',
                                        margin: 0,
                                    }}>
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="landing-cta" style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        padding: '48px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    }}>
                        <h3 className="landing-cta-title" style={{
                            fontSize: '32px',
                            fontWeight: '800',
                            color: 'white',
                            margin: '0 0 16px 0',
                        }}>
                            Ready to Get Started?
                        </h3>
                        <p className="landing-cta-text" style={{
                            fontSize: '18px',
                            color: 'rgba(255,255,255,0.9)',
                            marginBottom: '32px',
                            lineHeight: '1.6',
                        }}>
                            <strong>💡 Visitors:</strong> No account needed — start navigating instantly<br />
                            <strong>🎓 Students & Staff:</strong> Login for advanced features and personalization
                        </p>
                        <div className="landing-cta-buttons" style={{
                            display: 'flex',
                            gap: '16px',
                            justifyContent: 'center',
                        }}>
                            <button
                                onClick={() => navigate('/register')}
                                style={{
                                    padding: '16px 36px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'white',
                                    color: '#667eea',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0)';
                                    e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                                }}
                            >
                                Create Account
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    padding: '16px 36px',
                                    borderRadius: '10px',
                                    border: '2px solid white',
                                    background: 'transparent',
                                    color: 'white',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'rgba(255,255,255,0.2)';
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.transform = 'translateY(0)';
                                }}
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="landing-footer" style={{
                    position: 'relative',
                    zIndex: 10,
                    background: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '24px 80px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.8)',
                }}>
                    <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        fontWeight: '500',
                    }}>
                        © 2026 University of Salford | Smart Campus Navigator
                    </p>
                    <p style={{
                        margin: 0,
                        fontSize: '12px',
                        opacity: 0.7,
                    }}>
                        Final Year Project by Michael Akinbanjo | BSc Software Engineering
                    </p>
                </footer>
            </div>
        </>
    );
}