import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  Plus, 
  ChevronRight, 
  TrendingUp,
  BrainCircuit,
  Settings,
  LogOut,
  Search,
  Trash2
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Dashboard = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const sessionStr = localStorage.getItem('user_session');
    if (!sessionStr) {
      navigate('/login');
      return;
    }
    const session = JSON.parse(sessionStr);
    setUser(session);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchCourses = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/dashboard/courses?user_id=${user.user_id}`);
        if (response.ok) {
          const data = await response.json();
          setCourses(data);
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user?.user_id]);

  const handleStartNewCourse = () => {
      navigate('/app');
  };

  const handleResumeCourse = (topicId) => {
      navigate(`/app?topic_id=${topicId}`);
  };

  const handleSignOut = () => {
      localStorage.removeItem('user_session');
      navigate('/login');
  };

  const handleDeleteCourse = async (courseId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this journey? This action cannot be undone.")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/dashboard/topics/${courseId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCourses(prev => prev.filter(c => c.id !== courseId));
      } else {
        console.error("Failed to delete topic");
      }
    } catch (err) {
      console.error(err);
    }
  };


  if (!user) return null;

  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans selection:bg-gold-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-20 md:w-64 bg-dark-900/50 backdrop-blur-xl border-r border-dark-800 z-50 transition-all duration-300">
        <div className="h-20 flex items-center px-6 border-b border-dark-800">
           <BrainCircuit className="w-8 h-8 text-gold-500" />
           <span className="ml-3 font-bold text-xl hidden md:block tracking-tight">AI<span className="text-gold-500">Tutor</span></span>
        </div>
{/*         
        <nav className="p-4 space-y-2 mt-4">
          <button className="flex items-center w-full p-3 rounded-xl bg-gold-500/10 text-gold-500 border border-gold-500/20 shadow-lg shadow-gold-500/5">
            <GraduationCap className="w-6 h-6 shrink-0" />
            <span className="ml-3 font-medium hidden md:block">My Courses</span>
          </button>
          <button className="flex items-center w-full p-3 rounded-xl text-gray-400 hover:bg-dark-800 hover:text-white transition-all group">
            <Settings className="w-6 h-6 shrink-0 group-hover:rotate-45 transition-transform" />
            <span className="ml-3 font-medium hidden md:block">Settings</span>
          </button>
        </nav> */}

        <div className="absolute bottom-8 left-0 w-full px-4">
           <button 
              onClick={handleSignOut}
              className="flex items-center w-full p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all group"
           >
              <LogOut className="w-6 h-6 shrink-0" />
              <span className="ml-3 font-medium hidden md:block">Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-20 md:pl-64 pt-6 pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Welcome back, {user.name}!
              </h1>
              <p className="text-gray-400 mt-2 text-lg">You have {courses.length} active learning journeys.</p>
            </div>
            <Button 
                onClick={handleStartNewCourse}
                className="py-3 px-8 rounded-2xl shadow-xl shadow-gold-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Journey
            </Button>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
             <div className="bg-dark-900/40 backdrop-blur-md border border-dark-800 p-6 rounded-3xl group hover:border-gold-500/30 transition-all cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="w-24 h-24 text-gold-500" />
                </div>
                <p className="text-gray-400 font-medium mb-1">Average Progress</p>
                <h3 className="text-4xl font-bold text-white">
                    {courses.length > 0 
                      ? (courses.reduce((acc, c) => acc + c.progress, 0) / courses.length).toFixed(0) 
                      : 0}%
                </h3>
             </div>
             <div className="bg-dark-900/40 backdrop-blur-md border border-dark-800 p-6 rounded-3xl group hover:border-gold-500/30 transition-all cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BookOpen className="w-24 h-24 text-gold-500" />
                </div>
                <p className="text-gray-400 font-medium mb-1">Completed Chapters</p>
                <h3 className="text-4xl font-bold text-white">
                  {courses.reduce((acc, c) => acc + (c.completed_count || 0), 0)}
                </h3>
             </div>
             <div className="bg-dark-900/40 backdrop-blur-md border border-dark-800 p-6 rounded-3xl group hover:border-gold-500/30 transition-all cursor-default relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Clock className="w-24 h-24 text-gold-500" />
                </div>
                <p className="text-gray-400 font-medium mb-1">Learning Time</p>
                <h3 className="text-4xl font-bold text-white">
                  {courses.reduce((acc, c) => acc + ((c.learning_time_seconds || 0) / 3600), 0).toFixed(1)} Hrs
                </h3>
             </div>
          </div>

          {/* Courses Search/Filter */}
          <div className="flex items-center gap-4 mb-8">
             <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search your courses..."
                    className="w-full bg-dark-900/50 border border-dark-800 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-gold-500/50 transition-all text-sm"
                />
             </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
                Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-64 bg-dark-900/20 border border-dark-800 rounded-3xl animate-pulse" />
                ))
            ) : courses.length === 0 ? (
                <div className="col-span-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-dark-800 rounded-[2.5rem] bg-dark-900/20 text-gray-400 transition-all hover:bg-dark-900/30 group">
                    <div className="p-6 bg-dark-800 rounded-3xl mb-6 group-hover:scale-110 transition-transform duration-500 border border-dark-700">
                        <Plus className="w-10 h-10 text-gold-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No active journeys</h3>
                    <p className="mb-8 text-gray-500 text-center max-w-xs">Start your first AI-powered learning experience today.</p>
                    <Button onClick={handleStartNewCourse} className="px-8 rounded-2xl">
                        Create New Journey
                    </Button>
                </div>
            ) : courses.map(course => (
              <div 
                key={course.id} 
                className="group bg-dark-900/40 backdrop-blur-sm border border-dark-800 rounded-[2rem] overflow-hidden hover:border-gold-500/50 hover:shadow-2xl hover:shadow-gold-500/10 transition-all duration-500 relative"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gold-500/10 rounded-2xl border border-gold-500/20">
                        <BookOpen className="w-6 h-6 text-gold-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${course.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gold-500/10 text-gold-400 border border-gold-500/20'}`}>
                            {course.status}
                        </span>
                        <button 
                          onClick={(e) => handleDeleteCourse(course.id, e)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete Journey"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-gold-500 transition-colors">
                    {course.title}
                  </h3>
                  
                  <div className="mt-8 flex items-end justify-between mb-2">
                    <span className="text-gray-400 text-sm font-medium">Progress</span>
                    <span className="text-white font-bold">{course.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-dark-800 rounded-full overflow-hidden blur-[0.5px]">
                    <div 
                        className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <div className="mt-8">
                    <button 
                        onClick={() => handleResumeCourse(course.id)}
                        className="w-full bg-white/5 hover:bg-gold-500 text-white group-hover:text-dark-950 font-bold py-4 rounded-2xl flex items-center justify-center transition-all duration-300"
                    >
                      Continue Learning
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
