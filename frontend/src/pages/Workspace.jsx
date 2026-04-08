import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BrainCircuit, 
  BookOpen, 
  Clock, 
  Send, 
  User, 
  Bot, 
  LayoutTemplate, 
  FileCode2, 
  Play,
  ArrowLeft,
  Lock,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';

// ... (parseCurriculumText remains same)
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
         if (topicMatch) {
           topics.push(topicMatch[1]);
         }
      }
      chapters.push({ module: title, topics });
    }

    if (chapters.length === 0) return { cleanText: text, canvasData: null };
    
    const cleanText = text.substring(0, firstIndex).trim() + '\n\n' + text.substring(lastIndex).trim();
    return { cleanText: cleanText.trim(), canvasData: chapters };
};

export const Workspace = () => {
  const [activeAgent, setActiveAgent] = useState('curriculum');
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  
  const sessionStr = localStorage.getItem('user_session');
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const userId = session?.user_id;

  // Use topic_id from URL or a unique one for new journeys
  const [topicId, setTopicId] = useState(queryParams.get('topic_id') || crypto.randomUUID());
  const [topicStatus, setTopicStatus] = useState('pending');

  // Sync topicId with URL only if the URL provides a valid topic_id
  useEffect(() => {
    const urlTopicId = queryParams.get('topic_id');
    if (urlTopicId && urlTopicId !== topicId) {
      setTopicId(urlTopicId);
      setChats({
        curriculum: [{ role: 'assistant', text: 'I am the Curriculum Agent. Tell me your subject and goals, and I will generate a course structure for you.' }],
        planner: [{ role: 'assistant', text: 'I am the Planner Agent. Let me help you schedule your study sessions based on your curriculum.' }],
        teacher: [{ role: 'assistant', text: 'I am the Teacher Agent. Ask me to explain concepts, give quizzes, or write code!' }]
      });
      setCanvasContent(null);
    }
  }, [location.search, topicId]);
  
  const [chats, setChats] = useState({
    curriculum: [{ role: 'assistant', text: 'I am the Curriculum Agent. Tell me your subject and goals, and I will generate a course structure for you.' }],
    planner: [{ role: 'assistant', text: 'I am the Planner Agent. Let me help you schedule your study sessions based on your curriculum.' }],
    teacher: [{ role: 'assistant', text: 'I am the Teacher Agent. Ask me to explain concepts, give quizzes, or write code!' }]
  });
  
  const [inputVal, setInputVal] = useState('');
  const [canvasContent, setCanvasContent] = useState(null);
  const bottomRef = useRef(null);

  const agents = [
    { id: 'curriculum', name: 'Curriculum Agent', icon: BookOpen, locked: false },
    { id: 'planner', name: 'Planner Agent', icon: Clock, locked: topicStatus !== 'completed' },
    { id: 'teacher', name: 'Teacher Agent', icon: BrainCircuit, locked: topicStatus !== 'completed' },
  ];
  useEffect(() => {
    if (!session) {
      navigate('/login');
      return;
    }
    // Fetch topic status if we have a real topic ID
    const fetchStatus = async () => {
        if (!topicId.startsWith('topic_')) {
            try {
                const res = await fetch(`http://localhost:8000/api/dashboard/courses?user_id=${userId}`);
                if (res.ok) {
                    const courses = await res.json();
                    const current = courses.find(c => c.id === topicId);
                    if (current) setTopicStatus(current.status);
                }
            } catch (err) { console.error(err); }
        } else {
            // For new journeys, always start with pending status
            setTopicStatus('pending');
        }
    };
    fetchStatus();
  }, [topicId, navigate, userId]);

  const fetchChatHistory = async () => {
    if (!topicId || topicId.startsWith('topic_')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/agents/chat-history?topic_id=${topicId}&agent_type=${activeAgent}`);
      if (res.ok) {
        const history = await res.json();
        if (history && history.length > 0) {
          setChats(prev => ({
            ...prev,
            [activeAgent]: history
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  const fetchCurriculum = async () => {
    if (!topicId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/dashboard/curriculum/${topicId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCanvasContent({ type: 'curriculum', data });
        }
      }
    } catch (err) {
      console.error("Error fetching curriculum:", err);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    if (activeAgent === 'curriculum') {
      fetchCurriculum();
    }
  }, [topicId, activeAgent]);

  if (!session) return null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Live Parsing: Update sidebar instantly as the AI types
    if (activeAgent === 'curriculum') {
      const currentChats = chats['curriculum'];
      if (currentChats && currentChats.length > 0) {
        const lastMsg = currentChats[currentChats.length - 1];
        if (lastMsg.role === 'assistant') {
           const { canvasData } = parseCurriculumText(lastMsg.text);
           if (canvasData && canvasData.length > 0) {
               setCanvasContent({ type: 'curriculum', data: canvasData });
           }
        }
      }
    }
  }, [chats, activeAgent]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsgs = [...chats[activeAgent], { role: 'user', text: inputVal }];
    setChats({ ...chats, [activeAgent]: newMsgs });
    const userPrompt = inputVal;
    setInputVal('');

    setChats(prev => ({
      ...prev,
      [activeAgent]: [...prev[activeAgent], { role: 'assistant', text: '' }]
    }));

    try {
        let endpoint = '';
        let payload = {};

        if (activeAgent === 'curriculum') {
            endpoint = 'http://localhost:8000/api/agents/curriculum';
            payload = {
                user_id: userId,
                topic_id: topicId,
                chat_history: newMsgs.map(m => ({ role: m.role, content: m.text })),
                user_input: userPrompt
            };
        } else if (activeAgent === 'teacher') {
            endpoint = 'http://localhost:8000/api/agents/teacher';
            payload = {
                user_id: userId,
                chapter_id: 'default_chapter_123',
                chat_history: newMsgs.map(m => ({ role: m.role, content: m.text })),
                user_message: userPrompt
            };
        } else if (activeAgent === 'planner') {
            endpoint = 'http://localhost:8000/api/agents/planner';
            payload = { 
                user_id: userId,
                topic_id: topicId 
            };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (activeAgent === 'planner') {
            const result = await response.json();
            setChats(prev => {
                const updated = [...prev[activeAgent]];
                updated[updated.length - 1].text = result.message || 'Planner agent started in background.';
                return { ...prev, [activeAgent]: updated };
            });
            setCanvasContent({
                type: 'planner',
                data: { startDate: 'TBD', hoursPerWeek: 'TBD', estimatedCompletion: 'Deep Research running...' }
            });
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: true });
            
            const lines = chunkValue.split('\n');
            let textToAdd = "";
            for (let line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (!dataStr) continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        // Extract only text type chunks or handle accordingly
                        if (parsed.type === 'text') {
                            textToAdd += parsed.data;
                        } else if (parsed.type === 'final' && parsed.data?.assistant_text) {
                            // The complete assistant response comes at the end, but we already
                            // streamed the deltas, so we don't need to append the final text again.
                            // Handled correctly.
                        } else if (parsed.type === 'tool_call') {
                            // No intermediate polling here per user request to avoid "spam"
                        }
                    } catch {
                        // ignore unparseable chunks or non-json payloads
                    }
                }
            }

            if (textToAdd) {
                setChats(prev => {
                    const updated = [...prev[activeAgent]];
                    const lastIndex = updated.length - 1;
                    const lastMsg = updated[lastIndex];
                    updated[lastIndex] = { ...lastMsg, text: lastMsg.text + textToAdd };
                    return { ...prev, [activeAgent]: updated };
                });
            }
        }
    } catch (err) {
        console.error("Backend Error:", err);
        setChats(prev => {
            const updated = [...prev[activeAgent]];
            updated[updated.length - 1].text = 'Error communicating with the agent.';
            return { ...prev, [activeAgent]: updated };
        });
    }
  };

  const renderCanvasContent = () => {
    if (!canvasContent) return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <LayoutTemplate className="w-16 h-16 mb-4 opacity-50" />
        <p>Your generated content will appear here</p>
      </div>
    );

    if (canvasContent.type === 'curriculum') {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Generated Curriculum</h2>
          <div className="space-y-4">
            {canvasContent.data.map((mod, i) => (
              <div key={i} className="bg-dark-800 border border-dark-700 p-4 rounded-xl">
                <h3 className="text-lg font-semibold text-gold-500 mb-2">{mod.module}</h3>
                <ul className="list-disc list-inside text-gray-300">
                  {mod.topics.map((t, idx) => <li key={idx}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (canvasContent.type === 'planner') {
      return (
        <div className="p-6 h-full flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold text-white mb-8">Study Schedule</h2>
          <div className="bg-dark-800 border border-dark-700 p-8 rounded-2xl text-center w-full max-w-md">
            <Clock className="w-12 h-12 text-gold-500 mx-auto mb-4" />
            <div className="space-y-4 text-left">
              <div className="flex justify-between border-b border-dark-700 pb-2">
                <span className="text-gray-400">Start Date</span>
                <span className="text-white font-medium">{canvasContent.data.startDate}</span>
              </div>
              <div className="flex justify-between border-b border-dark-700 pb-2">
                <span className="text-gray-400">Pace</span>
                <span className="text-white font-medium">{canvasContent.data.hoursPerWeek} hrs/week</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Completion</span>
                <span className="text-gold-400 font-bold">{canvasContent.data.estimatedCompletion}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (canvasContent.type === 'code') {
      return (
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center"><FileCode2 className="mr-2 text-gold-500"/> Interactive Code</h2>
            <Button variant="outline" className="py-1.5 px-3 text-sm"><Play className="w-4 h-4 mr-1"/> Run</Button>
          </div>
          <div className="flex-1 bg-dark-900 rounded-xl border border-dark-700 p-4 font-mono text-sm text-green-400 overflow-auto">
            <pre><code>{canvasContent.data}</code></pre>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden font-sans">
      
      {/* Sidebar - Agent Toggle */}
      <div className="w-20 md:w-64 bg-dark-900 border-r border-dark-700 flex flex-col shrink-0 transition-all duration-300">
        <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-dark-700">
          <div className="flex items-center group cursor-pointer" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-gold-500 transition-colors" />
            <span className="hidden md:block ml-2 text-sm font-medium text-gray-400 group-hover:text-gold-500">Back</span>
          </div>
          <div className="flex items-center">
            <BrainCircuit className="w-6 h-6 text-gold-500" />
            <span className="hidden md:block ml-1.5 font-bold text-lg text-white">AI<span className="text-gold-500">Tutor</span></span>
          </div>
        </div>
        
        <div className="flex-1 py-4 flex flex-col gap-2 px-2 md:px-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 hidden md:block px-2 opacity-50">Stages</div>
          {agents.map(agent => (
            <button 
              key={agent.id}
              onClick={() => !agent.locked && setActiveAgent(agent.id)}
              disabled={agent.locked}
              className={`flex items-center p-3 rounded-xl transition-all relative group
                ${activeAgent === agent.id ? 'bg-gold-500/10 text-gold-500 border border-gold-500/20 shadow-lg' : 'text-gray-400 hover:bg-dark-800 hover:text-white border border-transparent'}
                ${agent.locked ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95'}
              `}
            >
              <agent.icon className={`w-6 h-6 shrink-0 ${activeAgent === agent.id ? 'text-gold-500' : ''}`} />
              <span className="hidden md:block ml-3 font-medium text-sm text-left leading-tight">{agent.name}</span>
              {agent.locked && <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hidden md:block" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Chat Interface Layer */}
        <div className="flex-1 md:w-1/2 flex flex-col border-r border-dark-700 relative">
          <div className="border-b border-dark-700 p-4 flex items-center shadow-sm">
            <h2 className="text-lg font-semibold text-white capitalize">{agents.find(a => a.id === activeAgent)?.name} Interface</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {chats[activeAgent].map((msg, i) => {
              let displayText = msg.text;
              if (activeAgent === 'curriculum' && msg.role === 'assistant') {
                 const { cleanText } = parseCurriculumText(msg.text);
                 displayText = cleanText;
              }
              return (
              <div key={i} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.role === 'assistant' ? 'bg-gradient-to-br from-gold-400 to-gold-600' : 'bg-dark-700 border border-dark-600 text-white'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5 text-dark-900" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-dark-700 text-white rounded-tr-sm' : 'bg-dark-800 border border-dark-700 text-gray-200 rounded-tl-sm'}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
                </div>
              </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {activeAgent === 'curriculum' && topicStatus === 'completed' ? (
            <div className="p-8 text-center bg-dark-900 border-t border-dark-700 animate-in fade-in slide-in-from-bottom-4 duration-700">
               <div className="inline-flex p-3 bg-gold-500/10 rounded-2xl mb-4 border border-gold-500/20 shadow-lg shadow-gold-500/5">
                  <CheckCircle className="w-8 h-8 text-gold-500" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Curriculum Ready!</h3>
               <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Your learning journey is professionally structured. Switch to the <span className="text-gold-500 font-medium">Planner Agent</span> to schedule your study sessions.</p>
               <Button 
                onClick={() => setActiveAgent('planner')}
                variant="primary" 
                className="w-full max-w-xs rounded-xl shadow-xl shadow-gold-500/10"
               >
                 Go to Planner <ChevronRight className="w-4 h-4 ml-2" />
               </Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-4 bg-dark-900 border-t border-dark-700 mb-safe">
              <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl p-1 pr-2 shadow-inner focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500 transition-all">
                <input 
                  type="text" 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={`Message ${agents.find(a => a.id === activeAgent)?.name}...`}
                  className="flex-1 bg-transparent border-none outline-none text-white text-sm px-4 py-3 placeholder-gray-500"
                />
                <Button type="submit" variant="primary" disabled={!inputVal.trim()} className="py-2 px-3 rounded-lg">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-center text-gray-500 mt-2">AI Agents can make mistakes. Verify critical logic.</p>
            </form>
          )}
        </div>

        {/* Canvas Layer */}
        <div className="flex-1 md:w-1/2 bg-dark-900 relative hidden md:block">
          <div className="absolute inset-0 overflow-y-auto">
             {renderCanvasContent()}
          </div>
        </div>

      </div>
    </div>
  );
};
