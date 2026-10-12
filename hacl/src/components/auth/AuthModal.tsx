import { useState } from 'react';
import { demoSwitchRole, login, register } from '../../lib/api';
import type { User } from '../../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await login({ email, password });
        onSuccess(res.user);
        onClose();
      } else {
        const res = await register({ name, email, password });
        onSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSwitch = async (role: 'admin' | 'senior' | 'agent' | 'customer') => {
    setError('');
    setIsLoading(true);
    try {
      const res = await demoSwitchRole(role);
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo role switch failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'login' ? '🔐 Sign In to Your Account' : '📝 Create Customer Account'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Quick Demo Switcher */}
        <div style={{ marginBottom: '18px', padding: '12px', background: '#f7f3ec', borderRadius: '12px', border: '1px solid #e3d7c7' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6d5849', marginBottom: '8px' }}>
            ⚡ QUICK DEMO LOGIN (ONE CLICK):
          </div>
          <div className="demo-role-switcher">
            <button
              type="button"
              className="demo-role-btn"
              disabled={isLoading}
              onClick={() => handleDemoSwitch('admin')}
            >
              👑 Admin (Full Control)
            </button>
            <button
              type="button"
              className="demo-role-btn"
              disabled={isLoading}
              onClick={() => handleDemoSwitch('senior')}
            >
              ⭐ Senior Support Staff
            </button>
            <button
              type="button"
              className="demo-role-btn"
              disabled={isLoading}
              onClick={() => handleDemoSwitch('agent')}
            >
              🎧 Support Agent
            </button>
            <button
              type="button"
              className="demo-role-btn"
              disabled={isLoading}
              onClick={() => handleDemoSwitch('customer')}
            >
              👤 Customer (Jane Cooper)
            </button>
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #ede3d4', paddingBottom: '10px' }}>
          <button
            type="button"
            className={`secondary-button ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
            style={{ fontWeight: mode === 'login' ? 700 : 500 }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`secondary-button ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
            style={{ fontWeight: mode === 'register' ? 700 : 500 }}
          >
            Register as Customer
          </button>
        </div>

        {error ? (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '0.86rem', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="modal-body">
          {mode === 'register' ? (
            <div className="form-field">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Jane Cooper"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          ) : null}

          <div className="form-field">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="user@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'register' ? (
              <span style={{ fontSize: '0.76rem', color: '#7c6858' }}>Must be at least 8 characters.</span>
            ) : null}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

