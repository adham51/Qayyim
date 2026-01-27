import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Bot, Zap, FileText } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Logo />
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-12 text-center md:py-24 lg:py-32">
          <div className="container">
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Smarter Grading, Faster Feedback.
            </h1>
            <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground md:text-xl">
              Qayyim leverages generative AI to automate exam grading for computer science courses, providing consistent, scalable, and transparent evaluations.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/register">Get Started for Free</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="bg-muted py-12 md:py-24 lg:py-32">
          <div className="container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-headline text-3xl font-bold sm:text-4xl">Why Qayyim?</h2>
              <p className="mt-4 text-muted-foreground">
                Empower educators and students with cutting-edge AI tools designed for fairness and efficiency.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Bot className="h-8 w-8 text-primary" />}
                title="AI-Powered Grading"
                description="Automatically grade MCQs, True/False, and short-answer questions with high accuracy."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-primary" />}
                title="Instant Feedback"
                description="Generate detailed, constructive feedback for students to understand their mistakes and learn."
              />
              <FeatureCard
                icon={<FileText className="h-8 w-8 text-primary" />}
                title="Streamlined Workflow"
                description="Easily create exams, upload submissions, and manage grades all in one place."
              />
              <FeatureCard
                icon={<CheckCircle className="h-8 w-8 text-primary" />}
                title="Fair & Transparent"
                description="Reduce grading bias and handle student grievances with a clear, structured process."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Qayyim. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        {icon}
        <CardTitle className="font-headline text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
