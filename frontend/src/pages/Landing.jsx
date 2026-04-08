import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { BrainCircuit, BookOpen, Clock, ArrowRight } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[10%] w-[50%] h-[50%] rounded-full bg-gold-600/10 blur-[120px] pointer-events-none" />
      
      <nav className="border-b border-dark-700/50 p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-gold-500 p-2 rounded-xl">
            <BrainCircuit className="w-6 h-6 text-dark-900" />
          </div>
          <span className="text-2xl font-bold text-white">AI<span className="text-gold-500">Tutor</span></span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost">Log In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-800 border border-dark-700 text-gold-400 text-sm font-medium mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
          </span>
          AI Agents v2.0 Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 max-w-4xl leading-tight">
          Master any subject with your <br className="hidden md:block"/>
          <span className="bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 bg-clip-text text-transparent">Personalized AI Agents</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12">
          Interact with specialized agents to design curriculums, plan your studies, and dive deep into topics using our advanced Workspace Canvas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link to="/register">
            <Button variant="primary" className="text-lg py-4 px-8 w-full sm:w-auto">
              Start Learning for Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="outline" className="text-lg py-4 px-8 w-full sm:w-auto">
              Try Workspace Demo
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto w-full">
          <FeatureCard icon={BookOpen} title="Curriculum Agent" desc="Instantly generate structured modules and topics." />
          <FeatureCard icon={Clock} title="Planner Agent" desc="Optimize your study schedule dynamically." />
          <FeatureCard icon={BrainCircuit} title="Teacher Agent" desc="Deep-dive chat with code rendering and visualization." />
        </div>
      </main>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div className="bg-dark-800/50 border border-dark-700 p-8 rounded-2xl flex flex-col items-center text-center hover:border-gold-500/30 transition-all hover:-translate-y-1">
    <div className="w-14 h-14 bg-dark-700 rounded-xl flex items-center justify-center text-gold-500 mb-6">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{desc}</p>
  </div>
);
