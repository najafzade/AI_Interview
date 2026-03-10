import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UserCheck, BarChart3, Settings2, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-12 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-6xl font-headline font-bold text-primary tracking-tight">
          Interview Loop AI
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body">
          An end-to-end conversational agent platform for technical assessment and continuous improvement.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full">
        <Card className="border-2 hover:border-primary/50 transition-all duration-300 shadow-lg group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UserCheck className="text-primary w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-headline">Candidate Portal</CardTitle>
            <CardDescription className="text-base">
              Take part in a technical interview conducted by our AI agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/interview">
              <Button size="lg" className="w-full text-lg group">
                Start Interview
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-accent/50 transition-all duration-300 shadow-lg group">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart3 className="text-accent w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-headline">Evaluator Dashboard</CardTitle>
            <CardDescription className="text-base">
              Review transcripts, rate conversations, and provide prompt feedback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="w-full text-lg group">
                Review Interviews
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2 text-sm text-muted-foreground font-medium bg-white/50 px-4 py-2 rounded-full border">
        <Settings2 className="w-4 h-4" />
        <span>Prompt Versioning Enabled</span>
        <span className="mx-2 opacity-20">|</span>
        <span>A/B Comparison Ready</span>
      </div>
    </div>
  );
}
