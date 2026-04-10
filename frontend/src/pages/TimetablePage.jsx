import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function fmt(time) {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

// Add `hours` hours to a "HH:MM" string, clamped to 23:59
function addHours(time, hours) {
    const [h, m] = time.split(':').map(Number);
    const total = Math.min(h + hours, 23);
    return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Return duration in hours between two "HH:MM" strings (min 1)
function durationHours(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    return diff > 0 ? diff : 1;
}

export default function TimetablePage() {
    const { user } = useAuth();
    const { darkMode } = useTheme();
    const navigate = useNavigate();

    const [entries, setEntries] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        module_name: '',
        day_of_week: '0',
        start_time: '09:00',
        end_time: '10:00',
        building_id: '',
        room_id: '',
        location_note: '',
    });

    // Dark mode colours
    const bg        = darkMode ? '#0f172a' : '#f8fafc';
    const card      = darkMode ? '#1e293b' : '#ffffff';
    const textMain  = darkMode ? '#f1f5f9' : '#1e293b';
    const textSub   = darkMode ? '#94a3b8' : '#64748b';
    const textMid   = darkMode ? '#cbd5e1' : '#475569';
    const border    = darkMode ? '#334155' : '#e2e8f0';
    const inputBg   = darkMode ? '#0f172a' : '#ffffff';
    const labelClr  = darkMode ? '#cbd5e1' : '#374151';

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        loadAll();
    }, [user]);

    async function loadAll() {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [ttRes, bRes] = await Promise.all([
                fetch('/api/timetable', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/buildings'),
            ]);
            const ttData = await ttRes.json();
            const bData  = await bRes.json();
            setEntries(Array.isArray(ttData) ? ttData : []);
            const bList = bData?.features?.map(f => ({ id: f.properties.id, name: f.properties.name })) || [];
            setBuildings(bList.sort((a, b) => a.name.localeCompare(b.name)));
        } catch {
            setError('Failed to load timetable.');
        }
        setLoading(false);
    }

    async function loadRooms(buildingId) {
        if (!buildingId) { setRooms([]); return; }
        try {
            const res  = await fetch('/api/rooms');
            const data = await res.json();
            const filtered = data?.features
                ?.filter(f => String(f.properties.building_id) === String(buildingId))
                ?.map(f => ({ id: f.properties.id, room_code: f.properties.room_code })) || [];
            setRooms(filtered);
        } catch { setRooms([]); }
    }

    function handleFormChange(e) {
        const { name, value } = e.target;

        if (name === 'start_time') {
            // Keep the same class duration, just shift end time forward
            const hrs = durationHours(form.start_time, form.end_time);
            const newEnd = addHours(value, hrs);
            setForm(prev => ({ ...prev, start_time: value, end_time: newEnd }));
            return;
        }
        if (name === 'building_id') {
            setForm(prev => ({ ...prev, building_id: value, room_id: '' }));
            loadRooms(value);
            return;
        }
        setForm(prev => ({ ...prev, [name]: value }));
    }

    async function handleAdd(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    module_name:  form.module_name,
                    day_of_week:  parseInt(form.day_of_week),
                    start_time:   form.start_time,
                    end_time:     form.end_time,
                    building_id:  form.building_id || null,
                    room_id:      form.room_id || null,
                    location_note: form.location_note.trim() || null,
                }),
            });
            if (!res.ok) throw new Error('Failed to save');
            setShowForm(false);
            setForm({ module_name: '', day_of_week: '0', start_time: '09:00', end_time: '10:00', building_id: '', room_id: '', location_note: '' });
            setRooms([]);
            await loadAll();
        } catch {
            setError('Could not save entry. Please try again.');
        }
        setSaving(false);
    }

    async function handleDelete(id) {
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/timetable/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch {
            setError('Could not delete entry.');
        }
    }

    const byDay = DAYS.map((_, i) => entries.filter(e => e.day_of_week === i));

    const labelStyle = {
        display: 'flex', flexDirection: 'column', gap: 4,
        fontSize: 13, fontWeight: 600, color: labelClr,
    };
    const inputStyle = {
        padding: '9px 11px', borderRadius: 8,
        border: `1.5px solid ${border}`,
        fontSize: 14, marginTop: 2, outline: 'none',
        fontFamily: 'inherit',
        background: inputBg, color: textMain,
    };

    return (
        <>
            <style>{`
                .tt-page { min-height: 100vh; font-family: system-ui, sans-serif; }
                .tt-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white; padding: 0 16px;
                    height: 56px; display: flex; align-items: center;
                    justify-content: space-between;
                    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    box-sizing: border-box;
                }
                .tt-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
                .tt-title { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .tt-back-btn {
                    background: rgba(255,255,255,0.2); border: none; color: white;
                    border-radius: 8px; padding: 6px 10px; cursor: pointer;
                    font-size: 13px; font-weight: 600; flex-shrink: 0;
                }
                .tt-add-btn {
                    background: white; color: #667eea; border: none;
                    border-radius: 8px; padding: 7px 12px; cursor: pointer;
                    font-size: 13px; font-weight: 700; flex-shrink: 0; white-space: nowrap;
                }
                .tt-body { padding: 72px 16px 32px; max-width: 700px; margin: 0 auto; }
                .tt-card {
                    border-radius: 12px; padding: 14px 16px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                    display: flex; justify-content: space-between; align-items: flex-start;
                }
                .tt-card-actions { display: flex; gap: 6px; margin-left: 10px; flex-shrink: 0; }
                .tt-nav-btn {
                    background: #eff6ff; color: #2563eb; border: none;
                    border-radius: 7px; padding: 6px 10px; cursor: pointer;
                    font-size: 12px; font-weight: 600;
                }
                .tt-del-btn {
                    background: #fef2f2; color: #dc2626; border: none;
                    border-radius: 7px; padding: 6px 10px; cursor: pointer;
                    font-size: 12px; font-weight: 600;
                }
                .tt-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    z-index: 200; display: flex; align-items: center;
                    justify-content: center; padding: 16px;
                }
                .tt-modal {
                    border-radius: 16px; padding: 20px;
                    width: 100%; max-width: 440px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-height: 90vh; overflow-y: auto;
                }
                .tt-row { display: flex; gap: 10px; }
                .tt-cancel-btn {
                    flex: 1; padding: 11px; border-radius: 8px;
                    border: 1.5px solid; cursor: pointer; font-weight: 600; font-size: 14px;
                }
                .tt-save-btn {
                    flex: 1; padding: 11px; border-radius: 8px; border: none;
                    background: linear-gradient(135deg,#667eea,#764ba2);
                    color: white; cursor: pointer; font-weight: 700; font-size: 14px;
                }
                .tt-note-tag {
                    display: inline-block; margin-top: 4px;
                    background: rgba(99,102,241,0.12); color: #6366f1;
                    border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: 600;
                }
                @media (max-width: 400px) {
                    .tt-title { font-size: 14px; }
                    .tt-back-btn { padding: 5px 8px; font-size: 12px; }
                    .tt-add-btn { padding: 6px 10px; font-size: 12px; }
                    .tt-card { padding: 12px; }
                    .tt-card-actions { flex-direction: column; }
                    .tt-row { flex-direction: column; }
                }
            `}</style>

            <div className="tt-page" style={{ background: bg }}>
                {/* Header */}
                <div className="tt-header">
                    <div className="tt-header-left">
                        <button className="tt-back-btn" onClick={() => navigate('/navigator')}>← Map</button>
                        <span className="tt-title">📅 My Timetable</span>
                    </div>
                    <button className="tt-add-btn" onClick={() => setShowForm(true)}>+ Add Class</button>
                </div>

                <div className="tt-body">
                    {error && (
                        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                            {error}
                        </div>
                    )}

                    {/* Add class modal */}
                    {showForm && (
                        <div className="tt-modal-overlay">
                            <div className="tt-modal" style={{ background: card }}>
                                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, color: textMain }}>Add Class</div>
                                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <label style={labelStyle}>
                                        Module Name *
                                        <input name="module_name" value={form.module_name} onChange={handleFormChange} required style={inputStyle} placeholder="e.g. Software Engineering" />
                                    </label>
                                    <label style={labelStyle}>
                                        Day *
                                        <select name="day_of_week" value={form.day_of_week} onChange={handleFormChange} style={inputStyle}>
                                            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                        </select>
                                    </label>
                                    <div className="tt-row">
                                        <label style={{ ...labelStyle, flex: 1 }}>
                                            Start *
                                            <input name="start_time" type="time" value={form.start_time} onChange={handleFormChange} required style={inputStyle} />
                                        </label>
                                        <label style={{ ...labelStyle, flex: 1 }}>
                                            End *
                                            <input name="end_time" type="time" value={form.end_time} onChange={handleFormChange} required style={inputStyle} />
                                        </label>
                                    </div>
                                    <label style={labelStyle}>
                                        Building
                                        <select name="building_id" value={form.building_id} onChange={handleFormChange} style={inputStyle}>
                                            <option value="">-- Select building --</option>
                                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </label>
                                    {rooms.length > 0 && (
                                        <label style={labelStyle}>
                                            Room
                                            <select name="room_id" value={form.room_id} onChange={handleFormChange} style={inputStyle}>
                                                <option value="">-- Select room --</option>
                                                {rooms.map(r => <option key={r.id} value={r.id}>{r.room_code}</option>)}
                                            </select>
                                        </label>
                                    )}
                                    <label style={labelStyle}>
                                        Location note <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional — e.g. Room G12)</span>
                                        <input name="location_note" value={form.location_note} onChange={handleFormChange} style={inputStyle} placeholder="e.g. G12, ground floor" />
                                    </label>
                                    {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
                                    <div className="tt-row" style={{ marginTop: 6 }}>
                                        <button
                                            type="button"
                                            className="tt-cancel-btn"
                                            onClick={() => { setShowForm(false); setError(''); }}
                                            style={{ borderColor: border, background: card, color: textMain }}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={saving} className="tt-save-btn">
                                            {saving ? 'Saving…' : 'Save Class'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: textSub, fontSize: 15 }}>Loading your timetable…</div>
                    ) : entries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: textMain, marginBottom: 8 }}>No classes yet</div>
                            <div style={{ fontSize: 14, color: textSub, marginBottom: 20 }}>Add your weekly timetable and the app will navigate you to each class.</div>
                            <button onClick={() => setShowForm(true)} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
                                + Add First Class
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {DAYS.map((day, dayIdx) => {
                                const dayEntries = byDay[dayIdx];
                                if (dayEntries.length === 0) return null;
                                return (
                                    <div key={dayIdx}>
                                        <div style={{
                                            display: 'inline-block', background: DAY_COLORS[dayIdx],
                                            color: 'white', borderRadius: 8, padding: '4px 14px',
                                            fontSize: 13, fontWeight: 700, marginBottom: 10,
                                        }}>
                                            {day}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {dayEntries.map(entry => (
                                                <div key={entry.id} className="tt-card" style={{
                                                    background: card,
                                                    borderLeft: `4px solid ${DAY_COLORS[dayIdx]}`,
                                                }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 15, color: textMain, marginBottom: 3 }}>
                                                            {entry.module_name}
                                                        </div>
                                                        <div style={{ fontSize: 13, color: textSub, marginBottom: 4 }}>
                                                            {fmt(entry.start_time)} – {fmt(entry.end_time)}
                                                        </div>
                                                        {(entry.building_name || entry.location_note) && (
                                                            <div style={{ fontSize: 13, color: textMid }}>
                                                                📍 {[entry.building_name, entry.room_code, entry.location_note].filter(Boolean).join(' · ')}
                                                            </div>
                                                        )}
                                                        {entry.location_note && (
                                                            <span className="tt-note-tag">{entry.location_note}</span>
                                                        )}
                                                    </div>
                                                    <div className="tt-card-actions">
                                                        {entry.building_id && (
                                                            <button
                                                                className="tt-nav-btn"
                                                                onClick={() => {
                                                                    sessionStorage.setItem('scn_navigate_to', JSON.stringify({ id: `b_${entry.building_id}`, type: 'building' }));
                                                                    navigate('/navigator');
                                                                }}
                                                            >
                                                                Navigate
                                                            </button>
                                                        )}
                                                        <button className="tt-del-btn" onClick={() => handleDelete(entry.id)}>✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
