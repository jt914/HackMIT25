'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dummyLessons, type Lesson } from '@/lib/lessons';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  FolderOpen,
  BookOpen,
  Settings,
  Plus,
  LogOut,
  FileText,
  MoreHorizontal
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  enrolledLessons: string[];
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    setLessons(dummyLessons);
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getDifficultyVariant = (difficulty: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (difficulty) {
      case 'Beginner': return 'default';
      case 'Intermediate': return 'secondary';
      case 'Advanced': return 'destructive';
      default: return 'outline';
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
      <div className="w-64 bg-card shadow-lg border-r">
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
              variant={activeTab === 'Dashboard' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('Dashboard')}
            >
              <Home className="mr-3 h-4 w-4" />
              Dashboard
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant={activeTab === 'Lessons' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('Lessons')}
            >
              <FolderOpen className="mr-3 h-4 w-4 text-primary" />
              Lessons
              <Badge variant="outline" className="ml-auto">
                {lessons.length}
              </Badge>
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant={activeTab === 'Documentation' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('Documentation')}
            >
              <BookOpen className="mr-3 h-4 w-4" />
              Documentation
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

        <div className="mt-8 px-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-3">
            Quick Actions
          </div>
          <Button className="w-full justify-start" asChild>
            <Link href="/dashboard/new-lesson">
              <Plus className="mr-2 h-4 w-4" />
              New Lesson
            </Link>
          </Button>
        </div>

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

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Lessons</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <Link key={lesson._id} href={`/lesson/${lesson._id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{lesson.title}</CardTitle>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span>Activities ({lesson.totalSteps}):</span>
                    </div>
                    <div className="space-y-1">
                      {lesson.activities.slice(0, 3).map((activity, index) => (
                        <div key={activity.id} className="text-sm text-muted-foreground">
                          {activity.title}
                          {index === 2 && lesson.activities.length > 3 && (
                            <span className="text-primary"> +{lesson.activities.length - 3} more</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm text-primary hover:underline">
                        {lesson.category.toLowerCase().replace(' ', '_')}_sample.csv
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lesson.completedSteps} rows • {Math.floor(Math.random() * 10) + 1} KB
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Sample data:</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {lesson.description}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Created {lesson.createdAt}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getDifficultyVariant(lesson.difficulty)}>
                        {lesson.difficulty}
                      </Badge>
                      <Button size="sm">
                        Record
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{lesson.progress}%</span>
                    </div>
                    <Progress value={lesson.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}