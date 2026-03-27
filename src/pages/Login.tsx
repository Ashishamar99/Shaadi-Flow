import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Heart, Mail, AlertCircle, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } =
    useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isGoogleProviderError =
    error?.toLowerCase().includes('provider') ||
    error?.toLowerCase().includes('unsupported');

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setSuccessMsg(null);
      sessionStorage.setItem('post_auth_path', `${window.location.pathname}${window.location.search}`);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setEmailLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccessMsg(
          'Account created! Check your email to confirm, then sign in.',
        );
        setIsSignUp(false);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.includes('Invalid login credentials')) {
        setError(
          "Invalid email or password. Sign up first if you don't have an account.",
        );
      } else {
        setError(msg);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Enter your email address');
      return;
    }

    setEmailLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await resetPassword(email);
      setSuccessMsg(
        'Password reset link sent! Check your email inbox (and spam folder).',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send reset email',
      );
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blush-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blush-200 rounded-full mb-6">
            <Heart size={36} className="text-blush-500" />
          </div>
          <h1 className="text-4xl font-bold text-warm-700 mb-2">Shaadi Flow</h1>
          <p className="text-warm-400 text-lg">
            Your joyful wedding logistics companion
          </p>
        </div>

        <div className="bg-white rounded-card shadow-card p-8">
          {showForgotPassword ? (
            <>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="flex items-center gap-1 text-sm text-warm-400 hover:text-warm-600 mb-4 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Back to sign in
              </button>
              <h2 className="text-xl font-bold text-warm-700 text-center mb-2">
                Reset Password
              </h2>
              <p className="text-sm text-warm-400 text-center mb-6">
                Enter your email and we'll send you a reset link
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={emailLoading}
                >
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-warm-700 text-center mb-6">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>

              <Button
                onClick={handleGoogleLogin}
                variant="primary"
                size="lg"
                className="w-full"
                icon={
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                }
              >
                Continue with Google
              </Button>

              {isGoogleProviderError && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-sm">
                  <div className="flex gap-2 items-start">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800">
                      <p className="font-semibold mb-1">
                        Google OAuth not configured yet
                      </p>
                      <p>
                        Enable it in your Supabase dashboard under
                        Authentication &gt; Providers &gt; Google.
                      </p>
                      <p className="mt-1">
                        Use email sign-in below as an alternative.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blush-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs text-warm-300">
                    or
                  </span>
                </div>
              </div>

              {!showEmailForm ? (
                <Button
                  onClick={() => setShowEmailForm(true)}
                  variant="ghost"
                  size="lg"
                  className="w-full"
                  icon={<Mail size={18} />}
                >
                  Continue with Email
                </Button>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    loading={emailLoading}
                  >
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-warm-400">
                      {isSignUp
                        ? 'Already have an account?'
                        : "Don't have an account?"}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-blush-500 font-semibold hover:underline cursor-pointer"
                      >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                      </button>
                    </p>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-xs text-blush-400 hover:text-blush-600 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {error && !isGoogleProviderError && (
            <p className="mt-4 text-sm text-red-500 text-center">{error}</p>
          )}

          {successMsg && (
            <p className="mt-4 text-sm text-mint-600 text-center">
              {successMsg}
            </p>
          )}

          <p className="mt-6 text-xs text-warm-300 text-center">
            Plan your perfect wedding, stress-free
          </p>
        </div>
      </div>
    </div>
  );
}
