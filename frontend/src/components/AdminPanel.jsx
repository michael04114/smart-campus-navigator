import { useState, useEffect } from 'react';

export function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [editingUser, setEditingUser] = useState(null);

    // CRITICAL: Use empty string to use Vite proxy (works on laptop AND phone)
    const API_BASE = '';

    // Pending staff = role is staff AND not active AND never approved
    // Catches both is_verified=false (new accounts) and is_verified=null (legacy accounts before column existed)
    const pendingStaff = users.filter(u => u.role === 'staff' && !u.is_active && u.is_verified !== true);
    const activeUsers = users.filter(u => !(u.role === 'staff' && !u.is_active && u.is_verified !== true));

    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/users/${userId}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (response.ok) {
                setMessage('✅ User status updated');
                fetchUsers();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            setMessage('❌ Failed to update user');
        }
    };

    const changeUserRole = async (userId, newRole) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                setMessage('✅ User role updated');
                setEditingUser(null);
                fetchUsers();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('❌ Failed to update role');
            }
        } catch (error) {
            setMessage('❌ Failed to update role');
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setMessage('✅ User deleted');
                fetchUsers();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('❌ Failed to delete user');
            }
        } catch (error) {
            setMessage('❌ Failed to delete user');
        }
    };

    const approveStaff = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/users/${userId}/verify`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setMessage('✅ Staff account approved');
                fetchUsers();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('❌ Failed to approve');
            }
        } catch {
            setMessage('❌ Failed to approve');
        }
    };

    const rejectStaff = async (userId) => {
        if (!confirm('Reject and delete this staff registration?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setMessage('✅ Staff registration rejected and removed');
                fetchUsers();
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('❌ Failed to reject');
            }
        } catch {
            setMessage('❌ Failed to reject');
        }
    };

    return (
        <>
            {/* MOBILE RESPONSIVE CSS */}
            <style>{`
                @media (max-width: 768px) {
                    .admin-stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    
                    .admin-user-card {
                        flex-direction: column !important;
                        gap: 12px !important;
                    }
                    
                    .admin-user-info {
                        width: 100% !important;
                    }
                    
                    .admin-action-buttons {
                        width: 100% !important;
                        justify-content: stretch !important;
                    }
                    
                    .admin-action-buttons button {
                        flex: 1 !important;
                        font-size: 12px !important;
                        min-height: 44px !important;
                    }
                    
                    .admin-role-selector {
                        width: 100% !important;
                    }
                    
                    .admin-role-selector select {
                        width: 100% !important;
                        font-size: 16px !important;
                        min-height: 44px !important;
                    }
                }
            `}</style>

            <div style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '16px',
                padding: '20px',
                marginTop: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}>
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    ⚙️ Admin Dashboard
                </h3>

                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        background: message.includes('✅') ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${message.includes('✅') ? '#86efac' : '#fecaca'}`,
                        color: message.includes('✅') ? '#166534' : '#dc2626',
                        fontSize: '14px',
                    }}>
                        {message}
                    </div>
                )}

                {/* System Stats */}
                {stats && (
                    <div className="admin-stats-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            background: '#eff6ff',
                            padding: '16px',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e40af' }}>
                                {stats.totalUsers || 0}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                Total Users
                            </div>
                        </div>
                        <div style={{
                            background: '#f0fdf4',
                            padding: '16px',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534' }}>
                                {stats.activeUsers || 0}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                Active Users
                            </div>
                        </div>
                        <div style={{
                            background: '#fef3c7',
                            padding: '16px',
                            borderRadius: '8px',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#92400e' }}>
                                {stats.totalEvents || 0}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                Active Events
                            </div>
                        </div>
                    </div>
                )}

                {/* Pending Staff Approvals */}
                {pendingStaff.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            fontSize: '15px', fontWeight: '700', color: '#92400e',
                            marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            ⏳ Pending Staff Approvals
                            <span style={{
                                background: '#f59e0b', color: 'white', borderRadius: '999px',
                                padding: '1px 8px', fontSize: '12px', fontWeight: '700',
                            }}>{pendingStaff.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {pendingStaff.map(u => (
                                <div key={u.id} style={{
                                    background: '#fffbeb', border: '1px solid #fde68a',
                                    borderRadius: '10px', padding: '12px',
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{u.full_name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{u.email}</div>
                                        <div style={{ fontSize: '11px', color: '#92400e', marginTop: '4px' }}>
                                            Registered {new Date(u.created_at).toLocaleDateString('en-GB')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => approveStaff(u.id)}
                                            style={{
                                                padding: '8px 14px', borderRadius: '8px', border: 'none',
                                                background: '#10b981', color: 'white', fontSize: '13px',
                                                fontWeight: '700', cursor: 'pointer', minHeight: '36px',
                                            }}
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => rejectStaff(u.id)}
                                            style={{
                                                padding: '8px 14px', borderRadius: '8px', border: 'none',
                                                background: '#ef4444', color: 'white', fontSize: '13px',
                                                fontWeight: '700', cursor: 'pointer', minHeight: '36px',
                                            }}
                                        >
                                            ✕ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* User Management */}
                <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '12px',
                }}>
                    User Management
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        Loading users...
                    </div>
                ) : activeUsers.length === 0 ? (
                    <div style={{
                        background: '#f8fafc',
                        padding: '16px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '14px',
                    }}>
                        No users found. (Admin endpoints may need to be added to backend)
                    </div>
                ) : (
                    <div style={{
                        maxHeight: '400px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}>
                        {activeUsers.map(user => (
                            <div key={user.id} className="admin-user-card" style={{
                                background: '#f8fafc',
                                padding: '12px',
                                borderRadius: '8px',
                                border: editingUser === user.id ? '2px solid #667eea' : '1px solid #e2e8f0',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px',
                                }}>
                                    <div className="admin-user-info" style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                            {user.full_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                            {user.email}
                                        </div>

                                        {/* Role selector (when editing) */}
                                        {editingUser === user.id ? (
                                            <div className="admin-role-selector" style={{
                                                marginTop: '8px',
                                                display: 'flex',
                                                gap: '8px',
                                                alignItems: 'center'
                                            }}>
                                                <select
                                                    defaultValue={user.role}
                                                    onChange={(e) => changeUserRole(user.id, e.target.value)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        fontSize: '12px',
                                                        outline: 'none',
                                                    }}
                                                >
                                                    <option value="student">🎓 Student</option>
                                                    <option value="staff">👔 Staff</option>
                                                    <option value="admin">⚙️ Admin</option>
                                                </select>
                                                <button
                                                    onClick={() => setEditingUser(null)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        background: '#f8fafc',
                                                        color: '#1e293b',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{
                                                marginTop: '4px',
                                                fontSize: '11px',
                                                display: 'inline-block',
                                                padding: '3px 8px',
                                                borderRadius: '12px',
                                                background: user.role === 'admin' ? '#fef3c7' : user.role === 'staff' ? '#dbeafe' : '#f0fdf4',
                                                color: user.role === 'admin' ? '#92400e' : user.role === 'staff' ? '#1e40af' : '#166534',
                                                fontWeight: '600',
                                            }}>
                                                {user.role === 'admin' ? '⚙️ Admin' : user.role === 'staff' ? '👔 Staff' : '🎓 Student'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="admin-action-buttons" style={{
                                        display: 'flex',
                                        gap: '6px',
                                        alignItems: 'center'
                                    }}>
                                        <button
                                            onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#667eea',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {editingUser === user.id ? 'Done' : 'Role'}
                                        </button>

                                        <button
                                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: user.is_active ? '#10b981' : '#ef4444',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {user.is_active ? 'Active' : 'Off'}
                                        </button>

                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: '#ef4444',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Del
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
