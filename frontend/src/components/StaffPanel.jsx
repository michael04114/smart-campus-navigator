import { useState, useEffect } from 'react';

export function StaffPanel({ buildings, rooms }) {
    const [showEventForm, setShowEventForm] = useState(false);
    const [showOccupancyForm, setShowOccupancyForm] = useState(false);
    const [showMyEvents, setShowMyEvents] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [myEvents, setMyEvents] = useState([]);
    const [editingEventId, setEditingEventId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Use Vite proxy — works on laptop AND phone via ngrok
    const API_BASE = '';

    const [eventData, setEventData] = useState({
        title: '',
        description: '',
        building_id: '',
        room_id: '',
        start_time: '',
        end_time: '',
        event_type: 'general',
        visibility: 'public'
    });

    const [occupancyData, setOccupancyData] = useState({
        building_id: '',
        room_id: '',
        current_occupants: '',
        occupancy_status: 'available'
    });

    useEffect(() => {
        if (showMyEvents) fetchMyEvents();
    }, [showMyEvents]);

    const fetchMyEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/events`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // The /api/events endpoint returns all events; filter to only mine
                // We rely on the token's userId matching created_by
                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                setMyEvents(data.filter(e => e.created_by === tokenPayload.userId));
            }
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create event');

            setMessage('✅ Event created successfully!');
            setMessageType('success');
            setEventData({ title: '', description: '', building_id: '', room_id: '', start_time: '', end_time: '', event_type: 'general', visibility: 'public' });
            setShowEventForm(false);
            if (showMyEvents) fetchMyEvents();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(`❌ ${error.message}`);
            setMessageType('error');
        }
    };

    const handleUpdateOccupancy = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/rooms/${occupancyData.room_id}/occupancy`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_occupants: parseInt(occupancyData.current_occupants),
                    occupancy_status: occupancyData.occupancy_status
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update occupancy');

            setMessage('✅ Room occupancy updated!');
            setMessageType('success');
            setOccupancyData({ building_id: '', room_id: '', current_occupants: '', occupancy_status: 'available' });
            setShowOccupancyForm(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            setMessage(`❌ ${error.message}`);
            setMessageType('error');
        }
    };

    const startEditEvent = (event) => {
        setEditingEventId(event.id);
        setEditForm({
            title: event.title,
            description: event.description || '',
            start_time: event.start_time ? event.start_time.slice(0, 16) : '',
            end_time: event.end_time ? event.end_time.slice(0, 16) : '',
            visibility: event.visibility || 'public',
        });
    };

    const handleEditSave = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/events/${eventId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(editForm),
            });
            if (response.ok) {
                setMessage('✅ Event updated!');
                setMessageType('success');
                setEditingEventId(null);
                fetchMyEvents();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('❌ Failed to update event');
            setMessageType('error');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Delete this event permanently?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setMessage('✅ Event deleted');
            setMessageType('success');
            fetchMyEvents();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('❌ Failed to delete event');
            setMessageType('error');
        }
    };

    const inputStyle = {
        padding: '10px 12px', borderRadius: '6px',
        border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
    };

    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .staff-event-card {
                        flex-direction: column !important;
                    }
                }
            `}</style>
            <div style={{
                background: 'rgba(255,255,255,0.95)', borderRadius: '16px',
                padding: '20px', marginTop: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👔 Staff Controls
                </h3>

                {message && (
                    <div style={{
                        padding: '12px', borderRadius: '8px', marginBottom: '16px',
                        background: messageType === 'success' ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${messageType === 'success' ? '#86efac' : '#fecaca'}`,
                        color: messageType === 'success' ? '#166534' : '#dc2626',
                        fontSize: '14px', fontWeight: '500',
                    }}>
                        {message}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* ── Create Event ── */}
                    <button
                        onClick={() => { setShowEventForm(!showEventForm); setShowOccupancyForm(false); setShowMyEvents(false); }}
                        style={{
                            padding: '12px 16px', borderRadius: '8px',
                            background: showEventForm ? '#667eea' : 'white',
                            color: showEventForm ? 'white' : '#667eea',
                            border: '2px solid #667eea', fontSize: '14px',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
                        }}
                    >
                        {showEventForm ? '✖ Close' : '➕ Create Event'}
                    </button>

                    {showEventForm && (
                        <form onSubmit={handleCreateEvent} style={{
                            background: '#f8fafc', padding: '16px', borderRadius: '8px',
                            display: 'flex', flexDirection: 'column', gap: '12px',
                        }}>
                            <input style={inputStyle} type="text" placeholder="Event Title"
                                value={eventData.title}
                                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                                required />
                            <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                                placeholder="Description" value={eventData.description} rows={3}
                                onChange={(e) => setEventData({ ...eventData, description: e.target.value })} />
                            <select style={inputStyle} value={eventData.building_id} required
                                onChange={(e) => setEventData({ ...eventData, building_id: e.target.value, room_id: '' })}>
                                <option value="">Select Building</option>
                                {buildings?.features?.map(b => (
                                    <option key={b.properties.id} value={b.properties.id}>{b.properties.name}</option>
                                ))}
                            </select>
                            <select style={inputStyle} value={eventData.room_id}
                                onChange={(e) => setEventData({ ...eventData, room_id: e.target.value })}
                                disabled={!eventData.building_id}>
                                <option value="">{eventData.building_id ? 'Select Room (Optional)' : 'Select a building first'}</option>
                                {rooms?.features
                                    ?.filter(r => !eventData.building_id || String(r.properties.building_id) === String(eventData.building_id))
                                    ?.map(r => (
                                        <option key={r.properties.id} value={r.properties.id}>
                                            {r.properties.room_code}
                                        </option>
                                    ))}
                            </select>
                            <input style={inputStyle} type="datetime-local" value={eventData.start_time} required
                                onChange={(e) => setEventData({ ...eventData, start_time: e.target.value })} />
                            <input style={inputStyle} type="datetime-local" value={eventData.end_time} required
                                onChange={(e) => setEventData({ ...eventData, end_time: e.target.value })} />
                            <select style={inputStyle} value={eventData.visibility}
                                onChange={(e) => setEventData({ ...eventData, visibility: e.target.value })}>
                                <option value="public">🌍 Public (Everyone can see)</option>
                                <option value="students_only">🎓 Students Only</option>
                                <option value="staff_only">👔 Staff Only</option>
                            </select>
                            <button type="submit" style={{
                                padding: '12px', borderRadius: '6px', border: 'none',
                                background: '#667eea', color: 'white', fontSize: '14px',
                                fontWeight: '600', cursor: 'pointer',
                            }}>
                                Create Event
                            </button>
                        </form>
                    )}

                    {/* ── My Events ── */}
                    <button
                        onClick={() => { setShowMyEvents(!showMyEvents); setShowEventForm(false); setShowOccupancyForm(false); }}
                        style={{
                            padding: '12px 16px', borderRadius: '8px',
                            background: showMyEvents ? '#764ba2' : 'white',
                            color: showMyEvents ? 'white' : '#764ba2',
                            border: '2px solid #764ba2', fontSize: '14px',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
                        }}
                    >
                        {showMyEvents ? '✖ Close' : '📋 My Events'}
                    </button>

                    {showMyEvents && (
                        <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {myEvents.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: 0 }}>
                                    You haven't created any events yet.
                                </p>
                            ) : myEvents.map(event => (
                                <div key={event.id} style={{
                                    background: 'white', borderRadius: '8px', padding: '12px',
                                    border: '1px solid #e9d5ff',
                                }}>
                                    {editingEventId === event.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <input style={inputStyle} value={editForm.title}
                                                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                                placeholder="Title" />
                                            <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} rows={2}
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
                                                <button onClick={() => handleEditSave(event.id)} style={{
                                                    flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                                                    background: '#667eea', color: 'white', fontSize: '13px',
                                                    fontWeight: '600', cursor: 'pointer', minHeight: '36px',
                                                }}>✓ Save</button>
                                                <button onClick={() => setEditingEventId(null)} style={{
                                                    flex: 1, padding: '8px', borderRadius: '6px',
                                                    border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b',
                                                    fontSize: '13px', cursor: 'pointer', minHeight: '36px',
                                                }}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="staff-event-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{event.title}</div>
                                                {event.description && (
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{event.description}</div>
                                                )}
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                    🕐 {new Date(event.start_time).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    {event.building_name && ` · 📍 ${event.building_name}`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                <button onClick={() => startEditEvent(event)} style={{
                                                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                                                    background: '#667eea', color: 'white', fontSize: '12px',
                                                    fontWeight: '600', cursor: 'pointer', minHeight: '32px',
                                                }}>✏️ Edit</button>
                                                <button onClick={() => handleDeleteEvent(event.id)} style={{
                                                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                                                    background: '#ef4444', color: 'white', fontSize: '12px',
                                                    fontWeight: '600', cursor: 'pointer', minHeight: '32px',
                                                }}>🗑️ Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Update Room Occupancy ── */}
                    <button
                        onClick={() => { setShowOccupancyForm(!showOccupancyForm); setShowEventForm(false); setShowMyEvents(false); }}
                        style={{
                            padding: '12px 16px', borderRadius: '8px',
                            background: showOccupancyForm ? '#10b981' : 'white',
                            color: showOccupancyForm ? 'white' : '#10b981',
                            border: '2px solid #10b981', fontSize: '14px',
                            fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease',
                        }}
                    >
                        {showOccupancyForm ? '✖ Close' : '📊 Update Room Occupancy'}
                    </button>

                    {showOccupancyForm && (
                        <form onSubmit={handleUpdateOccupancy} style={{
                            background: '#f0fdf4', padding: '16px', borderRadius: '8px',
                            display: 'flex', flexDirection: 'column', gap: '12px',
                        }}>
                            <select style={inputStyle} value={occupancyData.building_id} required
                                onChange={(e) => setOccupancyData({ ...occupancyData, building_id: e.target.value, room_id: '' })}>
                                <option value="">Select Building</option>
                                {buildings?.features?.map(b => (
                                    <option key={b.properties.id} value={b.properties.id}>{b.properties.name}</option>
                                ))}
                            </select>
                            <select style={inputStyle} value={occupancyData.room_id} required
                                onChange={(e) => setOccupancyData({ ...occupancyData, room_id: e.target.value })}
                                disabled={!occupancyData.building_id}>
                                <option value="">{occupancyData.building_id ? 'Select Room' : 'Select a building first'}</option>
                                {rooms?.features
                                    ?.filter(r => !occupancyData.building_id || String(r.properties.building_id) === String(occupancyData.building_id))
                                    ?.map(r => (
                                        <option key={r.properties.id} value={r.properties.id}>
                                            {r.properties.room_code}
                                        </option>
                                    ))}
                            </select>
                            <input style={inputStyle} type="number" placeholder="Current Occupants"
                                value={occupancyData.current_occupants} required min="0"
                                onChange={(e) => setOccupancyData({ ...occupancyData, current_occupants: e.target.value })} />
                            <select style={inputStyle} value={occupancyData.occupancy_status}
                                onChange={(e) => setOccupancyData({ ...occupancyData, occupancy_status: e.target.value })}>
                                <option value="empty">Empty (0 people)</option>
                                <option value="available">Available</option>
                                <option value="occupied">Occupied</option>
                                <option value="busy">Busy</option>
                                <option value="full">Full</option>
                            </select>
                            <button type="submit" style={{
                                padding: '12px', borderRadius: '6px', border: 'none',
                                background: '#10b981', color: 'white', fontSize: '14px',
                                fontWeight: '600', cursor: 'pointer',
                            }}>
                                Update Occupancy
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}
