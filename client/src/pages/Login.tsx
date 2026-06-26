import { useState, useEffect, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Factory, Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = lockedUntil.getTime() - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown('');
        setError('');
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && lockedUntil.getTime() > Date.now();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      setLocation('/');
    } catch (err: unknown) {
      const e = err as Error & { status?: number; unlocksAt?: string };
      if (e.status === 423 && e.unlocksAt) {
        setLockedUntil(new Date(e.unlocksAt));
        setError(e.message);
      } else {
        setError(e.message || 'Login failed');
        setLockedUntil(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Factory size={24} />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight">
            Gina's<span className="text-primary"> Table</span>
          </h1>
          <p className="text-sm text-muted-foreground">Manufacturing Execution System</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading || isLocked}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading || isLocked}
                  placeholder="Enter password"
                />
              </div>
              {isLocked && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="text-lockout-notice">
                  <Lock size={14} className="shrink-0" />
                  <span>Account locked. Try again in <strong>{countdown}</strong>.</span>
                </div>
              )}
              {error && !isLocked && (
                <p className="text-sm text-destructive" data-testid="text-login-error">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || isLocked || !username || !password}
                data-testid="button-login"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
