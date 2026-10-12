import { useEffect, useState } from 'react';
import { createUser, deleteUser, getAdminAuditLogs, getUserDetail, getUsers, updateUserRole, updateUserStatus } from '../lib/api';
import { realtime, useRealtimeStatus } from '../lib/realtime';
import type { AuditLogEntry, User, UserDetailResponse, UserRole } from '../types/auth';

interface UserRoleManagementProps {
  currentUser?: User | null;
  onSwitchToAdmin?: () => void;
}

export function UserRoleManagement({ currentUser, onSwitchToAdmin }: UserRoleManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Active Tab: 'users' | 'audit'
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Modals state
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('Support Agent');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const [statusToggleUser, setStatusToggleUser] = useState<User | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'Support Agent' as UserRole,
    team: '',
    password: '',
  });

  const isAdmin = currentUser?.role === 'Admin';

  const loadUsers = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setUsers(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to load user records.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!isAdmin) return;
    try {
      const logs = await getAdminAuditLogs(auditSearch || undefined, 100);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'users') {
        loadUsers();
      } else {
        loadAuditLogs();
      }
    }
  }, [isAdmin, page, roleFilter, statusFilter, activeTab]);

  const isRealtimeConnected = useRealtimeStatus();

  // Auto-sync on live user modification events
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = realtime.subscribe((event) => {
      if (event.type.startsWith('user:')) {
        if (activeTab === 'users') {
          loadUsers();
        } else {
          loadAuditLogs();
        }
      }
    });
    return unsubscribe;
  }, [isAdmin, activeTab, page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleOpenDetail = async (user: User) => {
    try {
      const detail = await getUserDetail(user.id);
      setSelectedUserDetail(detail);
      setIsDetailOpen(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load user details.');
    }
  };

  const handleOpenRoleModal = (user: User) => {
    setRoleChangeUser(user);
    setNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeUser) return;
    try {
      await updateUserRole(roleChangeUser.id, newRole);
      setSuccessMessage(`Successfully updated ${roleChangeUser.name}'s role to ${newRole}.`);
      setIsRoleModalOpen(false);
      setRoleChangeUser(null);
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Role change failed.');
    }
  };

  const handleOpenStatusModal = (user: User) => {
    setStatusToggleUser(user);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusToggleUser) return;
    const targetStatus = !statusToggleUser.active;
    try {
      await updateUserStatus(statusToggleUser.id, targetStatus);
      setSuccessMessage(`Account ${targetStatus ? 'activated' : 'deactivated'} for ${statusToggleUser.name}.`);
      setIsStatusModalOpen(false);
      setStatusToggleUser(null);
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Status update failed.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    try {
      await deleteUser(deleteConfirmUser.id);
      setSuccessMessage(`User ${deleteConfirmUser.name} deleted successfully.`);
      setDeleteConfirmUser(null);
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'User deletion failed.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(createForm);
      setSuccessMessage(`User ${createForm.name} created successfully.`);
      setIsCreateOpen(false);
      setCreateForm({ name: '', email: '', role: 'Support Agent', team: '', password: '' });
      loadUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'User creation failed.');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin': return <span className="role-badge admin">👑 Admin</span>;
      case 'Senior Support Staff': return <span className="role-badge senior">⭐ Senior Lead</span>;
      case 'Support Agent': return <span className="role-badge agent">🎧 Support Agent</span>;
      default: return <span className="role-badge customer">👤 Customer</span>;
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '18px', padding: '40px', border: '1px solid #ded2c1', textAlign: 'center', boxShadow: '0 8px 24px rgba(90, 64, 47, 0.05)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ color: '#1e130c', margin: '0 0 10px' }}>Administrator Access Required</h2>
        <p style={{ color: '#786253', maxWidth: '520px', margin: '0 auto 24px' }}>
          User &amp; Role Management is restricted to users with the <strong>Admin</strong> role. Customers, support agents, and senior staff cannot manage user accounts or modify privileges.
        </p>
        {onSwitchToAdmin ? (
          <button type="button" className="btn-primary" onClick={onSwitchToAdmin}>
            👑 Switch to Administrator Account
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner */}
      <div className="analytics-hero" style={{ background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)' }}>
        <div className="analytics-hero-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
            <h1 style={{ margin: 0 }}>User Authentication &amp; Role Management</h1>
            <div className={`realtime-live-badge ${isRealtimeConnected ? '' : 'disconnected'}`}>
              <span className={`realtime-pulse-dot ${isRealtimeConnected ? '' : 'disconnected'}`} />
              <span>{isRealtimeConnected ? 'Live Real-Time Stream Active' : 'Connecting to Stream...'}</span>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={() => setIsCreateOpen(true)} style={{ background: '#4f46e5' }}>
            ➕ Add New User
          </button>
        </div>
        <p className="analytics-hero-desc">
          Manage system users, assign role-based permissions (Customer, Support Agent, Senior Support Staff, Admin), activate/deactivate accounts, and inspect the security audit trail.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #ded2c1', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`secondary-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          style={{ fontWeight: activeTab === 'users' ? 700 : 500 }}
        >
          👤 User Directory ({total})
        </button>
        <button
          type="button"
          className={`secondary-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
          style={{ fontWeight: activeTab === 'audit' ? 700 : 500 }}
        >
          🛡️ Security Audit Logs
        </button>
      </div>

      {successMessage ? (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', color: '#065f46', fontSize: '0.9rem' }}>
          ✅ {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div style={{ padding: '12px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '0.9rem' }}>
          ⚠️ {errorMessage}
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <>
          {/* Filter Bar */}
          <div className="analytics-filters-bar">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
              <input
                type="text"
                className="filter-input"
                style={{ flex: 1 }}
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn-secondary">
                🔍 Search
              </button>
            </form>

            <div className="filter-group">
              <label>Role</label>
              <select
                className="filter-select"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Senior Support Staff">Senior Support Staff</option>
                <option value="Support Agent">Support Agent</option>
                <option value="Customer">Customer</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
            </div>

            <button type="button" className="btn-secondary" onClick={loadUsers} style={{ alignSelf: 'flex-end' }}>
              🔄 Refresh
            </button>
          </div>

          {/* Users Table */}
          <div style={{ background: '#ffffff', border: '1px solid #ded2c1', borderRadius: '18px', padding: '20px', boxShadow: '0 6px 20px rgba(90, 64, 47, 0.04)' }}>
            <div className="custom-table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Team / Dept</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Last Login</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#7c6858' }}>
                        Loading users from database...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#7c6858' }}>
                        No user accounts match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1e130c' }}>{user.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#786253' }}>{user.email}</div>
                        </td>
                        <td>{getRoleBadge(user.role)}</td>
                        <td>{user.team || '—'}</td>
                        <td>
                          {user.active ? (
                            <span className="status-badge-active">● Active</span>
                          ) : (
                            <span className="status-badge-inactive">○ Deactivated</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#5c483b' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#5c483b' }}>
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => handleOpenDetail(user)}
                              title="View details and audit activity"
                            >
                              👁️ Details
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => handleOpenRoleModal(user)}
                              title="Change Role"
                            >
                              ✏️ Role
                            </button>
                            <button
                              type="button"
                              className={`btn-secondary btn-sm`}
                              onClick={() => handleOpenStatusModal(user)}
                              title={user.active ? 'Deactivate account' : 'Activate account'}
                              style={{ color: user.active ? '#b91c1c' : '#047857' }}
                            >
                              {user.active ? '🚫 Deactivate' : '✓ Activate'}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={() => setDeleteConfirmUser(user)}
                              title="Delete user"
                              style={{ color: '#b91c1c' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.86rem', color: '#6d5849' }}>
              <div>
                Showing {users.length} of {total} total user accounts
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ◀ Previous
                </button>
                <span style={{ padding: '4px 10px', background: '#f5f0e8', borderRadius: '6px', fontWeight: 600 }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Security Audit Log View */
        <div style={{ background: '#ffffff', border: '1px solid #ded2c1', borderRadius: '18px', padding: '24px', boxShadow: '0 6px 20px rgba(90, 64, 47, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, color: '#1e130c' }}>🛡️ System Security &amp; Administrative Audit Trail</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="filter-input"
                placeholder="Filter audit entries..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
              <button type="button" className="btn-secondary" onClick={loadAuditLogs}>
                Filter
              </button>
            </div>
          </div>

          <div className="custom-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target ID</th>
                  <th>Outcome</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#7c6858' }}>
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ fontSize: '0.78rem', color: '#6d5849', whiteSpace: 'nowrap' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{entry.actorName}</td>
                      <td>
                        <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                          {entry.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#5c483b' }}>
                        {entry.targetId || '—'}
                      </td>
                      <td>
                        <span style={{ color: entry.outcome === 'success' ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: '0.8rem' }}>
                          {entry.outcome.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#4a382c', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {isDetailOpen && selectedUserDetail ? (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 User Details: {selectedUserDetail.name}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsDetailOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#fbf9f5', padding: '16px', borderRadius: '12px', border: '1px solid #ebdccf' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', fontWeight: 700 }}>ROLE</div>
                  <div>{getRoleBadge(selectedUserDetail.role)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', fontWeight: 700 }}>STATUS</div>
                  <div>
                    {selectedUserDetail.active ? (
                      <span className="status-badge-active">● Active</span>
                    ) : (
                      <span className="status-badge-inactive">○ Deactivated</span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', fontWeight: 700 }}>EMAIL</div>
                  <div style={{ fontWeight: 600 }}>{selectedUserDetail.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', fontWeight: 700 }}>DEPARTMENT</div>
                  <div>{selectedUserDetail.team || 'None'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', fontWeight: 700 }}>REGISTERED ON</div>
                  <div>{new Date(selectedUserDetail.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', fontWeight: 700 }}>LAST LOGIN</div>
                  <div>{selectedUserDetail.lastLoginAt ? new Date(selectedUserDetail.lastLoginAt).toLocaleString() : 'Never'}</div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 8px', color: '#2b1f17' }}>📊 Ticket Workload</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: '#f5f3ef', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{selectedUserDetail.stats.assignedTickets}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6d5849' }}>Total Assigned</div>
                  </div>
                  <div style={{ background: '#f5f3ef', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{selectedUserDetail.stats.openTickets}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6d5849' }}>Active / Open</div>
                  </div>
                  <div style={{ background: '#f5f3ef', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a' }}>{selectedUserDetail.stats.resolvedTickets}</div>
                    <div style={{ fontSize: '0.74rem', color: '#6d5849' }}>Resolved</div>
                  </div>
                </div>
              </div>

              {/* Audit trail */}
              {selectedUserDetail.auditTrail && selectedUserDetail.auditTrail.length > 0 ? (
                <div style={{ marginTop: '14px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#2b1f17' }}>🛡️ Recent Audit Logs</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ebdccf', borderRadius: '8px', padding: '8px' }}>
                    {selectedUserDetail.auditTrail.map((log) => (
                      <div key={log.id} style={{ fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px solid #f1e7dc' }}>
                        <span style={{ fontWeight: 600 }}>{log.action}</span> by {log.actorName} at {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Change Role Modal */}
      {isRoleModalOpen && roleChangeUser ? (
        <div className="modal-overlay" onClick={() => setIsRoleModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Change Role: {roleChangeUser.name}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsRoleModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: '0', color: '#5c483b' }}>
                Current Role: <strong>{roleChangeUser.role}</strong>
              </p>
              {roleChangeUser.role === 'Admin' ? (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', color: '#b45309', fontSize: '0.84rem' }}>
                  ⚠️ Warning: The system strictly protects the last active administrator. Demoting the final administrator is disallowed by the security policy.
                </div>
              ) : null}

              <div className="form-field">
                <label>Select New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                >
                  <option value="Customer">Customer (Ticket creation, profile, replies only)</option>
                  <option value="Support Agent">Support Agent (Queue handling, replies, SLAs)</option>
                  <option value="Senior Support Staff">Senior Support Staff (Reassignment, priority override, escalations)</option>
                  <option value="Admin">Administrator (Full org control, user management, SLA policy)</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleConfirmRoleChange}>
                Confirm Role Change
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Toggle Status Modal */}
      {isStatusModalOpen && statusToggleUser ? (
        <div className="modal-overlay" onClick={() => setIsStatusModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{statusToggleUser.active ? '🚫 Deactivate Account' : '✓ Activate Account'}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsStatusModalOpen(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, color: '#3b2b20' }}>
                Are you sure you want to {statusToggleUser.active ? 'deactivate' : 'activate'} the account for{' '}
                <strong>{statusToggleUser.name}</strong> ({statusToggleUser.email})?
              </p>
              {statusToggleUser.active ? (
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#b91c1c' }}>
                  The user will be immediately barred from signing in and their active sessions will be terminated.
                </p>
              ) : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={statusToggleUser.active ? 'btn-danger' : 'btn-primary'}
                onClick={handleConfirmStatusToggle}
              >
                {statusToggleUser.active ? 'Deactivate Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete User Modal */}
      {deleteConfirmUser ? (
        <div className="modal-overlay" onClick={() => setDeleteConfirmUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Confirm User Deletion</h3>
              <button type="button" className="modal-close-btn" onClick={() => setDeleteConfirmUser(null)}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, color: '#3b2b20' }}>
                Are you sure you want to permanently delete user <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})?
              </p>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#b91c1c' }}>
                This action is recorded in the security audit trail.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirmUser(null)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={handleConfirmDelete}>
                Delete User
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Add User Modal */}
      {isCreateOpen ? (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add New User</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="modal-body">
              <div className="form-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Taylor Swift"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="taylor@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Assigned Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                >
                  <option value="Customer">Customer</option>
                  <option value="Support Agent">Support Agent</option>
                  <option value="Senior Support Staff">Senior Support Staff</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>

              <div className="form-field">
                <label>Department / Team</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Support, Billing, Management"
                  value={createForm.team}
                  onChange={(e) => setCreateForm({ ...createForm, team: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

