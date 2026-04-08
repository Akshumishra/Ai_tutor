import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';
import { Clock, Calendar, CheckCircle, ArrowRight } from 'lucide-react';

export const Planning = ({ onNext }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const mockCurriculum = [
    { module: 'Module 1: Introduction', duration: '2 Hours' },
    { module: 'Module 2: Core Concepts', duration: '5 Hours' },
    { module: 'Module 3: Advanced Topics', duration: '8 Hours' },
    { module: 'Module 4: Project Work', duration: '10 Hours' },
  ];

  const handleCreatePlan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onNext();
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-4">
          Study <span className="text-gold-500">Plan</span>
        </h1>
        <p className="text-gray-400 text-lg">Review your AI-generated curriculum and set your pace.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card delay={0.1} className="flex flex-col">
          <h2 className="text-xl font-semibold text-gold-400 mb-6 flex items-center">
            <BookOpenIcon className="w-5 h-5 mr-2" />
            Generated Curriculum
          </h2>
          <div className="space-y-4 flex-grow">
            {mockCurriculum.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (idx * 0.1) }}
                className="bg-dark-900 border border-dark-700 rounded-lg p-4 flex justify-between items-center hover:border-gold-500/50 transition-colors"
              >
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-dark-600 mr-3" />
                  <span className="text-gray-200">{item.module}</span>
                </div>
                <span className="text-sm text-gold-500 font-medium bg-dark-800 px-3 py-1 rounded-full">{item.duration}</span>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card delay={0.2} className="flex flex-col border-gold-500/20">
          <h2 className="text-xl font-semibold text-gold-400 mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Schedule Details
          </h2>
          
          <div className="space-y-6 flex-grow">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Completion Date</label>
              <input type="date" className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white focus:border-gold-500 focus:ring-1 focus:ring-gold-500 outline-none" defaultValue={"2026-05-01"} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Study Pace (Hours / Week)
              </label>
              <input type="range" min="1" max="40" defaultValue="10" className="w-full accent-gold-500" />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Relaxed (1 hr/wk)</span>
                <span>Intensive (40 hrs/wk)</span>
              </div>
            </div>

            <div className="bg-dark-900 p-4 rounded-lg flex items-start mt-8">
              <div className="bg-gold-500/20 p-2 rounded-full mr-3 text-gold-500">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">Estimated Timeline</h4>
                <p className="text-xs text-gray-400 mt-1">Based on your pace, you will finish around <strong className="text-gold-400">May 1, 2026</strong>.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button onClick={handleCreatePlan} loading={isGenerating} className="w-full" variant="primary">
              {isGenerating ? 'Finalizing Plan...' : (
                <>
                  Start Learning <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Quick stub for the icon used above
const BookOpenIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);
