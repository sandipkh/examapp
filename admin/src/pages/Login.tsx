import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleClick = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      login(data.access_token, data.role, data.name);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (err) {
      console.error('[Login] error:', err);
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#000000]">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[40%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[380px] px-6">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.08]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">
            UPSC Admin
          </h1>
          <p className="mt-1.5 text-[13px] text-white/40">
            Sign in to manage your content
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-medium text-white/60">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                placeholder="admin@example.com"
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-[14px] text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/[0.07] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-medium text-white/60">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                placeholder="Enter your password"
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 text-[14px] text-white placeholder:text-white/25 focus:border-white/20 focus:bg-white/[0.07] focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2">
              <div
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => e.key === 'Enter' && handleClick()}
                className={`relative flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-white text-[14px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] select-none ${
                  loading ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-80" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[12px] text-white/20">
          UPSC IAS Prep - Admin Portal
        </p>
      </div>
    </div>
  );
}
