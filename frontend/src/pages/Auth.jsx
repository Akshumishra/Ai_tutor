import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BrainCircuit } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

export const Auth = ({ type = 'login' }) => {
  const isLogin = type === 'login';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Google Login failed');
        localStorage.setItem('user_session', JSON.stringify(data));
        navigate('/dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed. Please try again.'),
  });
  
  // Registration steps: 0 (Info), 1 (OTP), 2 (Password)
  const [step, setStep] = useState(0);
  
  // Form values
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    otp: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError('');
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp_code: "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      setMessage(data.message);
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp_code: formData.otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP');
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           name: formData.name, 
           email: formData.email, 
           password: formData.password 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           email: formData.email, 
           password: formData.password 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      
      // Store session
      localStorage.setItem('user_session', JSON.stringify(data));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Link to="/" className="flex justify-center items-center gap-2 mb-6">
          <div className="bg-gold-500 p-2 rounded-xl">
            <BrainCircuit className="w-8 h-8 text-dark-900" />
          </div>
        </Link>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
          {isLogin ? 'Welcome back' : step === 0 ? 'Create an account' : step === 1 ? 'Verify Email' : 'Set Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link to={isLogin ? "/register" : "/login"} className="font-medium text-gold-500 hover:text-gold-400 transition-colors">
            {isLogin ? 'Sign up' : 'Log in'}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Card className="py-8 px-4 sm:px-10">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">{error}</div>}
          {message && <div className="mb-4 p-3 bg-gold-500/10 border border-gold-500/20 text-gold-500 text-sm rounded-lg">{message}</div>}

          {isLogin ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <Input label="Email address" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
              <Input label="Password" id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
              <div className="flex items-center justify-end">
                <Link to="/forgot-password" size="sm" className="text-sm font-medium text-gold-500 hover:text-gold-400">Forgot password?</Link>
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          ) : (
            <>
              {step === 0 && (
                <form className="space-y-4" onSubmit={handleSendOTP}>
                   <Input label="Full Name" id="name" name="name" type="text" autoComplete="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
                   <Input label="Email address" id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                   <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send Verification Code'}
                  </Button>
                </form>
              )}

              {step === 1 && (
                <form className="space-y-4" onSubmit={handleVerifyOTP}>
                   <p className="text-sm text-gray-400 mb-2 text-center">Enter the 6-digit code sent to {formData.email}</p>
                   <Input label="OTP Code" id="otp" name="otp" type="text" autoComplete="one-time-code" placeholder="123456" maxLength={6} value={formData.otp} onChange={handleChange} required />
                   <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                  <button type="button" onClick={() => setStep(0)} className="w-full text-sm text-gray-500 hover:text-white mt-2">Change Email</button>
                </form>
              )}

              {step === 2 && (
                <form className="space-y-4" onSubmit={handleRegister}>
                   <Input label="Set Password" id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" value={formData.password} onChange={handleChange} required />
                   <p className="text-xs text-gray-500 italic">Minimum 8 characters</p>
                   <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                    {loading ? 'Finishing...' : 'Complete Registration'}
                  </Button>
                </form>
              )}
            </>
          )}

          {isLogin && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dark-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-dark-800 text-gray-500">Or continue with</span>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => googleLogin()}
                  disabled={loading}
                  className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white text-gray-800 font-medium text-sm hover:bg-gray-100 active:bg-gray-200 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
