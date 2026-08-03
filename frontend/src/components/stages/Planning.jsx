import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Circle, Loader2, ChevronRight, Zap } from 'lucide-react';
import { Button } from '../ui/Button';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'border-dark-600 text-gray-500',     bg: 'bg-dark-800',  dot: 'bg-dark-600' },
  in_progress:{ label: 'Planning...', color: 'border-gold-500/50 text-gold-400', bg: 'bg-gold-500/10', dot: 'bg-gold-400 animate-pulse' },
  completed:  { label: 'Done',       color: 'border-green-500/40 text-green-400', bg: 'bg-green-500/10', dot: 'bg-green-400' },
  failed:     { label: 'Failed',     color: 'border-red-500/40 text-red-400',    bg: 'bg-red-500/10',  dot: 'bg-red-400' },
};

export const Planning = ({ topicId, onComplete }) => {
  const [chapters, setChapters] = useState([]);
  const [workflowStatus, setWorkflowStatus] = useState(null);
  const [plannerStarted, setPlannerStarted] = useState(false);
  const [planningDone, setPlanningDone] = useState(false);
  const [logMessages, setLogMessages] = useState(['Waiting to start planning...']);
  const logRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    // Initial fetch of chapters
    fetchChapters();
    fetchWorkflowStatus();
  }, [topicId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logMessages]);

  const fetchChapters = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/dashboard/chapters/${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setChapters(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchWorkflowStatus = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/dashboard/workflow-status/${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflowStatus(data);
        // Check if planning was already completed or in progress
        if (data['planning'] === 'completed') {
          setPlanningDone(true);
          setPlannerStarted(true);
        } else if (data['planning'] === 'in_progress') {
          setPlannerStarted(true);
          setLogMessages(['Resuming planner polling...']);
          startPolling();
        }
      }
    } catch (e) { console.error(e); }
  };

  const [plannerError, setPlannerError] = useState(null);

  const startPlanning = async () => {
    const sessionStr = localStorage.getItem('user_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    setPlannerStarted(true);
    setPlannerError(null);
    setLogMessages(['Verifying curriculum is finalized...']);

    // Step 1: Ensure topic is finalized (idempotent — safe to call even if already done)
    try {
      await fetch(`http://localhost:8000/api/dashboard/curriculum/${topicId}/finalize`, { method: 'POST' });
      setLogMessages(prev => [...prev, 'Curriculum confirmed as finalized.', 'Planner Agent starting...']);
    } catch (e) {
      setLogMessages(prev => [...prev, 'Could not confirm finalization — proceeding anyway...']);
    }

    // Step 2: Trigger the planner agent
    try {
      const res = await fetch('http://localhost:8000/api/agents/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session?.user_id, topic_id: topicId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        setPlannerError(err.detail || 'Failed to start planner agent.');
        setPlannerStarted(false);
        setLogMessages(prev => [...prev, `Error: ${err.detail}`]);
        return;
      }
      setLogMessages(prev => [...prev, 'Analyzing curriculum chapters...']);
    } catch (e) {
      console.error(e);
      setPlannerError('Network error starting planner. Is the backend running?');
      setPlannerStarted(false);
      return;
    }

    // Step 3: Poll for chapter statuses and workflow status
    startPolling();
  };

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    pollingRef.current = setInterval(async () => {
      try {
        const [chapRes, wfRes] = await Promise.all([
          fetch(`http://localhost:8000/api/dashboard/chapters/${topicId}`),
          fetch(`http://localhost:8000/api/dashboard/workflow-status/${topicId}`),
        ]);
        if (chapRes.ok) {
          const chaps = await chapRes.json();
          setChapters(chaps);
          
          const doneCount = chaps.filter(c => c.is_planned).length;
          const inProgress = chaps.find(c => !c.is_planned);
          
          if (inProgress && plannerStarted && !planningDone) {
            setLogMessages(prev => {
              const msg = `Planning chapter: "${inProgress.title}"...`;
              if (prev[prev.length - 1] !== msg) return [...prev, msg];
              return prev;
            });
          }
          if (doneCount > 0) {
            setLogMessages(prev => {
              const msg = `${doneCount} chapter(s) fully planned.`;
              if (prev[prev.length - 1] !== msg) return [...prev, msg];
              return prev;
            });
          }
        }
        if (wfRes.ok) {
          const wf = await wfRes.json();
          setWorkflowStatus(wf);
          if (wf['planning'] === 'completed') {
            clearInterval(pollingRef.current);
            setPlanningDone(true);
            setLogMessages(prev => [...prev, 'Planning complete! All chapters are ready.']);
          } else if (wf['planning'] === 'failed') {
            clearInterval(pollingRef.current);
            setPlannerStarted(false);
            setPlannerError('Planning failed. Please try again.');
            setLogMessages(prev => [...prev, 'Planning failed. Please try again.']);
          }
        }
      } catch (e) { console.error(e); }
    }, 3000);
  };


  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  return (
    <div className="h-full flex flex-col bg-dark-900 overflow-hidden">
      
      {/* Header */}
      <div className="shrink-0 p-6 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Study <span className="text-gold-500">Planner</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              The AI Planner Agent is designing a detailed study plan for each chapter of your curriculum.
            </p>
          </div>
          {!plannerStarted && (
            <Button variant="primary" onClick={startPlanning} className="px-6 shrink-0">
              <Zap className="w-4 h-4 mr-2" /> Start Planning
            </Button>
          )}
          {plannerError && !plannerStarted && (
            <Button variant="outline" onClick={startPlanning} className="px-6 shrink-0 text-red-400 border-red-500/30">
              <Zap className="w-4 h-4 mr-2" /> Retry
            </Button>
          )}
          {planningDone && (
            <Button variant="primary" onClick={onComplete} className="px-6 shrink-0 shadow-lg shadow-gold-500/20">
              Begin Learning <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-0">

        {plannerError && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {plannerError}
          </div>
        )}

        {/* Chapter Progress Graph */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Chapter Planning Progress</h2>
          
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-center">
              <Circle className="w-12 h-12 mb-4 opacity-30" />
              {plannerStarted ? (
                <>
                  <p className="font-medium text-gray-400">Waiting for chapters...</p>
                  <p className="text-xs mt-1 text-gray-600">The planner agent will populate these once it starts.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-400">No chapters found in this topic.</p>
                  <p className="text-xs mt-1 text-gray-600 max-w-xs">This usually means the curriculum agent didn't save chapters yet. Go back and ensure the curriculum was fully generated.</p>
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-gold-500/30 via-dark-700 to-dark-700 z-0" />
              
              <div className="space-y-3 relative z-10">
                {chapters.map((ch, i) => {
                  const normalizedStatus = ch.status?.toLowerCase() || 'pending';
                  
                  // In the Planner stage, "Done" means planning is finished.
                  // We determine if this specific chapter is fully planned, or if it's the one currently being worked on.
                  const isDone = planningDone || ch.is_planned;
                  
                  // If it's not done, but it's the FIRST chapter that is not done, and planner is started, it's active.
                  const isFirstNotDone = i === chapters.findIndex(c => !c.is_planned);
                  const isActive = !isDone && plannerStarted && isFirstNotDone;
                  
                  const effectiveStatus = isDone ? 'completed' : isActive ? 'in_progress' : normalizedStatus;
                  
                  const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending;
                  
                  return (
                    <div key={ch.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-500 ${cfg.bg} ${cfg.color}`}>
                      {/* Status indicator */}
                      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 border-current">
                        {isDone ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">{ch.title}</h3>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {isActive && (
                          <div className="mt-2 h-1 rounded-full bg-dark-700 overflow-hidden">
                            <div className="h-full bg-gold-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Log Panel */}
        <div className="w-72 shrink-0 border-l border-dark-700 flex flex-col">
          <div className="p-3 border-b border-dark-700">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${plannerStarted && !planningDone ? 'bg-gold-500 animate-pulse' : planningDone ? 'bg-green-400' : 'bg-dark-600'}`} />
              Agent Log
            </h3>
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
            {logMessages.map((msg, i) => (
              <p key={i} className="text-gray-400 leading-relaxed">{msg}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
