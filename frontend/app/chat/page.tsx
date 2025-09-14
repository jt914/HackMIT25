'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getCurrentUserEmail, removeAuthToken, isAuthenticated } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";
import {
  Home,
  MessageCircle,
  Settings,
  LogOut,
  Send,
  Bot,
  User
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  enrolledLessons: string[];
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  lessonId?: string;
}

function ChatComponent() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonGenerationStarted = useRef(false);
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
        _id: email,
        email: email,
        name: email.split('@')[0], // Use part before @ as display name
        enrolledLessons: []
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    // Prevent double execution in React 19 Strict Mode
    if (fetchUserCalled.current) return;
    fetchUserCalled.current = true;

    fetchUser();

    // Check if there's an initial query from the modal
    const initialQuery = searchParams.get('query');
    const userEmail = searchParams.get('email');
    const isGenerating = searchParams.get('generating') === 'true';
    
    if (initialQuery) {
      const userMessage = {
        id: '1',
        content: initialQuery,
        sender: 'user' as const,
        timestamp: new Date()
      };
      
      setMessages([userMessage]);
      
      if (isGenerating && userEmail && !lessonGenerationStarted.current) {
        lessonGenerationStarted.current = true;
        setIsGeneratingLesson(true);
        // Start lesson generation immediately
        generateLessonWithEmail(initialQuery, userEmail);
      } else {
        setMessages(prev => [...prev, {
          id: '2',
          content: `Agent is currently processing your request. Please wait while we create a personalized learning path for you.`,
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
    } else {
      // Default welcome message
      setMessages([
        {
          id: 'welcome',
          content: "Hi! I'm your AI learning assistant. I can help you create personalized lessons, answer questions about programming, and guide you through your learning journey. What would you like to learn today?",
          sender: 'bot',
          timestamp: new Date()
        }
      ]);
    }

    // Cleanup function to reset ref on unmount
    return () => {
      fetchUserCalled.current = false;
    };
  }, [searchParams, fetchUser]);


  const generateLessonWithEmail = async (query: string, email: string) => {
    try {
      // Show loading message
      const loadingMessage: Message = {
        id: Date.now().toString(),
        content: `I'm generating a personalized lesson about "${query}" for you. This may take a moment...`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, loadingMessage]);

      const response = await fetch(getApiEndpoint('generate-lesson'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          email: email
        }),
      });

      const data = await response.json();

      if (data.success && data.lesson) {
        // Remove loading message and add success message
        setMessages(prev => prev.slice(0, -1));
        
        const successMessage: Message = {
          id: Date.now().toString(),
          content: `Great! I've created a comprehensive lesson about "${data.lesson.title}" for you. It contains ${data.lesson.slides.length} slides and should take about ${data.lesson.estimated_duration_minutes} minutes to complete.`,
          sender: 'bot',
          timestamp: new Date(),
          lessonId: data.lesson_id
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        // Show error message
        setMessages(prev => prev.slice(0, -1));
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: "I'm sorry, there was an error generating your lesson. Please try again.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
      setMessages(prev => prev.slice(0, -1));
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm sorry, there was an error connecting to the server. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingLesson(false);
      lessonGenerationStarted.current = false;
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Make actual API call to the chat endpoint
    try {
      const email = getCurrentUserEmail();
      if (!email) {
        throw new Error('User email not found');
      }

      const response = await fetch(getApiEndpoint('chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          email: email
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Fallback error message
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I'm having trouble processing your request right now. Please try again.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, there was an error connecting to the server. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
      {/* Sidebar */}
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
              variant="ghost"
              className="w-full justify-start rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
              asChild
            >
              <Link href="/dashboard">
                <Home className="mr-3 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant="secondary"
              className="w-full justify-start rounded-xl bg-orange-100 text-orange-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <MessageCircle className="mr-3 h-4 w-4" />
              Chat
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

      {/* Main Chat Area */}
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <div className="border-b border-orange-100 bg-white/80 backdrop-blur-lg px-8 py-6 shadow-sm">
          <h1 className="text-3xl font-bold text-orange-600">AI Learning Assistant</h1>
          <p className="text-gray-600 mt-2">Get personalized help with your learning journey</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-500`}
            >
              {message.sender === 'bot' && (
                <Avatar className="h-10 w-10 shadow-lg">
                  <AvatarFallback className="bg-orange-500 text-white">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}

              <Card className={`max-w-[75%] border-0 shadow-lg ${
                message.sender === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/80 backdrop-blur-sm'
              }`}>
                <CardContent className="p-4">
                  <p className="leading-relaxed">{message.content}</p>
                  {message.lessonId && message.sender === 'bot' && (
                    <div className="mt-4">
                      <Button
                        onClick={() => router.push(`/lesson/${message.lessonId}`)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Open Lesson
                      </Button>
                    </div>
                  )}
                  <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>

              {message.sender === 'user' && (
                <Avatar className="h-10 w-10 shadow-lg">
                  <AvatarFallback className="bg-gray-500 text-white">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {(isLoading || isGeneratingLesson) && (
            <div className="flex gap-4 justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <Avatar className="h-10 w-10 shadow-lg">
                <AvatarFallback className="bg-orange-500 text-white">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-orange-100 bg-white/80 backdrop-blur-lg p-6 shadow-lg">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about learning programming..."
              className="flex-1 h-12 rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200 bg-white/80 backdrop-blur-sm transition-all duration-300"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isLoading || isGeneratingLesson}
              className="h-12 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function Chat() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ChatComponent />
    </Suspense>
  );
}