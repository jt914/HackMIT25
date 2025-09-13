// Fallback in-memory database for development when MongoDB is unavailable
interface User {
  _id: string;
  email: string;
  password: string;
  name: string;
  enrolledLessons: string[];
  createdAt: Date;
}

// Simple in-memory store (for development only)
const users: User[] = [];
let userIdCounter = 1;

export const fallbackDB = {
  async insertUser(userData: Omit<User, '_id'>): Promise<{ insertedId: string }> {
    const newUser: User = {
      ...userData,
      _id: userIdCounter.toString(),
    };
    users.push(newUser);
    userIdCounter++;
    return { insertedId: newUser._id };
  },

  async findUserByEmail(email: string): Promise<User | null> {
    return users.find(user => user.email === email) || null;
  },

  async findUserById(id: string): Promise<User | null> {
    return users.find(user => user._id === id) || null;
  },

  async updateUser(id: string, update: Partial<User>): Promise<boolean> {
    const userIndex = users.findIndex(user => user._id === id);
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], ...update };
      return true;
    }
    return false;
  },

  async addToEnrolledLessons(id: string, lessonId: string): Promise<boolean> {
    const user = users.find(user => user._id === id);
    if (user && !user.enrolledLessons.includes(lessonId)) {
      user.enrolledLessons.push(lessonId);
      return true;
    }
    return false;
  }
};