'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dummyLessons, type Lesson, type Activity } from '@/lib/lessons';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lessonId = params.id as string;
    const foundLesson = dummyLessons.find(l => l._id === lessonId);

    if (foundLesson) {
      setLesson(foundLesson);
      setIsEnrolled(true); // For demo purposes, assume user is enrolled
    }

    setLoading(false);
  }, [params.id]);

  const handleEnroll = async () => {
    try {
      const response = await fetch('/api/lessons/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: params.id }),
      });

      if (response.ok) {
        setIsEnrolled(true);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
    }
  };

  const markActivityComplete = (activityId: string) => {
    if (!lesson) return;

    const updatedLesson = {
      ...lesson,
      activities: lesson.activities.map(activity =>
        activity.id === activityId ? { ...activity, completed: true } : activity
      )
    };

    const completedCount = updatedLesson.activities.filter(a => a.completed).length;
    updatedLesson.progress = Math.round((completedCount / updatedLesson.activities.length) * 100);
    updatedLesson.completedSteps = completedCount;

    setLesson(updatedLesson);
  };

  const nextActivity = () => {
    if (lesson && currentActivityIndex < lesson.activities.length - 1) {
      setCurrentActivityIndex(currentActivityIndex + 1);
    }
  };

  const previousActivity = () => {
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex(currentActivityIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lesson Not Found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentActivity = lesson.activities[currentActivityIndex];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Progress: {lesson.progress}% ({lesson.completedSteps}/{lesson.totalSteps})
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full"
                style={{ width: `${lesson.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {!isEnrolled ? (
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{lesson.title}</h2>
            <p className="text-gray-600 mb-6">{lesson.description}</p>
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{lesson.difficulty}</div>
                <div className="text-sm text-gray-600">Difficulty</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{lesson.duration}</div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{lesson.totalSteps}</div>
                <div className="text-sm text-gray-600">Activities</div>
              </div>
            </div>
            <button
              onClick={handleEnroll}
              className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 text-lg font-medium"
            >
              Enroll in This Lesson
            </button>
          </div>
        </div>
      ) : (
        <div className="flex">
          <aside className="w-80 bg-white shadow-lg h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Lesson Content</h3>
              <div className="space-y-2">
                {lesson.activities.map((activity, index) => (
                  <button
                    key={activity.id}
                    onClick={() => setCurrentActivityIndex(index)}
                    className={`w-full text-left p-3 rounded-lg border ${
                      index === currentActivityIndex
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs ${
                        activity.completed
                          ? 'bg-green-500 text-white'
                          : index === currentActivityIndex
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {activity.completed ? '✓' : index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{activity.title}</div>
                        <div className="text-xs text-gray-500 capitalize">{activity.type}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentActivity.title}</h2>
                    <div className="flex items-center gap-4">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm capitalize">
                        {currentActivity.type}
                      </span>
                      <span className="text-gray-600 text-sm">
                        Activity {currentActivityIndex + 1} of {lesson.activities.length}
                      </span>
                    </div>
                  </div>
                  {!currentActivity.completed && (
                    <button
                      onClick={() => markActivityComplete(currentActivity.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>

                <div className="prose max-w-none mb-8">
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <p className="text-gray-700 leading-relaxed">{currentActivity.content}</p>
                  </div>

                  {currentActivity.type === 'coding' && (
                    <div className="bg-gray-900 rounded-lg p-4 mb-6">
                      <div className="text-green-400 text-sm font-mono">
                        <div># Example: Working with {currentActivity.title.toLowerCase()}</div>
                        <div className="mt-2 text-blue-400">
                          {currentActivity.title.includes('Python') && (
                            <>
                              <div>name = "OnboardCademy Student"</div>
                              <div>print(f"Hello, {`{name}`}!")</div>
                              <div className="mt-2 text-gray-400"># Output: Hello, OnboardCademy Student!</div>
                            </>
                          )}
                          {currentActivity.title.includes('React') && (
                            <>
                              <div>{`const Welcome = ({name}) => {`}</div>
                              <div>  {`return <h1>Hello, {name}!</h1>;`}</div>
                              <div>{`};`}</div>
                            </>
                          )}
                          {currentActivity.title.includes('SQL') && (
                            <>
                              <div>SELECT name, email</div>
                              <div>FROM users</div>
                              <div>WHERE active = true;</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentActivity.type === 'quiz' && (
                    <div className="bg-blue-50 p-6 rounded-lg mb-6">
                      <h4 className="font-semibold text-blue-900 mb-4">Quick Quiz</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-white rounded border">
                          <label className="flex items-center">
                            <input type="radio" name="quiz" className="mr-2" />
                            <span>Option A: This is correct</span>
                          </label>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <label className="flex items-center">
                            <input type="radio" name="quiz" className="mr-2" />
                            <span>Option B: This is incorrect</span>
                          </label>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <label className="flex items-center">
                            <input type="radio" name="quiz" className="mr-2" />
                            <span>Option C: This is also incorrect</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={previousActivity}
                    disabled={currentActivityIndex === 0}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={nextActivity}
                    disabled={currentActivityIndex === lesson.activities.length - 1}
                    className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}