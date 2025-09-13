'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
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
      
      if (isGenerating && userEmail) {
        setIsGeneratingLesson(true);
        // Start lesson generation immediately
        generateLessonWithEmail(initialQuery, userEmail);
      } else {
        setMessages(prev => [...prev, {
          id: '2',
          content: `I'd be happy to help you learn about "${initialQuery}"! Let me create a personalized learning path for you. What specific aspects would you like to focus on?`,
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
  }, [searchParams]);

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
        _id: email,
        email: email,
        name: email.split('@')[0], // Use part before @ as display name
        enrolledLessons: []
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const generateLesson = async (query: string) => {
    if (!user?.email) return;
    return generateLessonWithEmail(query, user.email);
  };

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

    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `That's a great question about "${inputMessage}"! Based on your interest, I can help you create a structured learning path. Would you like me to generate a lesson plan, or do you have specific topics you'd like to explore?`,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1000);
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
      {/* Sidebar */}
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
              variant="ghost"
              className="w-full justify-start"
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
              className="w-full justify-start"
            >
              <MessageCircle className="mr-3 h-4 w-4 text-primary" />
              Chat
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

      {/* Main Chat Area */}
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <div className="border-b bg-card px-6 py-4">
          <h1 className="text-2xl font-bold">AI Learning Assistant</h1>
          <p className="text-muted-foreground">Get personalized help with your learning journey</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <Card className={`max-w-[70%] ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                <CardContent className="p-3">
                  <p className="text-sm">{message.content}</p>
                  {message.lessonId && message.sender === 'bot' && (
                    <div className="mt-3">
                      <Button
                        onClick={() => router.push(`/lesson/${message.lessonId}`)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Open Lesson
                      </Button>
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>

              {message.sender === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {(isLoading || isGeneratingLesson) && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card>
                <CardContent className="p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t bg-card p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about learning programming..."
              className="flex-1"
            />
            <Button type="submit" disabled={!inputMessage.trim() || isLoading || isGeneratingLesson}>
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