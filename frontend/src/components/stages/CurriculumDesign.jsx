import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, TextArea, Select } from '../ui/Input';
import { BookOpen, Upload, Sparkles } from 'lucide-react';

export const CurriculumDesign = ({ onNext }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    // Mock API call delay
    setTimeout(() => {
      setIsGenerating(false);
      onNext();
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 relative z-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent mb-4">
          Design Your Curriculum
        </h1>
        <p className="text-gray-400 text-lg">Define your learning path with AI-powered personalized structuring.</p>
      </div>

      <Card className="max-w-2xl mx-auto" delay={0.1}>
        <form onSubmit={handleGenerate} className="space-y-6">
          <Input 
            label="Subject / Topic" 
            id="subject" 
            placeholder="e.g., Quantum Computing Basics" 
            required 
          />
          
          <TextArea 
            label="Learning Goals (Optional)" 
            id="goals" 
            placeholder="What do you want to achieve? e.g., Understand qubits and basic gates." 
          />

          <Select 
            label="Difficulty Level" 
            id="difficulty" 
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' }
            ]}
            required
          />

          <div className="border border-dashed border-dark-700 rounded-lg p-6 flex flex-col items-center justify-center bg-dark-900 bg-opacity-50 hover:bg-opacity-80 transition-all cursor-pointer group">
            <Upload className="w-8 h-8 text-gray-500 group-hover:text-gold-500 mb-3 transition-colors" />
            <p className="text-sm text-gray-400 group-hover:text-gray-300">Upload syllabus or resources (PDF, TXT)</p>
            <p className="text-xs text-gray-600 mt-1">Optional</p>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" variant="primary" disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                <>
                  <Sparkles className="animate-spin mr-2 w-5 h-5" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 w-5 h-5" />
                  Generate Curriculum
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
