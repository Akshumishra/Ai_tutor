import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Send, User, Bot, Mic, Code, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Teaching = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am ready to start Module 1. Shall we begin with an overview of the core concepts?', type: 'text' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsgs = [...messages, { role: 'user', text: inputVal, type: 'text' }];
    setMessages(newMsgs);
    setInputVal('');

    // Mock AI response
    setTimeout(() => {
      const isCode = inputVal.toLowerCase().includes('code');
      const aiResponse = isCode ? {
        role: 'assistant',
        type: 'code',
        text: `Here is a small example of what you asked:\n\n\`\`\`python\ndef hello_world():\n    print("Welcome to AI core concepts!")\n\`\`\``
      } : {
        role: 'assistant',
        type: 'text',
        text: `That's a great question! When considering ${inputVal}, you have to think about the fundamental constraints we established in module 1. Let's do a quick quiz to verify.`
      };
      
      setMessages([...newMsgs, aiResponse]);
    }, 1200);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 h-[calc(100vh-100px)] flex gap-6">
      <div className="hidden lg:flex w-1/4 flex-col gap-4">
        <Card className="flex-1 overflow-y-auto">
          <h3 className="font-semibold text-lg text-gold-500 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" /> Progress
          </h3>
          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-dark-700 before:to-transparent">
            {['Module 1', 'Module 2', 'Module 3'].map((mod, i) => (
              <div key={i} className="flex items-center gap-3 relative z-10">
                <div className={`w-4 h-4 rounded-full ${i === 0 ? 'bg-gold-500 shadow-[0_0_10px_#FBBF24]' : 'bg-dark-700 border border-dark-600'}`}></div>
                <span className={`text-sm ${i === 0 ? 'text-white' : 'text-gray-500'}`}>{mod}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden" delay={0.2}>
        <div className="bg-dark-900 border-b border-dark-700 p-4 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-white text-lg">AI Tutor Active</h2>
            <p className="text-xs text-gold-500">Module 1: Introduction</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-gold-500 transition"><Code className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${msg.role === 'assistant' ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-dark-900' : 'bg-dark-700 text-white border border-dark-600'}`}>
                  {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-dark-700 text-white rounded-tr-sm' : 'bg-dark-800 border border-dark-700 text-gray-200 rounded-tl-sm'}`}>
                  {msg.type === 'code' ? (
                    <pre className="bg-dark-900 p-3 rounded-lg overflow-x-auto text-sm border border-dark-700 font-mono text-gold-400">
                      <code>{msg.text.replace(/```python\n|```/g, '')}</code>
                    </pre>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-dark-900 border-t border-dark-700 shrink-0 flex gap-3 items-center">
          <button type="button" className="p-3 text-gray-400 hover:text-white transition-colors bg-dark-800 rounded-lg hover:bg-dark-700">
            <Mic className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask a question or request an example..." 
            className="flex-1 bg-dark-800 border-none outline-none text-white text-sm focus:ring-1 focus:ring-gold-500 rounded-lg px-4 py-3 placeholder-gray-500"
          />
          <Button type="submit" variant="primary" className="px-4 py-3" disabled={!inputVal.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </Card>
    </div>
  );
};
