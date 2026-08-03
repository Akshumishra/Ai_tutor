import React, { useState } from 'react';
import { CheckCircle, XCircle, Award, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export const QuizPanel = ({ quiz, onPass, onFail, onClose }) => {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const allAnswered = quiz.questions.every((_, i) => selectedAnswers[i] !== undefined);

  const handleSelect = (questionIdx, optionIdx) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIdx]: optionIdx }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setLoading(true);
    try {
      const answers = quiz.questions.map((_, i) => selectedAnswers[i]);
      const res = await fetch('http://localhost:8000/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: quiz.chapter_id,
          answers,
          questions: quiz.questions,
        }),
      });
      const data = await res.json();
      setResults(data);
      setSubmitted(true);
    } catch (err) {
      console.error('Quiz submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setResults(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50">
        
        {/* Header */}
        <div className="p-6 border-b border-dark-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20">
              <Award className="w-5 h-5 text-gold-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Chapter Quiz</h2>
              <p className="text-xs text-gray-400">{quiz.chapter_title} • {quiz.questions.length} Questions • Pass score: 70%</p>
            </div>
          </div>
          {results && (
            <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${results.passed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {results.score}%
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!results ? (
            quiz.questions.map((q, qi) => (
              <div key={qi} className="space-y-3">
                <p className="text-sm font-semibold text-white leading-relaxed">
                  <span className="text-gold-500 mr-2">{qi + 1}.</span>{q.question}
                </p>
                <div className="grid gap-2">
                  {q.options.map((opt, oi) => {
                    const selected = selectedAnswers[qi] === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => handleSelect(qi, oi)}
                        className={`text-left p-3 rounded-xl border text-sm transition-all duration-150 ${
                          selected
                            ? 'bg-gold-500/15 border-gold-500/50 text-white'
                            : 'bg-dark-900 border-dark-700 text-gray-300 hover:border-dark-600 hover:bg-dark-800'
                        }`}
                      >
                        <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold mr-2 shrink-0 ${selected ? 'bg-gold-500 text-dark-900' : 'bg-dark-700 text-gray-400'}`}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4">
              {/* Score banner */}
              <div className={`p-6 rounded-2xl text-center border ${results.passed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                {results.passed ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-1">Excellent Work!</h3>
                    <p className="text-green-400 text-sm">You scored {results.score}% ({results.correct_count}/{results.total} correct)</p>
                    <p className="text-gray-400 text-xs mt-2">Next chapter is now unlocked!</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-1">Keep Practicing!</h3>
                    <p className="text-red-400 text-sm">You scored {results.score}% ({results.correct_count}/{results.total} correct)</p>
                    <p className="text-gray-400 text-xs mt-2">You need 70% to proceed. Review the chapter and try again.</p>
                  </>
                )}
              </div>
              {/* Per-question breakdown */}
              {results.results.map((r, i) => (
                <div key={i} className={`p-4 rounded-xl border text-sm ${r.is_correct ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-start gap-2">
                    {r.is_correct ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-white font-medium">{quiz.questions[i].question}</p>
                      {!r.is_correct && (
                        <p className="text-green-400 text-xs mt-1">
                          ✓ Correct answer: {quiz.questions[i].options[r.correct]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-dark-700 flex gap-3 justify-end shrink-0">
          {!submitted ? (
            <>
              <Button variant="outline" onClick={onClose} className="px-5">Cancel</Button>
              <Button
                variant="primary"
                disabled={!allAnswered || loading}
                onClick={handleSubmit}
                className="px-6"
              >
                {loading ? 'Submitting...' : `Submit Quiz`}
              </Button>
            </>
          ) : results?.passed ? (
            <>
              <Button variant="outline" onClick={onClose} className="px-5">Close</Button>
              <Button variant="primary" onClick={() => { onPass(results); onClose(); }} className="px-6">
                Continue to Next Chapter <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} className="px-5">Review Chapter</Button>
              <Button variant="outline" onClick={handleRetry} className="px-5 text-gold-500 border-gold-500/30">
                <RefreshCw className="w-4 h-4 mr-1" /> Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
