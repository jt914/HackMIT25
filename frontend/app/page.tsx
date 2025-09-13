import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Trophy } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white shadow-sm border-b">
        <Link className="flex items-center justify-center" href="/">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-2">
            <span className="text-primary-foreground font-bold text-lg">O</span>
          </div>
          <span className="font-bold text-xl">OnboardCademy</span>
        </Link>
        <nav className="ml-auto flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Learn to Code with
                  <span className="text-primary"> OnboardCademy</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Master programming skills through interactive lessons, hands-on projects, and personalized learning paths.
                  Start your coding journey today.
                </p>
              </div>
              <div className="flex gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started Free</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Interactive Lessons</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Learn through hands-on coding exercises and real-world projects that build your skills progressively.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Personalized Learning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Track your progress with personalized dashboards and adaptive learning paths tailored to your pace.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Real Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Master in-demand programming languages and frameworks used by top companies worldwide.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-muted-foreground">© 2025 OnboardCademy. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}