export interface Lesson {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  progress: number;
  totalSteps: number;
  completedSteps: number;
  activities: Activity[];
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'video' | 'quiz' | 'coding' | 'reading';
  title: string;
  content: string;
  completed: boolean;
}

export const dummyLessons: Lesson[] = [
  {
    _id: 'lesson_1',
    title: 'Introduction to Python',
    description: 'Learn the basics of Python programming language with hands-on exercises.',
    category: 'Programming',
    difficulty: 'Beginner',
    duration: '4 hours',
    progress: 65,
    totalSteps: 12,
    completedSteps: 8,
    activities: [
      { id: '1', type: 'video', title: 'Python Basics', content: 'Introduction to Python syntax', completed: true },
      { id: '2', type: 'coding', title: 'Variables and Data Types', content: 'Practice with variables', completed: true },
      { id: '3', type: 'quiz', title: 'Python Quiz', content: 'Test your knowledge', completed: false }
    ],
    createdAt: '2025/01/10'
  },
  {
    _id: 'lesson_2',
    title: 'React Fundamentals',
    description: 'Master React components, state management, and modern React patterns.',
    category: 'Web Development',
    difficulty: 'Intermediate',
    duration: '6 hours',
    progress: 30,
    totalSteps: 15,
    completedSteps: 4,
    activities: [
      { id: '1', type: 'video', title: 'React Components', content: 'Understanding components', completed: true },
      { id: '2', type: 'coding', title: 'State Management', content: 'Working with useState', completed: false }
    ],
    createdAt: '2025/01/12'
  },
  {
    _id: 'lesson_3',
    title: 'Database Design',
    description: 'Learn database design principles and SQL fundamentals.',
    category: 'Data Science',
    difficulty: 'Intermediate',
    duration: '5 hours',
    progress: 80,
    totalSteps: 10,
    completedSteps: 8,
    activities: [
      { id: '1', type: 'reading', title: 'Database Basics', content: 'Understanding databases', completed: true },
      { id: '2', type: 'coding', title: 'SQL Queries', content: 'Practice SQL', completed: true }
    ],
    createdAt: '2025/01/08'
  },
  {
    _id: 'lesson_4',
    title: 'Machine Learning Basics',
    description: 'Introduction to machine learning concepts and algorithms.',
    category: 'Data Science',
    difficulty: 'Advanced',
    duration: '8 hours',
    progress: 15,
    totalSteps: 20,
    completedSteps: 3,
    activities: [
      { id: '1', type: 'video', title: 'ML Introduction', content: 'What is Machine Learning?', completed: true },
      { id: '2', type: 'reading', title: 'Types of ML', content: 'Supervised vs Unsupervised', completed: false }
    ],
    createdAt: '2025/01/15'
  },
  {
    _id: 'lesson_5',
    title: 'JavaScript ES6+',
    description: 'Modern JavaScript features and best practices for web development.',
    category: 'Programming',
    difficulty: 'Intermediate',
    duration: '3 hours',
    progress: 90,
    totalSteps: 8,
    completedSteps: 7,
    activities: [
      { id: '1', type: 'video', title: 'ES6 Features', content: 'Arrow functions, destructuring', completed: true },
      { id: '2', type: 'coding', title: 'Async/Await', content: 'Working with promises', completed: true }
    ],
    createdAt: '2025/01/05'
  }
];