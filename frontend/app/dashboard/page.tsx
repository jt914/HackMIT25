'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Lesson interface matching the API response
interface LessonSummary {
  id: string;
  title: string;
  description: string;
  estimated_duration_minutes: number;
  created_at: string;
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUserEmail, removeAuthToken, isAuthenticated } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";
import { Input } from '@/components/ui/input';
import {
  Home,
  Settings,
  Plus,
  LogOut,
  MoreHorizontal,
  MessageCircle,
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  enrolledLessons: string[];
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [activeTab, setActiveTab] = useState('Home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInput, setModalInput] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchLessons();
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }
      
      const email = getCurrentUserEmail();
      if (!email) {
        router.push('/login');
        return;
      }
      
      // For now, we'll create a basic user object from the JWT token
      // In the future, we might want to fetch additional user data from the backend
      setUser({
        id: email,
        email: email,
        name: email.split('@')[0], // Use part before @ as display name
        enrolledLessons: []
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const fetchLessons = async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch(getApiEndpoint(`lessons/${user.email}`));
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.lessons) {
          setLessons(data.lessons);
        }
      } else {
        console.error('Failed to fetch lessons');
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleLogout = async () => {
    try {
      removeAuthToken();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalInput.trim() && user?.email) {
      setIsModalOpen(false);
      setModalInput('');
      
      // Redirect to chat page with generating state
      router.push(`/chat?generating=true&query=${encodeURIComponent(modalInput.trim())}&email=${encodeURIComponent(user.email)}`);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 flex">
      <div className="w-64 bg-white/80 backdrop-blur-lg shadow-xl border-r border-orange-100 fixed h-full overflow-y-auto">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center group">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl text-orange-600">CodeByte</span>
          </Link>
        </div>

        <nav className="mt-8">
          <div className="px-6 py-2">
            <Button
              variant={activeTab === 'Home' ? 'secondary' : 'ghost'}
              className={`w-full justify-start rounded-xl transition-all duration-300 ${
                activeTab === 'Home'
                  ? 'bg-orange-100 text-orange-700 shadow-lg'
                  : 'hover:bg-orange-50 hover:text-orange-600'
              }`}
              onClick={() => setActiveTab('Home')}
            >
              <Home className="mr-3 h-4 w-4" />
              Home
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
              asChild
            >
              <Link href="/chat">
                <MessageCircle className="mr-3 h-4 w-4" />
                Chat
              </Link>
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
              asChild
            >
              <Link href="/settings">
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </nav>


        <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t border-orange-100 bg-white/80 backdrop-blur-lg">
          <div className="flex items-center">
            <Avatar className="mr-3">
              <AvatarFallback className="bg-orange-500 text-white shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Logout"
              className="hover:bg-orange-50 hover:text-orange-600 transition-colors rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-8 ml-64">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-orange-600">All Lessons</h1>
            <p className="text-gray-600 mt-2">Continue your learning journey</p>
          </div>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No lessons yet</h3>
            <p className="text-gray-600 mb-6">Create your first lesson to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lessons.map((lesson) => (
              <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                <Card className="group hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-500 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:-translate-y-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{lesson.title}</CardTitle>
                      <Button variant="ghost" size="sm" className="h-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-50">
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-gray-600 leading-relaxed">
                        {lesson.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-500">
                        Created {new Date(lesson.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-0 rounded-full px-3 py-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {lesson.estimated_duration_minutes} min
                        </Badge>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                          Start
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Floating Create Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-16 w-52 bg-orange-500 hover:bg-orange-600 rounded-2xl shadow-2xl hover:shadow-3xl hover:shadow-orange-200/50 transition-all duration-500 text-lg font-bold text-white hover:scale-105 group"
        >
          <Plus className="h-6 w-6 mr-3 group-hover:rotate-90 transition-transform duration-300" />
          Create Lesson
        </Button>
      </div>

      {/* Custom Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-lg flex items-center justify-center animate-in fade-in-0 duration-500"
          onClick={() => {
            setIsModalOpen(false);
            setModalInput('');
          }}
        >
          <div
            className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700 scale-in-0"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleModalSubmit} className="space-y-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-3 animate-in slide-in-from-top-4 duration-700 delay-200">
                  What do you want to learn today?
                </h2>
                <p className="text-white/80 text-lg animate-in slide-in-from-top-2 duration-700 delay-300">
                  Tell me about any topic and I'll create a personalized lesson for you
                </p>
              </div>
              <div className="animate-in slide-in-from-bottom-6 duration-700 delay-400">
                <Input
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="e.g., React hooks, Python basics, API design..."
                  className="w-[28rem] h-16 text-lg bg-white/95 backdrop-blur-md border-0 rounded-2xl px-8 placeholder:text-gray-500 focus:bg-white focus:ring-4 focus:ring-orange-200/50 transition-all duration-300 shadow-2xl"
                  autoFocus
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}