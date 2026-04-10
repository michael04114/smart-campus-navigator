import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Avatar colour palette (like Google's account colours)
const AVATAR_COLORS = [
    '#667eea', '#764ba2', '#f59e0b', '#10b981',
    '#ef4444', '#3b82f6', '#ec4899', '#14b8a6',
];

const AVATAR_COLOR_KEY = (userId) => `scn_avatar_color_${userId}`;
const DARK_KEY = (userId) => `scn_dark_mode_${userId}`;

function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, changePassword, updateProfile } = useAuth();
    const { darkMode, setDarkMode } = useTheme();

    const toggleDark = () => {
        const next = !darkMode;
        setDarkMode(next);
        localStorage.setItem(DARK_KEY(user?.id), next);
    };

    // Redirect guests
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // Avatar colour stored per-user in localStorage
    const [avatarColor, setAvatarColor] = useState(() =>
        localStorage.getItem(AVATAR_COLOR_KEY(user?.id)) || AVATAR_COLORS[0]
    );

    // Saved places — fetched from API
    const [savedPlaces, setSavedPlaces] = useState([]);

    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem('token');
        fetch('/api/saved-places', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(rows => {
                if (Array.isArray(rows)) {
                    // Normalise to the shape the UI expects
                    setSavedPlaces(rows.map(r => ({
                        id: r.place_id,
                        name: r.name,
                        type: r.type,
                        building: r.building,
                        lat: r.lat,
                        lng: r.lng,
                        savedAt: r.saved_at,
                        // keep db row id for deletion
                        _dbId: r.id,
                    })));
                }
            })
            .catch(() => {});
    }, [user]);

    // Edit name
    const [editName, setEditName] = useState(false);
    const [nameValue, setNameValue] = useState(user?.full_name || '');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameMsg, setNameMsg] = useState('');

    // Change password
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState({ text: '', ok: true });

    // Active section tab
    const [tab, setTab] = useState('profile');

    if (!user) return null;

    const handleAvatarColor = (color) => {
        setAvatarColor(color);
        localStorage.setItem(AVATAR_COLOR_KEY(user.id), color);
    };

    const handleSaveName = async () => {
        if (!nameValue.trim()) return;
        setNameSaving(true);
        setNameMsg('');
        try {
            await updateProfile(nameValue.trim());
            setNameMsg('✅ Name updated!');
            setEditName(false);
        } catch (err) {
            setNameMsg(`❌ ${err.message}`);
        } finally {
            setNameSaving(false);
            setTimeout(() => setNameMsg(''), 3000);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwMsg({ text: '', ok: true });
        if (pwForm.next !== pwForm.confirm) {
            setPwMsg({ text: '❌ New passwords do not match', ok: false });
            return;
        }
        if (pwForm.next.length < 8) {
            setPwMsg({ text: '❌ Password must be at least 8 characters', ok: false });
            return;
        }
        setPwLoading(true);
        try {
            await changePassword(pwForm.current, pwForm.next);
            setPwMsg({ text: '✅ Password changed successfully!', ok: true });
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            setPwMsg({ text: `❌ ${err.message}`, ok: false });
        } finally {
            setPwLoading(false);
        }
    };

    const removePlace = async (index) => {
        const place = savedPlaces[index];
        setSavedPlaces(prev => prev.filter((_, i) => i !== index));
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/saved-places/${encodeURIComponent(place.id)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch {}
    };

    const navigateToPlace = (place) => {
        sessionStorage.setItem('scn_navigate_to', JSON.stringify(place));
        navigate('/navigator');
    };

    const roleColors = {
        admin: { bg: '#fef3c7', color: '#92400e', label: '⚙️ Admin' },
        staff: { bg: '#dbeafe', color: '#1e40af', label: '👔 Staff' },
        student: { bg: '#f0fdf4', color: '#166534', label: '🎓 Student' },
    };
    const roleBadge = roleColors[user.role] || roleColors.student;

    const bg = darkMode ? '#111827' : '#f1f5f9';
    const card = darkMode ? '#1e2433' : '#ffffff';
    const cardBorder = darkMode ? '#334155' : '#e2e8f0';
    const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
    const textSecondary = darkMode ? '#94a3b8' : '#64748b';
    const inputBg = darkMode ? '#2d3748' : '#ffffff';
    const inputBorder = darkMode ? '#4b5563' : '#e2e8f0';

    const cardStyle = {
        background: card, borderRadius: '16px', padding: '24px',
        border: `1px solid ${cardBorder}`, marginBottom: '16px',
        boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.06)',
    };

    const inputStyle = {
        width: '100%', padding: '12px 14px', borderRadius: '10px',
        border: `2px solid ${inputBorder}`, fontSize: '15px', outline: 'none',
        background: inputBg, color: textPrimary, boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };

    const tabBtn = (id, label) => (
        <button
            onClick={() => setTab(id)}
            style={{
                padding: '9px 18px', borderRadius: '8px', border: 'none',
                background: tab === id
                    ? 'linear-gradient(135deg,#667eea,#764ba2)'
                    : (darkMode ? '#2d3748' : '#f1f5f9'),
                color: tab === id ? '#fff' : textSecondary,
                fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                transition: 'all 0.2s',
            }}
        >{label}</button>
    );

    return (
        <>
            <style>{`
                html, body { margin:0; padding:0; width:100%; min-height:100vh; overflow-x:hidden; overflow-y:auto !important; }
                #root { width:100%; min-height:100vh; overflow-y:auto !important; }
                @media (max-width:600px) {
                    .profile-layout { padding: 16px !important; }
                    .profile-tabs { flex-wrap: wrap !important; gap: 6px !important; }
                }
            `}</style>

            <div style={{ minHeight: '100vh', background: bg, transition: 'background 0.3s' }}>
                {/* Header bar */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '0 20px', height: '56px', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, zIndex: 100,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}>
                    <button onClick={() => navigate('/navigator')} style={{
                        background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)',
                        color: 'white', padding: '6px 14px', borderRadius: '8px',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    }}>
                        ← Navigator
                    </button>
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '16px' }}>
                        My Profile
                    </span>
                    <div style={{ width: 80 }} />
                </div>

                <div className="profile-layout" style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>

                    {/* ── Avatar card ── */}
                    <div style={{ ...cardStyle, textAlign: 'center' }}>
                        {/* Avatar circle */}
                        <div style={{
                            width: '88px', height: '88px', borderRadius: '50%',
                            background: avatarColor, margin: '0 auto 12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', fontWeight: '800', color: 'white',
                            boxShadow: `0 4px 16px ${avatarColor}66`,
                            border: `4px solid ${card}`,
                            outline: `3px solid ${avatarColor}`,
                        }}>
                            {getInitials(user.full_name)}
                        </div>

                        <div style={{ fontSize: '22px', fontWeight: '800', color: textPrimary, marginBottom: '4px' }}>
                            {user.full_name}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{
                                fontSize: '12px', padding: '4px 12px', borderRadius: '999px',
                                background: roleBadge.bg, color: roleBadge.color, fontWeight: '700',
                            }}>
                                {roleBadge.label}
                            </span>
                        </div>
                        <div style={{ fontSize: '14px', color: textSecondary }}>{user.email}</div>

                        <div style={{
                            display: 'flex', justifyContent: 'center', gap: '8px',
                            marginTop: '16px', flexWrap: 'wrap',
                        }}>
                            {user.created_at && (
                                <span style={{
                                    fontSize: '12px', color: textSecondary,
                                    background: darkMode ? '#2d3748' : '#f8fafc',
                                    padding: '4px 10px', borderRadius: '8px',
                                    border: `1px solid ${cardBorder}`,
                                }}>
                                    📅 Joined {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                            {user.last_login && (
                                <span style={{
                                    fontSize: '12px', color: textSecondary,
                                    background: darkMode ? '#2d3748' : '#f8fafc',
                                    padding: '4px 10px', borderRadius: '8px',
                                    border: `1px solid ${cardBorder}`,
                                }}>
                                    🕐 Last login {new Date(user.last_login).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                            )}
                            <span style={{
                                fontSize: '12px', color: textSecondary,
                                background: darkMode ? '#2d3748' : '#f8fafc',
                                padding: '4px 10px', borderRadius: '8px',
                                border: `1px solid ${cardBorder}`,
                            }}>
                                💾 {savedPlaces.length} saved place{savedPlaces.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Avatar colour picker */}
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '8px', fontWeight: '600' }}>
                                Avatar Colour
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {AVATAR_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => handleAvatarColor(c)}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: c, border: avatarColor === c ? '3px solid white' : '3px solid transparent',
                                            outline: avatarColor === c ? `3px solid ${c}` : 'none',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Tab navigation ── */}
                    <div className="profile-tabs" style={{
                        display: 'flex', gap: '8px', marginBottom: '16px',
                        overflowX: 'auto', paddingBottom: '4px',
                    }}>
                        {tabBtn('profile', '👤 Profile')}
                        {tabBtn('password', '🔒 Password')}
                        {tabBtn('appearance', '🎨 Appearance')}
                        {tabBtn('saved', `❤️ Saved (${savedPlaces.length})`)}
                    </div>

                    {/* ── Profile tab ── */}
                    {tab === 'profile' && (
                        <div style={cardStyle}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, marginBottom: '16px' }}>
                                Edit Profile
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: textSecondary, marginBottom: '6px' }}>
                                    Display Name
                                </label>
                                {editName ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            style={inputStyle}
                                            value={nameValue}
                                            onChange={e => setNameValue(e.target.value)}
                                            onFocus={e => e.target.style.borderColor = '#667eea'}
                                            onBlur={e => e.target.style.borderColor = inputBorder}
                                            placeholder="Your full name"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveName}
                                            disabled={nameSaving}
                                            style={{
                                                padding: '12px 16px', borderRadius: '10px', border: 'none',
                                                background: nameSaving ? '#94a3b8' : 'linear-gradient(135deg,#667eea,#764ba2)',
                                                color: 'white', fontWeight: '700', cursor: nameSaving ? 'not-allowed' : 'pointer',
                                                whiteSpace: 'nowrap', fontSize: '14px',
                                            }}
                                        >
                                            {nameSaving ? '...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={() => { setEditName(false); setNameValue(user.full_name); }}
                                            style={{
                                                padding: '12px 14px', borderRadius: '10px',
                                                border: `1px solid ${inputBorder}`, background: 'transparent',
                                                color: textSecondary, cursor: 'pointer', fontSize: '14px',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', gap: '12px',
                                    }}>
                                        <span style={{ fontSize: '15px', color: textPrimary, fontWeight: '500' }}>
                                            {user.full_name}
                                        </span>
                                        <button
                                            onClick={() => setEditName(true)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px',
                                                border: `1.5px solid #667eea`, background: 'transparent',
                                                color: '#667eea', fontWeight: '600', fontSize: '13px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>
                                    </div>
                                )}
                                {nameMsg && (
                                    <div style={{ marginTop: '8px', fontSize: '13px', color: nameMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>
                                        {nameMsg}
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '16px', padding: '14px', background: darkMode ? '#2d3748' : '#f8fafc', borderRadius: '10px', border: `1px solid ${cardBorder}` }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        ['📧 Email', user.email],
                                        ['🎭 Role', user.role.charAt(0).toUpperCase() + user.role.slice(1)],
                                        ['🆔 Account ID', `#${user.id}`],
                                    ].map(([label, value]) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: textSecondary }}>{label}</span>
                                            <span style={{ fontSize: '13px', color: textPrimary, fontWeight: '500' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Password tab ── */}
                    {tab === 'password' && (
                        <div style={cardStyle}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, marginBottom: '16px' }}>
                                Change Password
                            </div>

                            {pwMsg.text && (
                                <div style={{
                                    padding: '12px 14px', borderRadius: '10px', marginBottom: '16px',
                                    background: pwMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                    border: `1px solid ${pwMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    color: pwMsg.ok ? '#059669' : '#dc2626', fontSize: '14px',
                                }}>
                                    {pwMsg.text}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                    ['Current Password', 'current', 'Enter your current password'],
                                    ['New Password', 'next', 'At least 8 characters'],
                                    ['Confirm New Password', 'confirm', 'Repeat new password'],
                                ].map(([label, field, ph]) => (
                                    <div key={field}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: textSecondary, marginBottom: '6px' }}>
                                            {label}
                                        </label>
                                        <input
                                            type="password"
                                            value={pwForm[field]}
                                            onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                                            placeholder={ph}
                                            required
                                            disabled={pwLoading}
                                            style={{ ...inputStyle, background: pwLoading ? (darkMode ? '#1e2433' : '#f1f5f9') : inputBg }}
                                            onFocus={e => e.target.style.borderColor = '#667eea'}
                                            onBlur={e => e.target.style.borderColor = inputBorder}
                                        />
                                    </div>
                                ))}
                                <button
                                    type="submit"
                                    disabled={pwLoading}
                                    style={{
                                        padding: '14px', borderRadius: '10px', border: 'none',
                                        background: pwLoading ? '#94a3b8' : 'linear-gradient(135deg,#667eea,#764ba2)',
                                        color: 'white', fontWeight: '700', fontSize: '15px',
                                        cursor: pwLoading ? 'not-allowed' : 'pointer',
                                        boxShadow: pwLoading ? 'none' : '0 4px 14px rgba(102,126,234,0.4)',
                                    }}
                                >
                                    {pwLoading ? 'Changing...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── Appearance tab ── */}
                    {tab === 'appearance' && (
                        <div style={cardStyle}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, marginBottom: '16px' }}>
                                Appearance
                            </div>

                            {/* Dark mode toggle */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '16px', borderRadius: '12px',
                                background: darkMode ? '#2d3748' : '#f8fafc',
                                border: `1px solid ${cardBorder}`, marginBottom: '12px',
                            }}>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: textPrimary }}>
                                        {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                                        {darkMode ? 'Easy on the eyes at night' : 'Bright and clear'}
                                    </div>
                                </div>
                                {/* Toggle switch */}
                                <div
                                    onClick={toggleDark}
                                    style={{
                                        width: '52px', height: '28px', borderRadius: '14px',
                                        background: darkMode ? '#667eea' : '#cbd5e1',
                                        cursor: 'pointer', position: 'relative',
                                        transition: 'background 0.3s', flexShrink: 0,
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute', top: '3px',
                                        left: darkMode ? '27px' : '3px',
                                        width: '22px', height: '22px', borderRadius: '50%',
                                        background: 'white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                        transition: 'left 0.3s',
                                    }} />
                                </div>
                            </div>

                            {/* Avatar colour section */}
                            <div style={{
                                padding: '16px', borderRadius: '12px',
                                background: darkMode ? '#2d3748' : '#f8fafc',
                                border: `1px solid ${cardBorder}`,
                            }}>
                                <div style={{ fontSize: '15px', fontWeight: '600', color: textPrimary, marginBottom: '4px' }}>
                                    🎨 Avatar Colour
                                </div>
                                <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '12px' }}>
                                    Your initials avatar colour across the app
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {AVATAR_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => handleAvatarColor(c)}
                                            style={{
                                                width: '36px', height: '36px', borderRadius: '50%',
                                                background: c,
                                                border: avatarColor === c ? '3px solid white' : '3px solid transparent',
                                                outline: avatarColor === c ? `3px solid ${c}` : '2px solid transparent',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Saved Places tab (like Google Maps) ── */}
                    {tab === 'saved' && (
                        <div style={cardStyle}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: textPrimary, marginBottom: '4px' }}>
                                ❤️ Saved Places
                            </div>
                            <div style={{ fontSize: '13px', color: textSecondary, marginBottom: '16px' }}>
                                Tap the ❤️ on any building or room in the Navigator to save it here.
                            </div>

                            {savedPlaces.length === 0 ? (
                                <div style={{
                                    padding: '32px 16px', textAlign: 'center',
                                    background: darkMode ? '#2d3748' : '#f8fafc',
                                    borderRadius: '12px', border: `1px dashed ${cardBorder}`,
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗺️</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: textPrimary, marginBottom: '6px' }}>
                                        No saved places yet
                                    </div>
                                    <div style={{ fontSize: '13px', color: textSecondary, marginBottom: '16px' }}>
                                        Save buildings and rooms for quick access — just like Google Maps!
                                    </div>
                                    <button
                                        onClick={() => navigate('/navigator')}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                                            background: 'linear-gradient(135deg,#667eea,#764ba2)',
                                            color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                                        }}
                                    >
                                        Open Navigator
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {savedPlaces.map((place, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '14px', borderRadius: '12px',
                                            background: darkMode ? '#2d3748' : '#f8fafc',
                                            border: `1px solid ${cardBorder}`,
                                        }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: place.type === 'room' ? 'rgba(239,113,0,0.15)' : 'rgba(102,126,234,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '20px', flexShrink: 0,
                                            }}>
                                                {place.type === 'room' ? '🚪' : '🏢'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '14px', fontWeight: '600', color: textPrimary,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {place.name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                                                    {place.type === 'room' ? `Room · ${place.building || ''}` : 'Building'}
                                                    {place.savedAt && ` · Saved ${new Date(place.savedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                <button
                                                    onClick={() => navigateToPlace(place)}
                                                    style={{
                                                        padding: '7px 12px', borderRadius: '8px', border: 'none',
                                                        background: '#667eea', color: 'white', fontSize: '12px',
                                                        fontWeight: '600', cursor: 'pointer', minHeight: '32px',
                                                    }}
                                                >
                                                    Navigate
                                                </button>
                                                <button
                                                    onClick={() => removePlace(i)}
                                                    style={{
                                                        padding: '7px 10px', borderRadius: '8px',
                                                        border: `1px solid ${cardBorder}`, background: 'transparent',
                                                        color: '#ef4444', fontSize: '14px', cursor: 'pointer',
                                                        minHeight: '32px',
                                                    }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Clear all saved places?')) {
                                                const token = localStorage.getItem('token');
                                                const ids = savedPlaces.map(p => p.id);
                                                setSavedPlaces([]);
                                                await Promise.all(ids.map(id =>
                                                    fetch(`/api/saved-places/${encodeURIComponent(id)}`, {
                                                        method: 'DELETE',
                                                        headers: { Authorization: `Bearer ${token}` },
                                                    }).catch(() => {})
                                                ));
                                            }
                                        }}
                                        style={{
                                            padding: '10px', borderRadius: '10px',
                                            border: `1px solid rgba(239,68,68,0.4)`, background: 'transparent',
                                            color: '#ef4444', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                                            marginTop: '4px',
                                        }}
                                    >
                                        Clear All Saved Places
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
