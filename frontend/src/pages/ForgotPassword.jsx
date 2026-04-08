import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, BrainCircuit } from 'lucide-react';

export const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
          Enter your email to receive a password reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <Card className="py-8 px-4 sm:px-10">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Check your email</h3>
              <p className="text-gray-400 text-sm mb-6">
                We sent a password reset link to your email.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input label="Email address" id="email" type="email" placeholder="you@example.com" required />
              
              <Button type="submit" variant="primary" className="w-full">
                Send Reset Link
              </Button>

              <div className="mt-4 text-center">
                <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gold-500 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
