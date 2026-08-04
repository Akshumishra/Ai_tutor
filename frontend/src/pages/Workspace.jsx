import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BrainCircuit, BookOpen, Clock, Send, User, Bot,
  ArrowLeft, Lock, CheckCircle, ChevronRight, Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Planning } from '../components/stages/Planning';
import { Teaching } from '../components/stages/Teaching';

/* ────────────────────────────────────────────────────────────── */
/* Curriculum text parser (keep as-is)                           */
/* ────────────────────────────────────────────────────────────── */
const parseCurriculumText = (text) => {
  const chapterRegex = /###\s*(Chapter[^\n]+)(.*?)(?=###\s*Chapter|$)/gs;
  const chapters = [];
  let match;
  let firstIndex = -1;
  let lastIndex = -1;

  while ((match = chapterRegex.exec(text)) !== null) {
    if (firstIndex === -1) firstIndex = match.index;
    lastIndex = match.index + match[0].length;

    const title = match[1].trim();
    const body = match[2];
    const topics = [];
    const lines = body.split('\n');
    for (let line of lines) {
      line = line.trim();
      const topicMatch = line.match(/^\d+\.\s*(.*)/);
      if (topicMatch) topics.push(topicMatch[1]);
    }
    chapters.push({ module: title, topics });
  }

  if (chapters.length === 0) return { cleanText: text, canvasData: null };
  const cleanText =
    text.substring(0, firstIndex).trim() + '\n\n' + text.substring(lastIndex).trim();
  return { cleanText: cleanText.trim(), canvasData: chapters };
};

/* ────────────────────────────────────────────────────────────── */
/* Stage breadcrumb                                               */
/* ────────────────────────────────────────────────────────────── */
const STAGES = [
  { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
  { id: 'planner',    label: 'Planner',    icon: Clock },
  { id: 'teacher',    label: 'Teaching',   icon: BrainCircuit },
];

const StageBreadcrumb = ({ current, unlocked }) => (
  <div className="flex items-center gap-2 px-6 py-3 border-b border-dark-700 bg-dark-900 shrink-0">
    {STAGES.map((s, i) => {
      const isUnlocked = unlocked.includes(s.id);
      const isCurrent = s.id === current;
      const isDone = STAGES.findIndex(x => x.id === current) > i;
      return (
        <React.Fragment key={s.id}>
          <div className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            isCurrent ? 'text-gold-400' :
            isDone    ? 'text-green-400' :
            isUnlocked ? 'text-gray-400' : 'text-dark-600'
          }`}>
            {isDone
              ? <CheckCircle className="w-4 h-4" />
              : !isUnlocked
              ? <Lock className="w-4 h-4" />
              : <s.icon className="w-4 h-4" />}
            <span>{s.label}</span>
          </div>
          {i < STAGES.length - 1 && (
            <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isDone ? 'text-green-400/40' : 'text-dark-700'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ────────────────────────────────────────────────────────────── */
/* Curriculum Stage Component (inline)                           */
/* ────────────────────────────────────────────────────────────── */
const CurriculumStage = ({ topicId, userId, onComplete }) => {
  const [chats, setChats] = useState([
    { role: 'assistant', text: 'I am the Curriculum Agent. Tell me your subject and goals, and I will generate a course structure for you.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [canvasContent, setCanvasContent] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const bottomRef = useRef(null);
  const reconnectingRef = useRef(false);

  // Fetch existing history on mount
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      if (!topicId || topicId.startsWith('topic_')) return;
      try {
        const [histRes, curRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/agents/chat-history?topic_id=${topicId}&agent_type=curriculum`, { signal: controller.signal }),
          fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/curriculum/${topicId}`, { signal: controller.signal }),
        ]);
        if (histRes.ok) {
          const history = await histRes.json();
          if (history?.length > 0) {
            const firstIsUser = history[0].role === 'user';
            setChats(firstIsUser ? [chats[0], ...history] : history);
          }
        }
        if (curRes.ok) {
          const data = await curRes.json();
          if (data?.length > 0) setCanvasContent(data);
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    })();

    // Also check if already completed
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/workflow-status/${topicId}`, { signal: controller.signal });
        if (res.ok) {
          const wf = await res.json();
          if (wf['curriculum'] === 'completed') setIsCompleted(true);
        }
      } catch(e) { if (e.name !== 'AbortError') console.error(e); }
    })();

    return () => controller.abort();
  }, [topicId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Live parse
    const lastMsg = chats[chats.length - 1];
    if (lastMsg?.role === 'assistant') {
      const { canvasData } = parseCurriculumText(lastMsg.text);
      if (canvasData?.length > 0) setCanvasContent(canvasData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats]);

  // Resume stream on refresh
  const processStream = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      let textToAdd = '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'text') textToAdd += parsed.data;
          } catch (error) { console.error(error); }
        }
      }
      if (textToAdd) {
        setChats(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], text: updated[updated.length - 1].text + textToAdd };
          return updated;
        });
      }
    }
  };

  useEffect(() => {
    if (!topicId) return;
    const lastMsg = chats[chats.length - 1];
    if (lastMsg?.status === 'generating' && lastMsg.id && !reconnectingRef.current) {
      reconnectingRef.current = true;
      fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/agents/reconnect/${lastMsg.id}`)
        .then(res => processStream(res))
        .catch(err => console.error(err))
        .finally(() => {
          reconnectingRef.current = false;
          fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/agents/chat-history?topic_id=${topicId}&agent_type=curriculum`)
            .then(res => res.json())
            .then(history => {
              if (history?.length > 0) {
                setChats(prev => {
                  const firstIsUser = history[0].role === 'user';
                  return firstIsUser ? [prev[0], ...history] : history;
                });
              }
            });
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, topicId]);


  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = { role: 'user', text: inputVal };
    const botMsg  = { role: 'assistant', text: '' };
    setChats(prev => [...prev, userMsg, botMsg]);
    const userPrompt = inputVal;
    setInputVal('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/agents/curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          topic_id: topicId,
          chat_history: [...chats, userMsg].map(m => ({ role: m.role, content: m.text })),
          user_input: userPrompt,
        }),
      });
      await processStream(response);

      // After stream ends, reload curriculum and status
      try {
        const curRes = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/curriculum/${topicId}`);
        if (curRes.ok) { const d = await curRes.json(); if (d?.length > 0) setCanvasContent(d); }
      } catch (error) { console.error(error); }
      try {
        const wfRes = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/workflow-status/${topicId}`);
        if (wfRes.ok) { const wf = await wfRes.json(); if (wf['curriculum'] === 'completed') setIsCompleted(true); }
      } catch (error) { console.error(error); }
    } catch (err) {
      console.error('Curriculum error:', err);
      setChats(prev => {
        const updated = [...prev];
        updated[updated.length - 1].text = 'Error communicating with the agent.';
        return updated;
      });
    }
  };

  const handleNextStep = async () => {
    // Step 1: Sync canvas chapters to DB (in case the agent didn't call upsert_curriculum_tool)
    if (canvasContent && canvasContent.length > 0) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/curriculum/${topicId}/sync-chapters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapters: canvasContent.map(c => ({ module: c.module || c.title || '', topics: c.topics || [] })) }),
        });
      } catch (e) { console.error('Chapter sync error:', e); }
    }
    // Step 2: Mark topic as completed
    if (!isCompleted) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/curriculum/${topicId}/finalize`, { method: 'POST' });
      } catch (e) { console.error(e); }
    }
    onComplete();
  };


  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Chat Section */}
      <div className={`flex flex-col transition-all duration-500 ${canvasContent ? 'w-1/2 border-r border-dark-700' : 'w-full'}`}>
        <div className="border-b border-dark-700 p-4">
          <h2 className="text-base font-semibold text-white">Curriculum Agent</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {chats.map((msg, i) => {
            const { cleanText } = parseCurriculumText(msg.text);
            return (
              <div key={i} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.role === 'assistant' ? 'bg-gradient-to-br from-gold-400 to-gold-600' : 'bg-dark-700 border border-dark-600'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-dark-900" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-dark-700 text-white rounded-tr-sm' : 'bg-dark-800 border border-dark-700 text-gray-200 rounded-tl-sm'}`}>
                  {msg.role === 'assistant' && !msg.text ? (
                    <div className="flex space-x-1.5 items-center h-5">
                      {[0,0.2,0.4].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.role === 'assistant' ? cleanText : msg.text}</p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-dark-700">
          <div className="flex gap-2 bg-dark-800 border border-dark-700 rounded-xl p-1 pr-2 focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500 transition-all">
            <input
              type="text"
              id="curriculum-input"
              name="curriculum-input"
              autoComplete="off"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Tell me your subject and learning goals..."
              className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 py-3 placeholder-gray-500"
            />
            <Button type="submit" variant="primary" disabled={!inputVal.trim()} className="py-2 px-3 rounded-lg">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Canvas Panel */}
      {canvasContent && (
        <div className="flex-1 bg-dark-900 overflow-y-auto hidden md:flex flex-col">
          <div className="p-6 flex-1">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-500" /> Generated Curriculum
            </h2>
            <div className="space-y-4">
              {canvasContent.map((mod, i) => (
                <div key={i} className="bg-dark-800 border border-dark-700 p-4 rounded-xl">
                  <h3 className="text-base font-semibold text-gold-400 mb-2">{mod.module || mod.title}</h3>
                  <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                    {(mod.topics || []).map((t, idx) => <li key={idx}>{t}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="p-6 pt-0 border-t border-dark-700 mt-4">
            <Button
              variant="primary"
              disabled={!canvasContent || canvasContent.length === 0}
              onClick={handleNextStep}
              className="w-full py-3 rounded-xl shadow-lg shadow-gold-500/10"
            >
              Next Step: Go to Planner <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Workspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const sessionStr = localStorage.getItem('user_session');
  const session    = sessionStr ? JSON.parse(sessionStr) : null;
  const userId     = session?.user_id;

  const [topicId, setTopicId] = useState(queryParams.get('topic_id') || null);
  const [stage, setStage] = useState('curriculum'); 
  const [unlockedStages, setUnlockedStages] = useState(['curriculum']);
  const [stageRestored, setStageRestored] = useState(false);

  useEffect(() => {
    if (queryParams.get('topic_id')) return;
    if (!userId) return;

    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/topics/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        if (res.ok) {
          const { topic_id } = await res.json();
          setTopicId(topic_id);
          navigate(`${location.pathname}?topic_id=${topic_id}`, { replace: true });
          setStageRestored(true); 
        } else {
          console.error('Failed to create topic on backend');
          setStageRestored(true);
        }
      } catch (e) {
        console.error('Error creating topic:', e);
        setStageRestored(true);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!session) { navigate('/login'); }
  }, [session, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      // Only run restore once we actually have a real topic ID
      if (!topicId) {
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/workflow-status/${topicId}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const wf = await res.json();
          const curriculumDone = wf['curriculum'] === 'completed';
          const planningDone   = wf['planning']   === 'completed';

          if (planningDone) {
            setStage('teacher');
            setUnlockedStages(['curriculum', 'planner', 'teacher']);
          } else if (curriculumDone) {
            setStage('planner');
            setUnlockedStages(['curriculum', 'planner']);
          } else {
            setStage('curriculum');
            setUnlockedStages(['curriculum']);
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Stage restore error:', e);
      } finally {
        setStageRestored(true);
      }
    })();
    return () => controller.abort();
  }, [topicId]);

  const unlockStage = (stageId) => {
    setUnlockedStages(prev => prev.includes(stageId) ? prev : [...prev, stageId]);
  };

  const handleCurriculumComplete = () => {
    unlockStage('planner');
    setStage('planner');
  };

  const handlePlannerComplete = () => {
    unlockStage('teacher');
    setStage('teacher');
  };

  // Active Time Tracking
  useEffect(() => {
    if (!topicId || !stageRestored || stage !== 'teacher') return;

    // Ping the backend every 30 seconds to accumulate learning time
    const interval = setInterval(() => {
      fetch(`${import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL || 'http://localhost:8000'}'}/api/dashboard/topics/${topicId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta_seconds: 30 })
      }).catch(err => console.error('Time tracking error:', err));
    }, 30000);

    return () => clearInterval(interval);
  }, [topicId, stageRestored, stage]);


  // Don't render until we know the correct stage (avoids curriculum flash on refresh)
  if (!session || !stageRestored) return (
    <div className="flex h-screen bg-dark-900 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Restoring your progress...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden font-sans flex-col">
      {/* Top bar */}
      <div className="h-14 shrink-0 bg-dark-900 border-b border-dark-700 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gold-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium hidden md:block">Dashboard</span>
          </button>
          <div className="w-px h-5 bg-dark-700" />
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="w-5 h-5 text-gold-500" />
            <span className="font-bold text-white">AI<span className="text-gold-500">Tutor</span></span>
          </div>
        </div>
        <div className="text-xs text-gray-500 hidden md:block">Topic ID: {topicId.slice(0, 8)}…</div>
      </div>

      {/* Stage Breadcrumb */}
      <StageBreadcrumb current={stage} unlocked={unlockedStages} />

      {/* Stage Content */}
      <div className="flex-1 overflow-hidden flex">
        {stage === 'curriculum' && (
          <CurriculumStage
            topicId={topicId}
            userId={userId}
            onComplete={handleCurriculumComplete}
          />
        )}
        {stage === 'planner' && (
          <Planning
            topicId={topicId}
            onComplete={handlePlannerComplete}
          />
        )}
        {stage === 'teacher' && (
          <Teaching
            topicId={topicId}
            userId={userId}
          />
        )}
      </div>
    </div>
  );
};
