'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dummyLessons, type Lesson } from '@/lib/lessons';

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'Advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="font-bold text-xl text-gray-900">OnboardCademy</span>
          </Link>
        </div>

        <nav className="mt-6">
          <div className="px-6 py-3">
            <button
              onClick={() => setActiveTab('Dashboard')}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-left ${
                activeTab === 'Dashboard'
                  ? 'bg-orange-100 text-orange-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3">🏠</span>
              Dashboard
            </button>
          </div>

          <div className="px-6 py-1">
            <button
              onClick={() => setActiveTab('Lessons')}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-left ${
                activeTab === 'Lessons'
                  ? 'bg-orange-100 text-orange-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3 text-orange-500">📁</span>
              Lessons
              <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
                {lessons.length}
              </span>
            </button>
          </div>

          <div className="px-6 py-1">
            <button
              onClick={() => setActiveTab('Documentation')}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-left ${
                activeTab === 'Documentation'
                  ? 'bg-orange-100 text-orange-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3">📚</span>
              Documentation
            </button>
          </div>

          <div className="px-6 py-1">
            <Link
              href="/settings"
              className="flex items-center w-full px-3 py-2 rounded-lg text-left text-gray-600 hover:bg-gray-100"
            >
              <span className="mr-3">⚙️</span>
              Settings
            </Link>
          </div>
        </nav>

        <div className="mt-8 px-6">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">
            Quick Actions
          </div>
          <Link
            href="/dashboard/new-lesson"
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600"
          >
            <span className="mr-2">+</span>
            New Lesson
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t bg-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 ml-2"
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Lessons</h1>
          <button className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center">
            <span className="mr-2">+</span>
            Add New
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <Link key={lesson._id} href={`/lesson/${lesson._id}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg">{lesson.title}</h3>
                  <button className="text-gray-400 hover:text-gray-600">⚙️</button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <span>Data columns ({lesson.totalSteps}):</span>
                  </div>
                  <div className="space-y-1">
                    {lesson.activities.slice(0, 3).map((activity, index) => (
                      <div key={activity.id} className="text-sm text-gray-600">
                        {activity.title}
                        {index === 2 && lesson.activities.length > 3 && (
                          <span className="text-blue-500"> +{lesson.activities.length - 3} more</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-blue-600">📄</span>
                    <span className="text-sm text-blue-600 hover:underline">
                      {lesson.category.toLowerCase().replace(' ', '_')}_sample.csv
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {lesson.completedSteps} rows • {Math.floor(Math.random() * 10) + 1} KB
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs text-gray-600 mb-2">Sample data:</div>
                  <div className="text-xs text-gray-500">
                    {lesson.description.substring(0, 100)}...
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Created {lesson.createdAt}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(lesson.difficulty)}`}>
                      {lesson.difficulty}
                    </span>
                    <button className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600">
                      Record
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900 font-medium">{lesson.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(lesson.progress)}`}
                      style={{ width: `${lesson.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}