'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Lesson interface matching the API response
interface LessonSummary {
  id: string;
  title: string;
  description: string;
  estimated_duration_minutes: number;
  created_at: string;
  is_completed: boolean;
  completion_percentage: number;
  completed_at?: string;
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUserEmail, removeAuthToken, isAuthenticated } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Settings,
  Plus,
  LogOut,
  MoreHorizontal,
  MessageCircle,
  Clock,
  BookOpen,
  Trash2,
  CheckCircle,
  Trophy
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
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const router = useRouter();
  const fetchUserCalled = useRef(false);

  const fetchUser = useCallback(async () => {
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
  }, [router]);

  const fetchLessons = useCallback(async () => {
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
  }, [user?.email]);

  useEffect(() => {
    // Prevent double execution in React 19 Strict Mode
    if (fetchUserCalled.current) return;
    fetchUserCalled.current = true;

    fetchUser();

    // Cleanup function to reset ref on unmount
    return () => {
      fetchUserCalled.current = false;
    };
  }, [fetchUser]);

  useEffect(() => {
    if (user?.email) {
      fetchLessons();
    }
  }, [user, fetchLessons]);

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

  const deleteLesson = async (lessonId: string) => {
    setDeletingLesson(lessonId);
    try {
      const response = await fetch(getApiEndpoint(`lessons/${lessonId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Remove the lesson from the local state
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
    } catch (err) {
      console.error('Failed to delete lesson:', err);
      alert('Failed to delete lesson. Please try again.');
    } finally {
      setDeletingLesson(null);
      setShowDeleteDialog(null);
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
              <p className="text-sm font-medium truncate text-gray-900" title={user.name}>{user.name}</p>
              <p className="text-xs text-gray-600 truncate" title={user.email}>{user.email}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className={`group hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-500 border border-gray-200 hover:border-orange-200 backdrop-blur-sm hover:-translate-y-1 h-full flex flex-col ${
                lesson.is_completed
                  ? 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200'
                  : 'bg-gradient-to-br from-white to-orange-50/30'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <CardTitle className={`text-lg font-bold transition-colors leading-snug line-clamp-2 ${
                          lesson.is_completed
                            ? 'text-green-800 group-hover:text-green-900'
                            : 'text-gray-900 group-hover:text-orange-700'
                        }`}>
                          {lesson.title}
                        </CardTitle>
                        {lesson.is_completed && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setShowDeleteDialog(lesson.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Lesson
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <Link href={`/lesson/${lesson.id}`} className="flex-1 flex flex-col">
                  <CardContent className="flex-1 flex flex-col justify-between space-y-4 cursor-pointer">
                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed line-clamp-3 ${
                        lesson.is_completed ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {lesson.description}
                      </p>
                    </div>

                    {!lesson.is_completed && lesson.completion_percentage > 0 && (
                      <div className="space-y-2 py-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 font-medium">Progress</span>
                          <span className="text-orange-600 font-semibold">{Math.round(lesson.completion_percentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${lesson.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {lesson.is_completed && lesson.completed_at ? (
                            <>Completed {new Date(lesson.completed_at).toLocaleDateString()}</>
                          ) : (
                            <>Created {new Date(lesson.created_at).toLocaleDateString()}</>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs font-medium ${
                          lesson.is_completed
                            ? 'border-green-200 text-green-700 bg-green-50'
                            : 'border-orange-200 text-orange-700 bg-orange-50'
                        }`}>
                          <Clock className="w-3 h-3 mr-1" />
                          {lesson.estimated_duration_minutes}min
                        </Badge>
                      </div>

                      <div className="flex justify-end">
                        {lesson.is_completed ? (
                          <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-full shadow-md">
                            <Trophy className="w-3 h-3 mr-2" />
                            Completed
                          </Badge>
                        ) : (
                          <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300 font-medium">
                            {lesson.completion_percentage > 0 ? 'Continue' : 'Start Learning'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Floating Create Button */}
      <div className="fixed bottom-8 right-4 sm:right-8 z-40">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-14 sm:h-16 w-44 sm:w-52 bg-orange-500 hover:bg-orange-600 rounded-2xl shadow-2xl hover:shadow-3xl hover:shadow-orange-200/50 transition-all duration-500 text-base sm:text-lg font-bold text-white hover:scale-105 group"
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 group-hover:rotate-90 transition-transform duration-300" />
          <span className="hidden sm:inline">Create Lesson</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </div>

      {/* Custom Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in-0 duration-500"
          onClick={() => {
            setIsModalOpen(false);
            setModalInput('');
          }}
        >
          <div
            className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 scale-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleModalSubmit} className="flex items-center justify-center">
              <div className="relative">
                <Input
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="I want to learn about..."
                  className="w-[40rem] h-24 !text-xl sm:!text-xl md:!text-xl lg:!text-xl xl:!text-xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl px-12 placeholder:text-white/60 text-white font-semibold tracking-wide focus:bg-white/15 focus:ring-4 focus:ring-orange-400/30 focus:border-white/40 transition-all duration-500 shadow-2xl hover:bg-white/15 hover:shadow-3xl hover:scale-[1.02] hover:border-white/30 focus:scale-[1.02] font-['Inter','system-ui','-apple-system','BlinkMacSystemFont','Segoe_UI','Roboto','Helvetica_Neue','Arial','sans-serif']"
                  style={{ fontSize: '1.875rem' }}
                  autoFocus
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Lesson</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this lesson? This action cannot be undone.
                All progress data for this lesson will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => showDeleteDialog && deleteLesson(showDeleteDialog)}
                disabled={!!deletingLesson}
              >
                {deletingLesson === showDeleteDialog ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}