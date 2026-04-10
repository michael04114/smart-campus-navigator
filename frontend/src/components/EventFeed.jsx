import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return then.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function EventFeed() {
    const [events, setEvents] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editLoading, setEditLoading] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [feedError, setFeedError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchEvents();

        const socket = io();
        socket.on('new_event', (event) => setEvents(prev => [event, ...prev]));
        socket.on('event_cancelled', ({ eventId }) =>
            setEvents(prev => prev.filter(e => e.id !== parseInt(eventId))));
        socket.on('event_updated', (updated) =>
            setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e)));
        socket.on('event_deleted', ({ eventId }) =>
            setEvents(prev => prev.filter(e => e.id !== eventId)));
        return () => socket.disconnect();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    // Admin can always manage any event.
    // Staff can manage events they created (created_by matches their id).
    const canManage = (event) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'staff') {
            // Use loose equality to handle any int/string type mismatch
            // eslint-disable-next-line eqeqeq
            return event.created_by != null && event.created_by == user.id;
        }
        return false;
    };

    const startEdit = (event) => {
        setFeedError('');
        setConfirmDeleteId(null);
        setEditingId(event.id);
        setEditForm({
            title: event.title || '',
            description: event.description || '',
            start_time: event.start_time ? event.start_time.slice(0, 16) : '',
            end_time: event.end_time ? event.end_time.slice(0, 16) : '',
            visibility: event.visibility || 'public',
        });
    };

    const handleEditSave = async (eventId) => {
        setEditLoading(true);
        setFeedError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(editForm),
            });
            const data = await response.json();
            if (response.ok) {
                setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...data } : e));
                setEditingId(null);
            } else {
                setFeedError(data.error || 'Failed to update event.');
            }
        } catch (err) {
            setFeedError('Network error — could not update event.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async (eventId) => {
        setFeedError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                setEvents(prev => prev.filter(e => e.id !== eventId));
                setConfirmDeleteId(null);
            } else {
                const data = await response.json();
                setFeedError(data.error || 'Failed to delete event.');
                setConfirmDeleteId(null);
            }
        } catch (err) {
            setFeedError('Network error — could not delete event.');
            setConfirmDeleteId(null);
        }
    };

    const filteredEvents = events.filter(event => {
        if (!event.visibility || event.visibility === 'public') return true;
        if (!user) return false;
        if (event.visibility === 'students_only') return ['student', 'staff', 'admin'].includes(user.role);
        if (event.visibility === 'staff_only') return ['staff', 'admin'].includes(user.role);
        return false;
    });

    const inputStyle = {
        width: '100%', padding: '7px 10px', borderRadius: '6px',
        border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
        boxSizing: 'border-box', fontFamily: 'inherit',
    };

    if (filteredEvents.length === 0) {
        return (
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: 'white' }}>
                    📅 Campus Events
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', padding: '20px' }}>
                    {!user ? 'No public events available. Login to see more events.' : 'No events available at the moment.'}
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '16px' }}>
            <div style={{
                fontSize: '15px', fontWeight: '700', marginBottom: '12px', color: 'white',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span>📅 Campus Events</span>
                {!user && <span style={{ fontSize: '11px', fontWeight: '500', opacity: 0.8 }}>Public only</span>}
            </div>

            {feedError && (
                <div style={{
                    padding: '10px 12px', marginBottom: '10px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fca5a5', fontSize: '13px',
                }}>
                    ❌ {feedError}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {filteredEvents.map((event) => (
                    <div key={event.id} style={{
                        background: 'rgba(255,255,255,0.95)', borderRadius: '10px',
                        padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}>
                        {editingId === event.id ? (
                            /* ── Inline edit form ── */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input style={inputStyle} value={editForm.title}
                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Title" />
                                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
                                    value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Description" />
                                <input style={inputStyle} type="datetime-local" value={editForm.start_time}
                                    onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))} />
                                <input style={inputStyle} type="datetime-local" value={editForm.end_time}
                                    onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))} />
                                <select style={inputStyle} value={editForm.visibility}
                                    onChange={e => setEditForm(f => ({ ...f, visibility: e.target.value }))}>
                                    <option value="public">🌍 Public</option>
                                    <option value="students_only">🎓 Students Only</option>
                                    <option value="staff_only">👔 Staff Only</option>
                                </select>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleEditSave(event.id)} disabled={editLoading} style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                                        background: editLoading ? '#94a3b8' : '#667eea', color: 'white',
                                        fontSize: '13px', fontWeight: '600', cursor: editLoading ? 'not-allowed' : 'pointer',
                                        minHeight: '36px',
                                    }}>
                                        {editLoading ? 'Saving...' : '✓ Save'}
                                    </button>
                                    <button onClick={() => { setEditingId(null); setFeedError(''); }} style={{
                                        flex: 1, padding: '8px', borderRadius: '6px',
                                        border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b',
                                        fontSize: '13px', cursor: 'pointer', minHeight: '36px',
                                    }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : confirmDeleteId === event.id ? (
                            /* ── Inline delete confirmation (replaces confirm() for mobile) ── */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
                                    Delete "{event.title}"? This cannot be undone.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleDelete(event.id)} style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                                        background: '#ef4444', color: 'white', fontSize: '13px',
                                        fontWeight: '600', cursor: 'pointer', minHeight: '36px',
                                    }}>
                                        Yes, Delete
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(null)} style={{
                                        flex: 1, padding: '8px', borderRadius: '6px',
                                        border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b',
                                        fontSize: '13px', cursor: 'pointer', minHeight: '36px',
                                    }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── Normal display ── */
                            <>
                                <div style={{
                                    fontSize: '14px', fontWeight: '700', color: '#1e293b',
                                    marginBottom: '4px', display: 'flex',
                                    justifyContent: 'space-between', alignItems: 'start', gap: '8px',
                                }}>
                                    <span style={{ flex: 1 }}>{event.title}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        {event.visibility && event.visibility !== 'public' && (
                                            <span style={{
                                                fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
                                                background: event.visibility === 'students_only' ? '#dbeafe' : '#fef3c7',
                                                color: event.visibility === 'students_only' ? '#1e40af' : '#92400e',
                                                fontWeight: '600',
                                            }}>
                                                {event.visibility === 'students_only' ? '🎓 Students' : '👔 Staff'}
                                            </span>
                                        )}
                                        {canManage(event) && (
                                            <>
                                                <button
                                                    onClick={() => startEdit(event)}
                                                    title="Edit event"
                                                    style={{
                                                        background: '#eff6ff', border: '1px solid #bfdbfe',
                                                        borderRadius: '6px', cursor: 'pointer',
                                                        fontSize: '13px', padding: '3px 7px', lineHeight: 1,
                                                        minHeight: '28px', minWidth: '28px',
                                                    }}
                                                >✏️</button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(event.id)}
                                                    title="Delete event"
                                                    style={{
                                                        background: '#fef2f2', border: '1px solid #fecaca',
                                                        borderRadius: '6px', cursor: 'pointer',
                                                        fontSize: '13px', padding: '3px 7px', lineHeight: 1,
                                                        minHeight: '28px', minWidth: '28px',
                                                    }}
                                                >🗑️</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {event.description && (
                                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                        {event.description}
                                    </div>
                                )}
                                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {event.building_name && <span>📍 {event.building_name}</span>}
                                    {event.room_code && <span>🚪 Room {event.room_code}</span>}
                                    <span>🕐 {new Date(event.start_time).toLocaleString('en-GB', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}</span>
                                    {event.created_at && (
                                        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
                                            Posted {timeAgo(event.created_at)}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
