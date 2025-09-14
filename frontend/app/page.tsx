'use client';

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Trophy, ArrowRight, Sparkles, Code, Zap, Rocket } from "lucide-react";
import { setAuthToken } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";

// Floating particles component
function FloatingParticles() {
  const [particles, setParticles] = useState<Array<{left: number, top: number, delay: number, duration: number}>>([]);

  useEffect(() => {
    // Generate particles only on client side to avoid hydration mismatch
    const newParticles = [...Array(50)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 20 + Math.random() * 10
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        >
          <div className="w-1 h-1 bg-orange-400/20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Typing animation hook
function useTypingAnimation(text: string, speed: number = 100) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return displayText;
}

// Interactive code demo component
function CodeDemo() {
  const [activeTab, setActiveTab] = useState('python');
  const codeExamples = {
    python: 'def learn_coding():\n    return "Hello, CodeByte!"',
    javascript: 'const learnCoding = () => {\n  return "Hello, CodeByte!";\n};',
    java: 'public class CodeByte {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeByte!");\n    }\n}'
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700 group hover:shadow-orange-500/20 hover:shadow-2xl transition-all duration-500">
      <div className="flex bg-gray-800 px-4 py-2 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex ml-4 gap-2">
          {Object.keys(codeExamples).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveTab(lang)}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                activeTab === lang
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <pre className="text-green-400 text-sm font-mono leading-relaxed">
          <code>{codeExamples[activeTab as keyof typeof codeExamples]}</code>
        </pre>
      </div>
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const heroText = useTypingAnimation('CodeByte', 80);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slide-up');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleYCLogin = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(getApiEndpoint('login-account'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'partner@ycombinator.com', 
          password: 'helloyc' 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          setAuthToken(data.token);
        }
        router.push('/dashboard');
      } else {
        console.error('YC Login failed:', data.detail);
      }
    } catch (error) {
      console.error('Network error during YC login:', error);
    }

    setLoading(false);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 relative overflow-hidden">
      <FloatingParticles />
      {/* Dynamic gradient background */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(251, 146, 60, 0.3) 0%, transparent 50%)`
        }}
      />
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white/80 backdrop-blur-lg shadow-sm border-b border-orange-100 sticky top-0 z-50">
        <Link className="flex items-center justify-center group" href="/">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="font-bold text-2xl text-orange-600">CodeByte</span>
        </Link>
        <nav className="ml-auto flex gap-3">
          <Button variant="ghost" className="hover:bg-orange-50 hover:text-orange-600" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section ref={heroRef} className="w-full py-16 md:py-28 lg:py-36 xl:py-52 relative overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-100 to-red-100 rounded-full text-orange-700 text-sm font-medium mb-4 shadow-lg backdrop-blur-sm border border-orange-200 animate-pulse">
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  AI-Powered Learning Platform
                  <Zap className="w-4 h-4 ml-2 text-yellow-500 animate-bounce" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none max-w-4xl">
                  <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                    Learn to Code with
                  </span>
                  <span className="text-orange-600 block mt-2 animate-gradient bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent bg-300 animate-gradient-x">
                    {heroText}
                    {heroText.length < 8 && <span className="inline-block animate-pulse text-orange-500 ml-1">|</span>}
                  </span>
                </h1>
                <p className="mx-auto max-w-[800px] text-gray-600 text-lg md:text-xl leading-relaxed animate-in fade-in-0 slide-in-from-bottom-6 duration-1000 delay-500">
                  Master programming skills through AI-generated interactive lessons, hands-on projects, and personalized learning paths.
                  <span className="block mt-2 text-orange-600 font-semibold">Your coding journey starts here.</span>
                </p>
              </div>
              <div className="flex flex-col items-center gap-8 animate-in fade-in-0 slide-in-from-bottom-6 duration-1000 delay-700">
                <div className="relative">
                  <Button
                    size="lg"
                    onClick={handleYCLogin}
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-xl font-bold px-12 py-6 rounded-2xl shadow-2xl hover:shadow-orange-500/50 transition-all duration-500 transform hover:scale-110 border-2 border-orange-400 relative overflow-hidden group"
                  >
                    <span className="relative z-10">
                      {loading ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Logging in...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                          YC Login
                        </span>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden" asChild>
                    <Link href="/signup">
                      <span className="relative z-10 flex items-center">
                        Get Started Free
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl border-2 border-orange-200 hover:border-orange-400 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-300 group" asChild>
                    <Link href="/login" className="flex items-center">
                      <Code className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                      Sign In
                    </Link>
                  </Button>
                </div>

                {/* Interactive code demo */}
                <div className="mt-12 w-full max-w-2xl scroll-reveal opacity-0">
                  <CodeDemo />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-28 lg:py-36 bg-gradient-to-b from-white via-orange-50/30 to-white relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-red-200/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-200/20 to-orange-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16 scroll-reveal opacity-0 relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent animate-gradient-x bg-300">
                Why Choose CodeByte?
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Experience the future of coding education with our cutting-edge platform
              </p>
              <div className="flex justify-center mt-6 gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-2 h-2 bg-orange-500 rounded-full animate-bounce`} style={{animationDelay: `${i * 0.2}s`}}></div>
                ))}
              </div>
            </div>
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-12 relative z-10">
              <Card className="scroll-reveal opacity-0 group border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-500 hover:-translate-y-4 hover:rotate-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-red-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="pb-4 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <BookOpen className="h-8 w-8 text-white group-hover:animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">Interactive Lessons</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-gray-600 leading-relaxed">
                    Learn through hands-on coding exercises and real-world projects that build your skills progressively with AI-powered guidance.
                  </p>
                </CardContent>
              </Card>

              <Card className="scroll-reveal opacity-0 group border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-500 hover:-translate-y-4 hover:rotate-1 relative overflow-hidden" style={{animationDelay: '200ms'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-red-100/50 to-pink-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="pb-4 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <Target className="h-8 w-8 text-white group-hover:animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-red-700 transition-colors duration-300">Personalized Learning</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-gray-600 leading-relaxed">
                    Track your progress with intelligent dashboards and adaptive learning paths tailored specifically to your learning pace and style.
                  </p>
                </CardContent>
              </Card>

              <Card className="scroll-reveal opacity-0 group border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-500 hover:-translate-y-4 hover:rotate-1 relative overflow-hidden" style={{animationDelay: '400ms'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 to-orange-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="pb-4 relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                    <Trophy className="h-8 w-8 text-white group-hover:animate-pulse" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-pink-700 transition-colors duration-300">Industry-Ready Skills</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-gray-600 leading-relaxed">
                    Master in-demand programming languages and frameworks used by top companies worldwide with practical, real-world applications.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t border-orange-100 bg-orange-50">
        <p className="text-sm text-gray-600">© 2025 CodeByte. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-6 sm:gap-8">
          <Link className="text-sm hover:underline underline-offset-4 text-gray-600 hover:text-orange-600 transition-colors" href="#">
            Terms of Service
          </Link>
          <Link className="text-sm hover:underline underline-offset-4 text-gray-600 hover:text-orange-600 transition-colors" href="#">
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}