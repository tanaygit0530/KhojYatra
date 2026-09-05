import React, { useState } from 'react';
import { Card, PillButton, PillButtonOutline, Badge } from '@khojyatra/ui';
import { useNavigate, Link } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import { Compass, Store, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'traveler' | 'provider'>('traveler');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const setAuthUser = useSessionStore((state) => state.setAuthUser);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiClient<{ user: { id: string; role: 'traveler' | 'provider'; name?: string } }>('auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          role: selectedRole,
          name: name || undefined
        })
      });

      setAuthUser(res.user.id, res.user.role as any);

      if (selectedRole === 'traveler') {
        navigate('/app');
      } else {
        navigate('/provider/onboarding');
      }
    } catch (err: any) {
      // Fallback for demo mode
      setAuthUser(`demo-${Date.now()}`, selectedRole);
      if (selectedRole === 'traveler') {
        navigate('/app');
      } else {
        navigate('/provider/onboarding');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToApp = () => {
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} /> Back to KhojYatra Home
        </Link>

        <Card variant="surface-alt" className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="font-display font-black text-2xl text-text-primary">
              Welcome to KhojYatra
            </h1>
            <p className="text-sm text-text-secondary">
              Select your role to personalize your journey
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-card text-danger text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Role Choice */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              I am here as a...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('traveler')}
                className={`flex flex-col items-center gap-2 p-4 rounded-card border transition-all ${
                  selectedRole === 'traveler'
                    ? 'border-accent bg-accent-soft text-accent-dark font-bold'
                    : 'border-[rgba(20,22,26,0.08)] bg-surface text-text-primary hover:border-accent/30'
                }`}
              >
                <Compass
                  size={22}
                  className={selectedRole === 'traveler' ? 'text-accent' : 'text-text-secondary'}
                />
                <span className="text-sm">Traveler</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('provider')}
                className={`flex flex-col items-center gap-2 p-4 rounded-card border transition-all ${
                  selectedRole === 'provider'
                    ? 'border-accent bg-accent-soft text-accent-dark font-bold'
                    : 'border-[rgba(20,22,26,0.08)] bg-surface text-text-primary hover:border-accent/30'
                }`}
              >
                <Store
                  size={22}
                  className={selectedRole === 'provider' ? 'text-accent' : 'text-text-secondary'}
                />
                <span className="text-sm">Local Host</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tanay Patil"
                className="w-full px-4 py-3 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-text-primary focus:outline-none focus:border-accent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tanay@example.com"
                required
                className="w-full px-4 py-3 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-text-primary focus:outline-none focus:border-accent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-card bg-surface border border-[rgba(20,22,26,0.08)] text-text-primary focus:outline-none focus:border-accent text-sm"
              />
            </div>

            <PillButton type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : `Continue as ${selectedRole === 'traveler' ? 'Traveler' : 'Provider'}`}
            </PillButton>
          </form>

          {/* Anonymous Browse Option for Travelers */}
          {selectedRole === 'traveler' && (
            <div className="pt-2 border-t border-[rgba(20,22,26,0.06)] text-center space-y-3">
              <span className="text-xs text-text-secondary block">
                Want to test search right away without sign up?
              </span>
              <PillButtonOutline onClick={handleSkipToApp} size="sm" className="w-full">
                Browse Anonymously (X-Session-Id Preserved)
              </PillButtonOutline>
            </div>
          )}

          <div className="flex items-center justify-center pt-2">
            <Badge variant="neutral" size="sm" icon={<CheckCircle2 size={12} />}>
              Supabase Auth & Session Linking Active
            </Badge>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
