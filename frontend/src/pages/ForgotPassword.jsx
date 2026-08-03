import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, BrainCircuit, Check, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset, 4: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Password validation checks
  const checks = [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'One number', valid: /\d/.test(newPassword) },
    { label: 'One special character', valid: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) }
  ];
  
  const allChecksValid = checks.every(c => c.valid);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setStep(2);
      } else {
        if (res.status === 404) {
          navigate('/register');
        } else {
          const data = await res.json();
          setError(data.detail || 'Failed to request OTP');
        }
      }
    } catch (error) { console.error(error);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp })
      });
      if (res.ok) {
        setStep(3);
      } else {
        const data = await res.json();
        setError(data.detail || 'Invalid OTP');
      }
    } catch (error) { console.error(error);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!allChecksValid) {
      setError('Password does not meet complexity requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          otp_code: otp,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });
      if (res.ok) {
        setStep(4);
      } else {
        const data = await res.json();
        setError(data.detail || 'Failed to reset password');
      }
    } catch (error) { console.error(error);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Link to="/" className="flex justify-center items-center gap-2 mb-6">
          <div className="bg-gold-500 p-2 rounded-xl">
            <BrainCircuit className="w-8 h-8 text-dark-900" />
          </div>
        </Link>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          {step === 1 && "Enter your email to receive a password reset OTP."}
          {step === 2 && `Enter the 6-digit OTP sent to ${email}.`}
          {step === 3 && "Create a new strong password."}
          {step === 4 && "Success!"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Card className="py-8 px-4 sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}
          
          {step === 1 && (
            <form className="space-y-6" onSubmit={handleRequestOtp}>
              <Input 
                label="Email address" 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading || !email}>
                {isLoading ? 'Sending...' : 'Send Reset OTP'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <Input 
                label="6-Digit OTP" 
                type="text" 
                maxLength={6}
                placeholder="123456" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required 
              />
              <Button type="submit" variant="primary" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </form>
          )}

          {step === 3 && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <Input 
                label="New Password" 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
              />
              
              <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 space-y-2">
                {checks.map((check, i) => (
                  <div key={i} className={`flex items-center text-xs ${check.valid ? 'text-green-400' : 'text-gray-500'}`}>
                    {check.valid ? <Check className="w-3.5 h-3.5 mr-2 shrink-0" /> : <X className="w-3.5 h-3.5 mr-2 shrink-0" />}
                    {check.label}
                  </div>
                ))}
              </div>

              <Input 
                label="Confirm New Password" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
              
              {!passwordsMatch && confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}

              <Button 
                type="submit" 
                variant="primary" 
                className="w-full" 
                disabled={isLoading || !allChecksValid || !passwordsMatch}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Password Reset</h3>
              <p className="text-gray-400 text-sm mb-6">
                Your password has been successfully reset.
              </p>
              <Link to="/login">
                <Button variant="primary" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          )}

          {step !== 4 && (
            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gold-500 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
