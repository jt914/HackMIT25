import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-white shadow-sm">
        <Link className="flex items-center justify-center" href="/">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-2">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="font-bold text-xl text-gray-900">OnboardCademy</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Login
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/signup">
            Sign Up
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-gray-900">
                  Learn to Code with
                  <span className="text-orange-500"> OnboardCademy</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
                  Master programming skills through interactive lessons, hands-on projects, and personalized learning paths.
                  Start your coding journey today.
                </p>
              </div>
              <div className="space-x-4">
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-500 disabled:pointer-events-none disabled:opacity-50"
                  href="/signup"
                >
                  Get Started Free
                </Link>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50"
                  href="/login"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-500 font-bold text-xl">📚</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Interactive Lessons</h3>
                <p className="text-gray-600">
                  Learn through hands-on coding exercises and real-world projects that build your skills progressively.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-500 font-bold text-xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Personalized Learning</h3>
                <p className="text-gray-600">
                  Track your progress with personalized dashboards and adaptive learning paths tailored to your pace.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-500 font-bold text-xl">🏆</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Real Skills</h3>
                <p className="text-gray-600">
                  Master in-demand programming languages and frameworks used by top companies worldwide.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-gray-600">© 2025 OnboardCademy. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-gray-600" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-gray-600" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}