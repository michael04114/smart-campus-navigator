import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export function OccupancyStatus({ selectedRoom }) {
    const [occupancy, setOccupancy] = useState(null);
    const [history, setHistory] = useState([]);
    const { user } = useAuth();

    // CRITICAL: Use empty string to use Vite proxy (works on laptop AND phone)
    const API_BASE = '';

    useEffect(() => {
        if (!selectedRoom || !user) {
            setOccupancy(null);
            setHistory([]);
            return;
        }

        const roomId = selectedRoom.properties?.id;
        if (!roomId) return;

        // Fetch current occupancy
        fetchOccupancy(roomId);
        fetchOccupancyHistory(roomId);

        const socket = io();

        socket.on('connect', () => {
            socket.emit('subscribe_room', roomId);
        });

        socket.on('room_occupancy_change', (data) => {
            if (data.room_id === roomId || data.id === roomId) {
                // Re-fetch from DB to get the freshest persisted values
                fetchOccupancy(roomId);
            }
        });

        socket.on('occupancy_update', (data) => {
            if (data.room_id === roomId || data.id === roomId) {
                fetchOccupancy(roomId);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [selectedRoom, user]);

    const fetchOccupancy = async (roomId) => {
        try {
            console.log('🔍 Fetching occupancy for room:', roomId);
            const response = await fetch(`${API_BASE}/api/rooms/${roomId}`);
            const data = await response.json();
            console.log('📊 Occupancy data received:', data);

            // Handle both direct room data and nested feature data
            if (data.properties) {
                setOccupancy(data.properties);
            } else {
                setOccupancy(data);
            }
        } catch (error) {
            console.error('❌ Error fetching occupancy:', error);
        }
    };

    const fetchOccupancyHistory = async (roomId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/rooms/${roomId}/occupancy-history`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📈 History data:', data);
                setHistory(data || []);
            }
        } catch (error) {
            console.error('❌ Error fetching history:', error);
        }
    };

    // Don't show anything if user is not logged in
    if (!user) {
        return (
            <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '16px',
            }}>
                <div style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    color: 'white',
                }}>
                    📊 Room Occupancy
                </div>
                <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.8)',
                    textAlign: 'center',
                    padding: '20px 10px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                }}>
                    🔒 Login to view room occupancy status
                </div>
            </div>
        );
    }

    if (!selectedRoom) {
        return null;
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'empty':     return '#64748b';
            case 'available': return '#10b981';
            case 'busy':
            case 'occupied':  return '#f59e0b';
            case 'full':      return '#ef4444';
            default:          return '#64748b';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'empty':     return 'Empty';
            case 'available': return 'Available';
            case 'busy':      return 'Busy';
            case 'occupied':  return 'Occupied';
            case 'full':      return 'Full';
            default:          return 'Unknown';
        }
    };

    // Get occupancy data from either occupancy state or selectedRoom properties
    const roomData = occupancy || selectedRoom.properties;
    const currentOccupants = roomData?.current_occupants ?? 0;
    const capacity = roomData?.capacity;
    const status = roomData?.occupancy_status || 'unknown';
    const lastUpdated = roomData?.last_updated;

    return (
        <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '16px',
        }}>
            <div style={{
                fontSize: '15px',
                fontWeight: '700',
                marginBottom: '12px',
                color: 'white',
            }}>
                📊 Room Occupancy
            </div>

            <div>
                <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '12px',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                    }}>
                        <span style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#1e293b',
                        }}>
                            {selectedRoom.properties.room_code}
                        </span>
                        <span style={{
                            fontSize: '12px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: getStatusColor(status),
                            color: 'white',
                            fontWeight: '600',
                        }}>
                            {getStatusText(status)}
                        </span>
                    </div>

                    <div style={{
                        fontSize: '13px',
                        color: '#64748b',
                        display: 'flex',
                        justifyContent: 'space-between',
                    }}>
                        <span>
                            Current: <strong>{currentOccupants}</strong>
                        </span>
                        <span>
                            Capacity: <strong>{capacity || 'N/A'}</strong>
                        </span>
                    </div>

                    {capacity && capacity > 0 && (
                        <div style={{
                            marginTop: '10px',
                            height: '8px',
                            background: '#e2e8f0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min((currentOccupants / capacity) * 100, 100)}%`,
                                background: getStatusColor(status),
                                transition: 'width 0.3s ease',
                            }} />
                        </div>
                    )}

                    {lastUpdated && (
                        <div style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            marginTop: '8px',
                        }}>
                            Updated: {new Date(lastUpdated).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        </div>
                    )}
                </div>

                {history.length > 0 && (
                    <div style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.9)',
                    }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                            Recent History:
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            maxHeight: '120px',
                            overflowY: 'auto',
                        }}>
                            {history.slice(0, 5).map((record, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <span>{record.occupant_count} people</span>
                                    <span>{new Date(record.timestamp).toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
