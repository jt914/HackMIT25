'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { getCurrentUserEmail, isAuthenticated } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";

// New types based on the API schema
interface MCQOption {
  id: string;
  text: string;
}

interface MCQQuestion {
  type: 'mcq';
  id: string;
  question: string;
  options: MCQOption[];
  correct_answer_id: string;
  explanation: string;
}

interface DragDropItem {
  id: string;
  text: string;
  category: string | null;
}

interface DragDropQuestion {
  type: 'drag_drop';
  id: string;
  question: string;
  items: DragDropItem[];
  categories: string[];
  correct_mapping: Record<string, string>;
  explanation: string;
}

interface InfoSlide {
  type: 'info';
  id: string;
  title: string;
  content: string;
  code_snippet: string | null;
  image_url: string | null;
}

type Slide = InfoSlide | MCQQuestion | DragDropQuestion;

interface Lesson {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
  estimated_duration_minutes: number;
  created_at: string;
  user_email: string;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [completedSlides, setCompletedSlides] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  
  // MCQ state
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // Drag and drop state
  const [dragDropMapping, setDragDropMapping] = useState<Record<string, string>>({});
  const [dragDropSubmitted, setDragDropSubmitted] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchLesson();
  }, [params.id]);

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
      setUser({
        id: email,
        email: email,
        name: email.split('@')[0] // Use part before @ as display name
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  };

  const fetchLesson = async () => {
    try {
      if (!user?.email) return;
      
      const lessonId = params.id as string;
      const response = await fetch(getApiEndpoint(`lesson/${user.email}/${lessonId}`));
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.lesson) {
          setLesson(data.lesson);
        } else {
          console.error('Lesson not found');
        }
      } else {
        console.error('Failed to fetch lesson');
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch lesson when user is available
  useEffect(() => {
    if (user?.email) {
      fetchLesson();
    }
  }, [user]);

  const markSlideComplete = (slideId: string) => {
    setCompletedSlides(prev => new Set([...prev, slideId]));
  };

  const nextSlide = () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      resetSlideState();
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
      resetSlideState();
    }
  };

  const resetSlideState = () => {
    setSelectedAnswer('');
    setShowExplanation(false);
    setIsCorrect(null);
    setDragDropMapping({});
    setDragDropSubmitted(false);
  };

  const handleMCQSubmit = (slide: MCQQuestion) => {
    const correct = selectedAnswer === slide.correct_answer_id;
    setIsCorrect(correct);
    setShowExplanation(true);
    if (correct) {
      markSlideComplete(slide.id);
    }
  };

  const handleDragDropSubmit = (slide: DragDropQuestion) => {
    setDragDropSubmitted(true);
    const isCorrect = Object.entries(slide.correct_mapping).every(
      ([itemId, correctCategory]) => dragDropMapping[itemId] === correctCategory
    );
    if (isCorrect) {
      markSlideComplete(slide.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lesson Not Found</h1>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentSlide = lesson.slides[currentSlideIndex];
  const progressPercentage = ((completedSlides.size / lesson.slides.length) * 100);

  const renderSlideContent = (slide: Slide) => {
    switch (slide.type) {
      case 'info':
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">{slide.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg leading-relaxed">{slide.content}</p>
              
              {slide.code_snippet && (
                <Card className="bg-gray-900 text-green-400">
                  <CardContent className="p-4">
                    <pre className="text-sm font-mono overflow-x-auto">
                      <code>{slide.code_snippet}</code>
                    </pre>
                  </CardContent>
                </Card>
              )}
              
              {slide.image_url && (
                <div className="flex justify-center">
                  <img 
                    src={slide.image_url} 
                    alt={slide.title} 
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
              )}

              <div className="pt-4">
                <Button 
                  onClick={() => markSlideComplete(slide.id)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={completedSlides.has(slide.id)}
                >
                  {completedSlides.has(slide.id) ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    'Mark as Complete'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'mcq':
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">{slide.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {slide.options.map((option) => (
                  <Card 
                    key={option.id}
                    className={`cursor-pointer transition-colors ${
                      selectedAnswer === option.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-gray-50'
                    } ${
                      showExplanation && option.id === slide.correct_answer_id
                        ? 'border-green-500 bg-green-50'
                        : showExplanation && selectedAnswer === option.id && option.id !== slide.correct_answer_id
                        ? 'border-red-500 bg-red-50'
                        : ''
                    }`}
                    onClick={() => !showExplanation && setSelectedAnswer(option.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedAnswer === option.id ? 'border-primary bg-primary' : 'border-gray-300'
                        }`}>
                          {selectedAnswer === option.id && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                        <span className="text-sm">{option.text}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {!showExplanation && selectedAnswer && (
                <Button 
                  onClick={() => handleMCQSubmit(slide)}
                  className="w-full"
                >
                  Submit Answer
                </Button>
              )}

              {showExplanation && (
                <Card className={`${isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className={`w-5 h-5 ${isCorrect ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`font-semibold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                        {isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{slide.explanation}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        );

      case 'drag_drop':
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">{slide.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Items to drag */}
                <div>
                  <h4 className="font-semibold mb-3">Items:</h4>
                  <div className="space-y-2">
                    {slide.items.map((item) => (
                      <Card 
                        key={item.id}
                        className="cursor-move bg-blue-50 border-blue-200"
                      >
                        <CardContent className="p-3">
                          <span className="text-sm">{item.text}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-semibold mb-3">Categories:</h4>
                  <div className="space-y-2">
                    {slide.categories.map((category) => (
                      <Card 
                        key={category}
                        className="min-h-[60px] border-dashed border-gray-300"
                      >
                        <CardContent className="p-3">
                          <div className="font-medium text-gray-600 mb-2">{category}</div>
                          <div className="text-xs text-gray-500">
                            Drop items here
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {!dragDropSubmitted && (
                <Button 
                  onClick={() => handleDragDropSubmit(slide)}
                  className="w-full"
                >
                  Submit Answers
                </Button>
              )}

              {dragDropSubmitted && (
                <Card className="border-blue-500 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">
                        {Object.entries(slide.correct_mapping).every(
                          ([itemId, correctCategory]) => dragDropMapping[itemId] === correctCategory
                        ) ? 'Correct!' : 'Some answers are incorrect'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{slide.explanation}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        );

      default:
        return <div>Unknown slide type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold">{lesson.title}</h1>
                <p className="text-sm text-muted-foreground">{lesson.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {lesson.estimated_duration_minutes} min
              </Badge>
              <div className="text-sm text-muted-foreground">
                {currentSlideIndex + 1} of {lesson.slides.length}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Progress value={progressPercentage} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              {completedSlides.size}/{lesson.slides.length} completed
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          {renderSlideContent(currentSlide)}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={previousSlide}
            disabled={currentSlideIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {lesson.slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentSlideIndex(index);
                  resetSlideState();
                }}
                className={`w-3 h-3 rounded-full ${
                  index === currentSlideIndex
                    ? 'bg-primary'
                    : completedSlides.has(lesson.slides[index].id)
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={nextSlide}
            disabled={currentSlideIndex === lesson.slides.length - 1}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}