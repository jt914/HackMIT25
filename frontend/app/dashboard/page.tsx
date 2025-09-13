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
import { Input } from '@/components/ui/input';
import {
  Home,
  Settings,
  Plus,
  LogOut,
  MoreHorizontal,
  MessageCircle,
  Clock
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
      const response = await fetch(`http://localhost:8000/lessons/${user.email}`);
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
    <div className="min-h-screen bg-background flex">
      <div className="w-64 bg-card shadow-lg border-r fixed h-full overflow-y-auto">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <span className="text-primary-foreground font-bold text-lg">O</span>
            </div>
            <span className="font-bold text-xl">OnboardCademy</span>
          </Link>
        </div>

        <nav className="mt-6">
          <div className="px-6 py-2">
            <Button
              variant={activeTab === 'Home' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('Home')}
            >
              <Home className="mr-3 h-4 w-4" />
              Home
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
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
              className="w-full justify-start"
              asChild
            >
              <Link href="/settings">
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </nav>


        <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t bg-card">
          <div className="flex items-center">
            <Avatar className="mr-3">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-8 ml-64">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">All Lessons</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold">{lesson.title}</CardTitle>
                    <Button variant="ghost" size="sm" className="h-auto p-1">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {lesson.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(lesson.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {lesson.estimated_duration_minutes} min
                      </Badge>
                      <Button size="sm" className="h-7 px-3 text-xs bg-primary hover:bg-primary/90">
                        Start
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      {/* Floating Create Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-16 w-48 bg-orange-500 hover:bg-orange-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-semibold"
        >
          <Plus className="h-6 w-6 mr-2" />
          Create Lesson
        </Button>
      </div>

      {/* Custom Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in-0 duration-300"
          onClick={() => {
            setIsModalOpen(false);
            setModalInput('');
          }}
        >
          <div
            className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleModalSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-light text-white mb-2 animate-in slide-in-from-top-2 duration-500 delay-150">
                  What do you want to learn today?
                </h2>
              </div>
              <div className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
                <Input
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="Start typing here..."
                  className="w-96 h-14 text-lg bg-white/90 backdrop-blur-sm border-0 rounded-2xl px-6 placeholder:text-gray-500 focus:bg-white/95 transition-all duration-200 shadow-lg"
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