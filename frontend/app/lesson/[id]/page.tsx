'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getCurrentUserEmail, isAuthenticated } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";
import confetti from 'canvas-confetti';

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

interface VideoSlide {
  type: 'video';
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number | null;
}

interface InteractiveInvestigationSlide {
  type: 'interactive_investigation';
  id: string;
  title: string;
  problem_description: string;
  problem_context: string;
  solution: string;
  hints: string[];
  chat_history: Array<{
    role: string;
    message: string;
    timestamp: string;
    is_correct?: boolean;
    hint_provided?: boolean;
  }>;
  current_state: string;
  hints_given: number;
}

type Slide = InfoSlide | VideoSlide | MCQQuestion | DragDropQuestion | InteractiveInvestigationSlide;

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
  const [showConfetti, setShowConfetti] = useState(false);
  
  // MCQ state
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // Drag and drop state
  const [dragDropMapping, setDragDropMapping] = useState<Record<string, string>>({});
  const [dragDropSubmitted, setDragDropSubmitted] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  
  // Interactive investigation state
  const [investigationMessage, setInvestigationMessage] = useState('');
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fetchCalled = useRef(false);

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
      setUser({
        id: email,
        email: email,
        name: email.split('@')[0] // Use part before @ as display name
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      router.push('/login');
    }
  }, [router]);

  const fetchLesson = useCallback(async () => {
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
  }, [user?.email, params.id]);

  const loadProgress = useCallback(async () => {
    if (!user?.email || !params.id) return;
    
    try {
      const response = await fetch(getApiEndpoint(`lesson-progress/${user.email}/${params.id}`));
      if (response.ok) {
        const data = await response.json();
        if (data.progress) {
          setCompletedSlides(new Set(data.progress.completed_slides));
          setCurrentSlideIndex(data.progress.current_slide_index);
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  }, [user?.email, params.id]);

  useEffect(() => {
    // Prevent double execution in React 19 Strict Mode
    if (fetchCalled.current) return;
    fetchCalled.current = true;

    fetchUser();
    fetchLesson();

    // Cleanup function to reset ref on unmount
    return () => {
      fetchCalled.current = false;
    };
  }, [params.id, fetchUser, fetchLesson]);

  // Fetch lesson when user is available
  useEffect(() => {
    if (user?.email) {
      fetchLesson();
      loadProgress();
    }
  }, [user, fetchLesson, loadProgress]);

  const saveProgress = async (newCompletedSlides: Set<string>, newSlideIndex: number, forceComplete?: boolean) => {
    if (!user?.email || !lesson) return;
    
    try {
      const isCompleted = forceComplete || newCompletedSlides.size === lesson.slides.length;
      
      const response = await fetch(getApiEndpoint('lesson-progress/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          lesson_id: lesson.id,
          completed_slides: Array.from(newCompletedSlides),
          current_slide_index: newSlideIndex,
          is_completed: isCompleted
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.lesson_completed) {
          // Show confetti and completion message
          triggerConfetti();
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const triggerConfetti = () => {
    // Create multiple confetti bursts
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  // Handle video playback when slide changes
  useEffect(() => {
    if (lesson) {
      const currentSlide = lesson.slides[currentSlideIndex];
      
      // Pause any playing videos when switching slides
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach(video => {
        if (!video.paused) {
          video.pause();
          video.currentTime = 0; // Reset to beginning
        }
      });
      
      // Autoplay video slides after a short delay to ensure DOM is ready
      if (currentSlide.type === 'video') {
        setTimeout(() => {
          // Find the current video element by slide ID instead of using ref
          const videoElement = document.querySelector(`video[data-slide-id="${currentSlide.id}"]`) as HTMLVideoElement;
          if (videoElement) {
            videoElement.currentTime = 0; // Start from beginning
            videoElement.play().catch(error => {
              // Autoplay might be blocked by browser, that's okay
              console.log('Autoplay was prevented:', error);
            });
          }
        }, 200); // Increased delay to ensure DOM update
      }
    }
  }, [currentSlideIndex, lesson]);

  const markSlideComplete = (slideId: string) => {
    const newCompletedSlides = new Set([...completedSlides, slideId]);
    setCompletedSlides(newCompletedSlides);
    saveProgress(newCompletedSlides, currentSlideIndex);
  };

  const nextSlide = () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1) {
      // Auto-mark current slide as complete when advancing (except for questions that need to be answered)
      const currentSlide = lesson.slides[currentSlideIndex];
      let newCompletedSlides = completedSlides;
      
      if (currentSlide.type === 'info' || currentSlide.type === 'video') {
        newCompletedSlides = new Set([...completedSlides, currentSlide.id]);
        setCompletedSlides(newCompletedSlides);
      }
      
      const newSlideIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newSlideIndex);
      saveProgress(newCompletedSlides, newSlideIndex);
      resetSlideState();
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      const newSlideIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newSlideIndex);
      saveProgress(completedSlides, newSlideIndex);
      resetSlideState();
    }
  };

  const resetSlideState = () => {
    setSelectedAnswer('');
    setShowExplanation(false);
    setIsCorrect(null);
    setDragDropMapping({});
    setDragDropSubmitted(false);
    setDraggedItem(null);
    setDragOverCategory(null);
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCategory(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDragOverCategory(category);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCategory(null);
    }
  };

  const handleDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
      setDragDropMapping(prev => ({
        ...prev,
        [itemId]: category
      }));
    }
    setDragOverCategory(null);
    setDraggedItem(null);
  };

  const removeItemFromCategory = (itemId: string) => {
    setDragDropMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[itemId];
      return newMapping;
    });
  };

  const handleInvestigationMessage = async (slide: InteractiveInvestigationSlide, message: string) => {
    if (!message.trim() || investigationLoading || !lesson) return;
    
    setInvestigationLoading(true);
    
    try {
      const response = await fetch(getApiEndpoint('interactive-slide-message'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
          lesson_id: lesson.id,
          slide_id: slide.id,
          message: message
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.updated_slide) {
          // Update the slide in the lesson
          const updatedSlides = [...lesson.slides];
          const slideIndex = updatedSlides.findIndex(s => s.id === slide.id);
          if (slideIndex !== -1) {
            updatedSlides[slideIndex] = data.updated_slide;
            setLesson(prev => prev ? { ...prev, slides: updatedSlides } : null);
          }
          
          
          // Mark as complete if investigation is finished
          if (data.investigation_completed) {
            markSlideComplete(slide.id);
          }
        }
      } else {
        console.error('Failed to send investigation message');
      }
    } catch (error) {
      console.error('Error sending investigation message:', error);
    } finally {
      setInvestigationLoading(false);
      setInvestigationMessage('');
    }
  };

  const deleteLesson = async () => {
    if (!lesson) return;

    setIsDeleting(true);
    try {
      const response = await fetch(getApiEndpoint(`lessons/${lesson.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to delete lesson:', err);
      alert('Failed to delete lesson. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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
              <CardTitle className="text-2xl break-words hyphens-auto" title={slide.title}>{slide.title}</CardTitle>
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

              {/* Info slides are auto-marked complete when clicking Next */}
            </CardContent>
          </Card>
        );

      case 'video':
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl break-words hyphens-auto" title={slide.title}>{slide.title}</CardTitle>
              {slide.description && (
                <p className="text-gray-600 mt-2 break-words hyphens-auto" title={slide.description}>{slide.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="w-full max-w-3xl">
                  <video 
                    key={slide.id}
                    data-slide-id={slide.id}
                    controls 
                    className="w-full h-auto rounded-lg shadow-lg"
                    poster="/api/placeholder/800/450"
                    preload="metadata"
                  >
                    <source src={slide.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
              
              {slide.duration_seconds && (
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {Math.ceil(slide.duration_seconds / 60)} minutes</span>
                </div>
              )}

              {/* Video slides are auto-marked complete when clicking Next */}
            </CardContent>
          </Card>
        );

      case 'mcq':
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl break-words hyphens-auto" title={slide.question}>{slide.question}</CardTitle>
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
                        <span className="text-sm break-words">{option.text}</span>
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
        // Get unassigned items (items not in any category)
        const unassignedItems = slide.items.filter(item => !dragDropMapping[item.id]);

        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl break-words hyphens-auto" title={slide.question}>{slide.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Items to drag */}
                <div>
                  <h4 className="font-semibold mb-3">Items to categorize:</h4>
                  <div className="space-y-2 min-h-[200px] p-3 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    {unassignedItems.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        All items have been categorized!
                      </div>
                    ) : (
                      unassignedItems.map((item) => (
                        <Card
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className={`cursor-move transition-all duration-200 hover:shadow-md select-none ${
                            draggedItem === item.id
                              ? 'opacity-50 scale-95 bg-orange-100 border-orange-300'
                              : 'bg-white border-orange-200 hover:border-orange-300'
                          } ${!dragDropSubmitted ? 'hover:bg-orange-50' : ''}`}
                        >
                          <CardContent className="p-3">
                            <span className="text-sm font-medium break-words">{item.text}</span>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="font-semibold mb-3">Categories:</h4>
                  <div className="space-y-3">
                    {slide.categories.map((category) => {
                      const itemsInCategory = slide.items.filter(item => dragDropMapping[item.id] === category);
                      const isCorrectCategory = (itemId: string) =>
                        dragDropSubmitted && slide.correct_mapping[itemId] === category;
                      const isIncorrectCategory = (itemId: string) =>
                        dragDropSubmitted && dragDropMapping[itemId] === category && slide.correct_mapping[itemId] !== category;

                      return (
                        <Card
                          key={category}
                          className={`min-h-[100px] transition-all duration-200 ${
                            dragOverCategory === category
                              ? 'border-2 border-orange-400 bg-orange-50 scale-[1.02]'
                              : dragDropSubmitted
                              ? 'border-2 border-gray-200'
                              : 'border-2 border-dashed border-gray-300 hover:border-gray-400'
                          }`}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, category)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category)}
                        >
                          <CardContent className="p-4">
                            <div className="font-medium text-gray-800 mb-3 text-center">
                              {category}
                            </div>

                            <div className="space-y-2">
                              {itemsInCategory.length === 0 ? (
                                <div className="text-center text-gray-400 text-sm py-4 border-2 border-dashed border-gray-200 rounded">
                                  Drop items here
                                </div>
                              ) : (
                                itemsInCategory.map((item) => (
                                  <Card
                                    key={item.id}
                                    className={`transition-all duration-200 ${
                                      dragDropSubmitted
                                        ? isCorrectCategory(item.id)
                                          ? 'bg-green-100 border-green-300'
                                          : isIncorrectCategory(item.id)
                                          ? 'bg-red-100 border-red-300'
                                          : 'bg-gray-100'
                                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                    } ${!dragDropSubmitted ? 'cursor-pointer' : ''}`}
                                    onClick={() => !dragDropSubmitted && removeItemFromCategory(item.id)}
                                  >
                                    <CardContent className="p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm break-words">{item.text}</span>
                                        {!dragDropSubmitted && (
                                          <button className="text-gray-400 hover:text-red-500 ml-2">
                                            ×
                                          </button>
                                        )}
                                        {dragDropSubmitted && isCorrectCategory(item.id) && (
                                          <span className="text-green-600 text-sm">✓</span>
                                        )}
                                        {dragDropSubmitted && isIncorrectCategory(item.id) && (
                                          <span className="text-red-600 text-sm">✗</span>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              {!dragDropSubmitted && (
                <Button
                  onClick={() => handleDragDropSubmit(slide)}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={Object.keys(dragDropMapping).length === 0}
                >
                  Submit Answers
                </Button>
              )}

              {dragDropSubmitted && (
                <Card className={`${
                  Object.entries(slide.correct_mapping).every(
                    ([itemId, correctCategory]) => dragDropMapping[itemId] === correctCategory
                  ) ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className={`w-5 h-5 ${
                        Object.entries(slide.correct_mapping).every(
                          ([itemId, correctCategory]) => dragDropMapping[itemId] === correctCategory
                        ) ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <span className={`font-semibold ${
                        Object.entries(slide.correct_mapping).every(
                          ([itemId, correctCategory]) => dragDropMapping[itemId] === correctCategory
                        ) ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {Object.entries(slide.correct_mapping).every(
                          ([itemId, correctCategory]) => dragDropMapping[itemId] === correctCategory
                        ) ? 'Perfect! All items are correctly categorized!' : 'Some items are in the wrong categories. Try again!'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{slide.explanation}</p>

                    {/* Show correct answers */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-800 mb-2">Correct categorization:</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        {Object.entries(slide.correct_mapping).map(([itemId, correctCategory]) => {
                          const item = slide.items.find(i => i.id === itemId);
                          return (
                            <div key={itemId} className="flex justify-between">
                              <span>&quot;{item?.text}&quot;</span>
                              <span className="font-medium">→ {correctCategory}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        );

      case 'interactive_investigation':
        return (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl break-words hyphens-auto" title={slide.title}>🕵️ {slide.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  {slide.hints_given > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      {slide.hints_given} hint{slide.hints_given > 1 ? 's' : ''} given
                    </Badge>
                  )}
                  {slide.current_state === 'solved' && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Solved!
                    </Badge>
                  )}
                  {slide.current_state === 'given_up' && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problem Description */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">🔍 The Problem</h4>
                <p className="text-orange-700 leading-relaxed">{slide.problem_description}</p>
              </div>

              {/* Context */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Context</h4>
                <p className="text-blue-700 leading-relaxed">{slide.problem_context}</p>
              </div>

              {/* Chat History */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">💬 Investigation Chat</h4>
                <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg border">
                  {slide.chat_history.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <p>Start your investigation! Ask questions about the problem.</p>
                      <p className="text-sm mt-1">Try: &quot;What error messages are we seeing?&quot; or &quot;Which components are involved?&quot;</p>
                    </div>
                  ) : (
                    slide.chat_history.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-orange-500 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                          {msg.role === 'assistant' && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-400">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                              <div className="flex items-center space-x-1">
                                {msg.hint_provided && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                                    💡 Hint
                                  </Badge>
                                )}
                                {msg.is_correct && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    ✅ Correct!
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input Form or Completion Message */}
                {slide.current_state === 'investigating' ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleInvestigationMessage(slide, investigationMessage);
                    }}
                    className="flex space-x-2 mt-4"
                  >
                    <input
                      type="text"
                      value={investigationMessage}
                      onChange={(e) => setInvestigationMessage(e.target.value)}
                      placeholder="Ask a question or share your hypothesis..."
                      className="flex-1 px-4 py-2 border border-orange-200 rounded-lg focus:outline-none focus:border-orange-500"
                      disabled={investigationLoading}
                    />
                    <Button
                      type="submit"
                      disabled={investigationLoading || !investigationMessage.trim()}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {investigationLoading ? '...' : 'Send'}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">
                      {slide.current_state === 'solved' 
                        ? '🎉 Great job solving this investigation!' 
                        : 'Investigation completed. Thanks for working through this issue!'}
                    </p>
                    {slide.current_state === 'solved' && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">✅ Solution</h4>
                        <p className="text-green-700 leading-relaxed">{slide.solution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Completion Button */}
              {slide.current_state !== 'investigating' && (
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
              )}
            </CardContent>
          </Card>
        );

      default:
        return <div>Unknown slide type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-orange-100 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-orange-600 break-words hyphens-auto" title={lesson.title}>{lesson.title}</h1>
                <p className="text-gray-600 break-words hyphens-auto" title={lesson.description}>{lesson.description}</p>
              </div>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Lesson</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete &quot;{lesson.title}&quot;? This action cannot be undone.
                      All progress data for this lesson will be permanently removed.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={deleteLesson}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-0 rounded-full px-3 py-1">
                <Clock className="w-3 h-3 mr-1" />
                {lesson.estimated_duration_minutes} min
              </Badge>
              <div className="text-sm text-gray-600 font-medium">
                {currentSlideIndex + 1} of {lesson.slides.length}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Progress value={progressPercentage} className="h-3 bg-orange-100">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{width: `${progressPercentage}%`}} />
              </Progress>
            </div>
            <div className="text-sm text-gray-600 font-medium">
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

      {/* Lesson Completion Modal */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in-0 duration-500">
          <div className="bg-white rounded-2xl p-8 mx-4 max-w-md w-full text-center animate-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Lesson Complete!</h2>
            <p className="text-gray-600 mb-6">
              Congratulations! You&apos;ve successfully completed &quot;{lesson?.title}&quot;. 
              Keep up the great work on your learning journey!
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                Back to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowConfetti(false)}
                className="flex-1"
              >
                Continue Reviewing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}