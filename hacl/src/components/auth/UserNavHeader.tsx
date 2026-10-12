import { useState } from 'react';
import { logout, updateProfile } from '../../lib/api';
import { useRealtimeStatus } from '../../lib/realtime';
import { ThemeToggle } from '../ThemeToggle';
import type { User, UserRole } from '../../types/auth';

interface UserNavHeaderProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
  onOpenAuthModal: () => void;
}

export function UserNavHeader({ user, onUserChange, onOpenAuthModal }: UserNavHeaderProps) {
  const isRealtimeConnected = useRealtimeStatus();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    onUserChange(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setProfileMsg('');
    try {
      const res = await updateProfile({ name: profileName, email: profileEmail });
      onUserChange(res.user);
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setIsProfileOpen(false), 1200);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'admin';
      case 'Senior Support Staff': return 'senior';
      case 'Support Agent': return 'agent';
      default: return 'customer';
    }
  };

  return (
    <>
      <header className="user-nav-header">
        <div className="user-nav-left">
          <div className="user-nav-title">
            <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                SupportSphere AI
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Enterprise Customer Operations &amp; Real-Time SLA Command Center
              </div>
            </div>
          </div>
          <div className={`realtime-live-badge ${isRealtimeConnected ? '' : 'disconnected'}`}>
            <span className={`realtime-pulse-dot ${isRealtimeConnected ? '' : 'disconnected'}`} />
            <span>{isRealtimeConnected ? 'LIVE STREAM' : 'CONNECTING'}</span>
          </div>
        </div>

        <div className="user-nav-right">
          <ThemeToggle />
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="user-pill">
                <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({user.email})</span>
              </div>

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setProfileName(user.name);
                  setProfileEmail(user.email);
                  setProfileMsg('');
                  setIsProfileOpen(true);
                }}
              >
                ⚙️ Profile
              </button>

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleLogout}
                style={{
                  background: '#fef2f2',
                  borderColor: '#fecaca',
                  color: '#b91c1c',
                  fontWeight: 600
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={onOpenAuthModal}
            >
              🔐 Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* Edit Profile Modal */}
      {isProfileOpen && user ? (
        <div className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 My Account Profile</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsProfileOpen(false)}>
                &times;
              </button>
            </div>

            {profileMsg ? (
              <div style={{ padding: '10px 14px', background: profileMsg.includes('success') ? '#ecfdf5' : '#fef2f2', border: `1px solid ${profileMsg.includes('success') ? '#a7f3d0' : '#fecaca'}`, borderRadius: '10px', color: profileMsg.includes('success') ? '#065f46' : '#991b1b', fontSize: '0.86rem', marginBottom: '16px' }}>
                {profileMsg}
              </div>
            ) : null}

            <form onSubmit={handleSaveProfile} className="modal-body">
              <div className="form-group">
                <label>User Role</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Assigned by System Administrator</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  minLength={2}
                  className="filter-input"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  className="filter-input"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setIsProfileOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
