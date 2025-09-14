import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Trophy, ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white/80 backdrop-blur-lg shadow-sm border-b border-orange-100 sticky top-0 z-50">
        <Link className="flex items-center justify-center group" href="/">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">CodeByte</span>
        </Link>
        <nav className="ml-auto flex gap-3">
          <Button variant="ghost" className="hover:bg-orange-50 hover:text-orange-600" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-16 md:py-28 lg:py-36 xl:py-52 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 via-transparent to-amber-400/10"></div>
          <div className="container px-4 md:px-6 mx-auto relative">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
                <div className="inline-flex items-center px-4 py-2 bg-orange-100 rounded-full text-orange-700 text-sm font-medium mb-4">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI-Powered Learning Platform
                </div>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none max-w-4xl">
                  Learn to Code with
                  <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent block mt-2"> CodeByte</span>
                </h1>
                <p className="mx-auto max-w-[800px] text-gray-600 text-lg md:text-xl leading-relaxed">
                  Master programming skills through AI-generated interactive lessons, hands-on projects, and personalized learning paths.
                  Your coding journey starts here.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in-0 slide-in-from-bottom-6 duration-1000 delay-300">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group" asChild>
                  <Link href="/signup">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-300" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-28 lg:py-36 bg-gradient-to-b from-white via-orange-50/30 to-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Why Choose CodeByte?
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Experience the future of coding education with our cutting-edge platform
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
              <Card className="group border-0 shadow-lg bg-gradient-to-br from-white to-orange-50/50 hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500 hover:-translate-y-2">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Interactive Lessons</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    Learn through hands-on coding exercises and real-world projects that build your skills progressively with AI-powered guidance.
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-lg bg-gradient-to-br from-white to-amber-50/50 hover:shadow-2xl hover:shadow-amber-100 transition-all duration-500 hover:-translate-y-2">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Personalized Learning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    Track your progress with intelligent dashboards and adaptive learning paths tailored specifically to your learning pace and style.
                  </p>
                </CardContent>
              </Card>

              <Card className="group border-0 shadow-lg bg-gradient-to-br from-white to-yellow-50/50 hover:shadow-2xl hover:shadow-yellow-100 transition-all duration-500 hover:-translate-y-2">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <Trophy className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Industry-Ready Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    Master in-demand programming languages and frameworks used by top companies worldwide with practical, real-world applications.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50">
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