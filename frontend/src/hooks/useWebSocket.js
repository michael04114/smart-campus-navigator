// Custom React hook for WebSocket connection
import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket(serverUrl = 'http://localhost:5000') {
    const [isConnected, setIsConnected] = useState(false);
    const [events, setEvents] = useState([]);
    const [occupancyUpdates, setOccupancyUpdates] = useState({});
    const socketRef = useRef(null);

    useEffect(() => {
        const socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socketRef.current = socket;

        socket.on('connection_success', (data) => {
            console.log('✅ WebSocket connected:', data.message);
            setIsConnected(true);
        });

        socket.on('new_event', (data) => {
            console.log('📅 New event:', data);
            setEvents(prev => [data.event, ...prev]);

            if (Notification.permission === 'granted') {
                new Notification('New Campus Event', {
                    body: data.message,
                    icon: '/campus-icon.png'
                });
            }
        });

        socket.on('occupancy_update', (data) => {
            console.log('👥 Occupancy update:', data);
            setOccupancyUpdates(prev => ({
                ...prev,
                [data.room_id]: {
                    room_code: data.room_code,
                    current_occupants: data.current_occupants,
                    capacity: data.capacity,
                    status: data.occupancy_status,
                    timestamp: data.timestamp
                }
            }));
        });

        socket.on('event_cancelled', (data) => {
            console.log('❌ Event cancelled:', data);
            setEvents(prev => prev.filter(e => e.id !== data.event_id));

            if (Notification.permission === 'granted') {
                new Notification('Event Cancelled', {
                    body: data.message,
                    icon: '/campus-icon.png'
                });
            }
        });

        socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            setIsConnected(false);
        });

        socket.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected');
            setIsConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [serverUrl]);

    const subscribeToRoom = useCallback((roomId) => {
        if (socketRef.current) {
            socketRef.current.emit('subscribe_room', roomId);
            console.log(`📍 Subscribed to room ${roomId}`);
        }
    }, []);

    const subscribeToBuilding = useCallback((buildingId) => {
        if (socketRef.current) {
            socketRef.current.emit('subscribe_building', buildingId);
            console.log(`🏢 Subscribed to building ${buildingId}`);
        }
    }, []);

    return {
        isConnected,
        events,
        occupancyUpdates,
        subscribeToRoom,
        subscribeToBuilding
    };
}