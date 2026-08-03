import React, { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle, MessageSquare, Bot, User, Send, Award, Zap, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { QuizPanel } from '../ui/QuizPanel';

const API = 'http://localhost:8000/api';

export const Teaching = ({ topicId, userId }) => {
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [chapterChats, setChapterChats] = useState({});
  const [inputVal, setInputVal] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const bottomRef = useRef(null);
  const reconnectingRef = useRef(false);

  useEffect(() => {
    fetchChapters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chapterChats, activeChapterId]);

  useEffect(() => {
    if (activeChapterId) {
      fetchChapterHistory(activeChapterId);
    }
  }, [activeChapterId]);

  // Resume stream on refresh
  useEffect(() => {
    if (!activeChapterId) return;
    const msgs = chapterChats[activeChapterId];
    if (!msgs || msgs.length === 0) return;
    
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.status === 'generating' && lastMsg.id && !reconnectingRef.current && !isStreaming) {
      reconnectingRef.current = true;
      setIsStreaming(true);
      fetch(`${API}/agents/reconnect/${lastMsg.id}`)
        .then(res => processStream(res))
        .catch(err => console.error(err))
        .finally(() => {
           setIsStreaming(false);
           reconnectingRef.current = false;
           fetchChapterHistory(activeChapterId);
        });
    }
  }, [chapterChats, activeChapterId, isStreaming]);

  const fetchChapters = async () => {
    try {
      const res = await fetch(`${API}/dashboard/chapters/${topicId}`);
      if (res.ok) {
        const data = await res.json();
        setChapters(data);
        // Auto-select first unlocked chapter
        const first = data[0];
        if (first) setActiveChapterId(first.id);
      }
    } catch (e) { console.error(e); }
  };

  const isChapterUnlocked = (chapter, index) => {
    if (index === 0) return true;
    const prev = chapters[index - 1];
    return prev?.status === 'completed';
  };

  const fetchChapterHistory = async (chapterId) => {
    try {
      const res = await fetch(`${API}/agents/chat-history?topic_id=${topicId}&agent_type=teacher&chapter_id=${chapterId}`);
      if (res.ok) {
        const history = await res.json();
        const chapterHistory = history.filter(m => !m.chapter_id || m.chapter_id === chapterId);
        if (chapterHistory.length > 0) {
          setChapterChats(prev => ({ ...prev, [chapterId]: chapterHistory }));
        } else {
          const ch = chapters.find(c => c.id === chapterId);
          setChapterChats(prev => ({
            ...prev,
            [chapterId]: prev[chapterId] || [
              { role: 'assistant', text: ch ? `Hello! I'm ready to teach you **${ch.title}**. Let's dive in! Ask me anything, or I can start with an overview.` : 'Hello! What would you like to learn?' }
            ]
          }));
        }
      }
    } catch (e) { console.error(e); }
  };

  const getActiveChapter = () => chapters.find(c => c.id === activeChapterId);
  const getActiveMessages = () => chapterChats[activeChapterId] || [
    { role: 'assistant', text: `Hello! I'm ready to teach **${getActiveChapter()?.title || 'this chapter'}**. Ask me anything!` }
  ];

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
            if (parsed.type === 'text') {
              textToAdd += parsed.data;
            } else if (parsed.type === 'tool_call') {
              // const toolName = parsed.data?.input?.name;
              // if (toolName) {
              //   textToAdd += `\n> *Agent is using tool: ${toolName}...*\n\n`;
              // }
            }
          } catch (error) { console.error(error); }
        }
      }

      if (textToAdd && activeChapterId) {
        setChapterChats(prev => {
          const msgs = [...(prev[activeChapterId] || [])];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = { ...last, text: last.text + textToAdd };
          return { ...prev, [activeChapterId]: msgs };
        });
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isStreaming || !activeChapterId) return;
    
    const chId = activeChapterId;
    const userMsg = { role: 'user', text: inputVal };
    const botMsg = { role: 'assistant', text: '' };
    
    setChapterChats(prev => ({ ...prev, [chId]: [...(prev[chId] || [{ role: 'assistant', text: '' }]), userMsg, botMsg] }));
    setInputVal('');
    setIsStreaming(true);

    try {
      const messages = getActiveMessages();
      const response = await fetch(`${API}/agents/teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          chapter_id: chId,
          chat_history: messages.map(m => ({ role: m.role, content: m.text })),
          user_message: userMsg.text,
        }),
      });
      await processStream(response);
    } catch (err) {
      console.error('Teacher error:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleGenerateQuiz = async (isOptional = false) => {
    if (!activeChapterId || isGeneratingQuiz) return;
    setIsGeneratingQuiz(true);
    try {
      const res = await fetch(`${API}/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: activeChapterId }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuiz({ ...data, chapter_id: activeChapterId, is_optional: isOptional });
      }
    } catch (e) { console.error(e); }
    finally { setIsGeneratingQuiz(false); }
  };

  const handleQuizPass = () => {
    // Refresh chapters to unlock the next one
    fetchChapters();
  };

  const activeChapter = getActiveChapter();
  const messages = getActiveMessages();
  // const activeIndex = chapters.findIndex(c => c.id === activeChapterId);
  const isActiveCompleted = activeChapter?.status === 'completed';

  return (
    <div className="h-full flex overflow-hidden">
      
      {/* Left Sidebar - Chapter Navigation */}
      <div className="w-64 shrink-0 bg-dark-900 border-r border-dark-700 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Chapters</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chapters.map((ch, i) => {
            const unlocked = isChapterUnlocked(ch, i);
            const isActive = ch.id === activeChapterId;
            const isDone = ch.status === 'completed';

            return (
              <button
                key={ch.id}
                onClick={() => unlocked && setActiveChapterId(ch.id)}
                disabled={!unlocked}
                className={`w-full text-left px-3 py-3 rounded-xl border transition-all relative ${
                  isActive
                    ? 'bg-gold-500/10 border-gold-500/20 text-white'
                    : unlocked
                    ? 'border-transparent hover:bg-dark-800 text-gray-400 hover:text-white'
                    : 'border-transparent text-gray-600 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                    isDone ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                    isActive ? 'bg-gold-500/20 border-gold-500/40 text-gold-400' :
                    unlocked ? 'bg-dark-700 border-dark-600 text-gray-400' :
                    'bg-dark-800 border-dark-700 text-gray-600'
                  }`}>
                    {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : !unlocked ? <Lock className="w-3 h-3" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ch.title}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {isDone ? 'Completed' : !unlocked ? 'Locked' : isActive ? 'In Progress' : 'Unlocked'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Chat Header */}
        <div className="shrink-0 p-4 border-b border-dark-700 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">{activeChapter?.title || 'Select a chapter'}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-gold-500 font-medium flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5"/> Teacher Agent
              </p>
              {activeChapter?.plans && activeChapter.plans.length > 0 && (
                <>
                  <span className="text-dark-600 text-[10px]">•</span>
                  <div className="flex items-center gap-2" title={`${activeChapter.plans.filter(p => p.status === 'completed').length} of ${activeChapter.plans.length} topics covered`}>
                    <div className="w-24 h-1.5 bg-dark-800 rounded-full overflow-hidden border border-dark-700">
                      <div 
                        className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.round((activeChapter.plans.filter(p => p.status === 'completed').length / activeChapter.plans.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      {Math.round((activeChapter.plans.filter(p => p.status === 'completed').length / activeChapter.plans.length) * 100)}% Covered
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isActiveCompleted && (
              <Button
                variant="primary"
                disabled={isGeneratingQuiz || !activeChapterId || !activeChapter?.content_completed}
                onClick={() => handleGenerateQuiz(false)}
                className="text-xs py-1.5 px-3"
                title={!activeChapter?.content_completed ? "Complete all topics first" : ""}
              >
                <Award className="w-3.5 h-3.5 mr-1" /> End Chapter Quiz
              </Button>
            )}
            {isActiveCompleted && (
              <span className="flex items-center gap-1 text-xs text-green-400 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" /> Chapter Complete
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.role === 'assistant' ? 'bg-gradient-to-br from-gold-400 to-gold-600' : 'bg-dark-700 border border-dark-600'}`}>
                {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-dark-900" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-dark-700 text-white rounded-tr-sm' : 'bg-dark-800 border border-dark-700 text-gray-200 rounded-tl-sm'}`}>
                {msg.role === 'assistant' && !msg.text ? (
                  <div className="flex items-center space-x-1.5 h-5">
                    {[0, 0.2, 0.4].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="shrink-0 p-4 border-t border-dark-700">
          <div className="flex gap-2 bg-dark-800 border border-dark-700 rounded-xl p-1 pr-2 focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500 transition-all">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Ask your teacher anything..."
              disabled={isStreaming || !activeChapterId}
              className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 py-3 placeholder-gray-500 disabled:opacity-50"
            />
            <Button type="submit" variant="primary" disabled={!inputVal.trim() || isStreaming} className="py-2 px-3 rounded-lg">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Quiz Modal */}
      {quiz && (
        <QuizPanel
          quiz={quiz}
          onPass={handleQuizPass}
          onFail={() => {}}
          onClose={() => setQuiz(null)}
        />
      )}
    </div>
  );
};
