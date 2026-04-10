import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(userId) {
    return localStorage.getItem(`scn_avatar_color_${userId}`) || '#667eea';
}

export default function UserHeader() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (!user) {
        return (
            <>
                <style>{`
                    .guest-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 0 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        color: white;
                        height: 56px;
                        min-height: 56px;
                        max-height: 56px;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        z-index: 2000;
                        box-sizing: border-box;
                    }

                    .guest-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex-shrink: 0;
                    }

                    .guest-info-text .title {
                        font-size: 15px;
                        font-weight: 700;
                        line-height: 1.2;
                    }

                    .guest-info-text .subtitle {
                        font-size: 11px;
                        opacity: 0.85;
                        line-height: 1.2;
                    }

                    .guest-buttons {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        flex-shrink: 0;
                    }

                    .guest-buttons button {
                        padding: 6px 10px;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        height: 34px;
                        white-space: nowrap;
                    }

                    .guest-btn-transparent {
                        border: 1.5px solid rgba(255,255,255,0.4);
                        background: rgba(255,255,255,0.15);
                        color: white;
                    }

                    .guest-btn-transparent:hover {
                        background: rgba(255,255,255,0.25);
                    }

                    .guest-btn-solid {
                        border: none;
                        background: white;
                        color: #667eea;
                        font-weight: 700;
                    }

                    .guest-btn-solid:hover {
                        background: #f0f0ff;
                    }

                    /* Tighten on small phones */
                    @media (max-width: 430px) {
                        .guest-header { padding: 0 8px; }
                        .guest-info { gap: 5px; }
                        .guest-info-text .subtitle { display: none; }
                        .guest-info-text .title { font-size: 13px; }
                        .guest-buttons { gap: 4px; }
                        .guest-buttons button { padding: 6px 7px; font-size: 11px; height: 32px; }
                        .guest-info-emoji { display: none; }
                    }
                `}</style>

                <div className="guest-header">
                    <div className="guest-info">
                        <span className="guest-info-emoji" style={{ fontSize: '20px' }}>🗺️</span>
                        <div className="guest-info-text">
                            <div className="title">Guest Mode</div>
                            <div className="subtitle">Login for advanced features</div>
                        </div>
                    </div>

                    <div className="guest-buttons">
                        <button className="guest-btn-transparent" onClick={() => navigate('/')}>
                            ← Home
                        </button>
                        <button className="guest-btn-transparent" onClick={() => navigate('/login')}>
                            🔐 Login
                        </button>
                        <button className="guest-btn-solid" onClick={() => navigate('/register')}>
                            ✨ Register
                        </button>
                    </div>
                </div>

                {/* Spacer so content doesn't hide behind fixed header */}
                <div style={{ height: 56 }} />
            </>
        );
    }

    return (
        <>
            <style>{`
                .user-header-logged-in {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 0 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    color: white;
                    height: 56px;
                    min-height: 56px;
                    max-height: 56px;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 2000;
                    box-sizing: border-box;
                }

                .user-welcome {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .user-welcome-text .name {
                    font-size: 15px;
                    font-weight: 700;
                    line-height: 1.2;
                }

                .user-welcome-text .role {
                    font-size: 11px;
                    opacity: 0.85;
                    text-transform: capitalize;
                    line-height: 1.2;
                }

                .user-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .user-email-display {
                    font-size: 13px;
                    opacity: 0.9;
                }

                .logout-btn {
                    padding: 7px 14px;
                    border-radius: 8px;
                    border: 1.5px solid rgba(255,255,255,0.4);
                    background: rgba(255,255,255,0.15);
                    color: white;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    height: 36px;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                }

                .logout-btn:hover {
                    background: rgba(255,255,255,0.25);
                }

                @media (max-width: 600px) {
                    .user-email-display { display: none; }
                    .user-welcome-text .name {
                        font-size: 13px;
                        max-width: 100px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .logout-btn { padding: 5px 8px; font-size: 12px; height: 32px; }
                    .user-actions { gap: 6px; }
                }
                @media (max-width: 420px) {
                    .tt-header-label { display: none; }
                    .logout-btn { padding: 5px 7px; font-size: 11px; }
                    .user-welcome { gap: 6px; }
                    .user-welcome-text .name { max-width: 80px; font-size: 12px; }
                    .user-welcome-text .role { display: none; }
                }
            `}</style>

            <div className="user-header-logged-in">
                <div className="user-welcome">
                    {/* Initials avatar */}
                    <div
                        onClick={() => navigate('/profile')}
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: getAvatarColor(user.id),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: '800', color: 'white',
                            cursor: 'pointer', flexShrink: 0,
                            border: '2px solid rgba(255,255,255,0.5)',
                            transition: 'transform 0.2s',
                        }}
                        title="View Profile"
                    >
                        {getInitials(user.full_name)}
                    </div>
                    <div className="user-welcome-text">
                        <div className="name">Welcome, {user.full_name}!</div>
                        <div className="role">{user.role} Account</div>
                    </div>
                </div>

                <div className="user-actions">
                    <div className="user-email-display">{user.email}</div>
                    <button
                        className="logout-btn"
                        onClick={() => navigate('/timetable')}
                        style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                    >
                        📅 <span className="tt-header-label">Timetable</span>
                    </button>
                    <button
                        className="logout-btn"
                        onClick={() => navigate('/profile')}
                        style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' }}
                    >
                        ⚙️ Profile
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </div>

            {/* Spacer so content doesn't hide behind fixed header */}
            <div style={{ height: 56 }} />
        </>
    );
}
