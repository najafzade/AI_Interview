'use client';

import { useState, useEffect } from 'react';
import { getSessionAction, submitFeedbackAction } from '@/app/actions/interview';
import { InterviewSession, Feedback } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Flag, Star, CheckCircle, Info, MessageSquareQuote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [rating, setRating] = useState({ quality: 5, fairness: 5, relevance: 5 });
  const [issues, setIssues] = useState<string[]>([]);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const data = await getSessionAction(params.id);
      if (data) setSession(data);
    }
    load();
  }, [params.id]);

  const handleSubmitFeedback = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      await submitFeedbackAction({
        interviewId: session.id,
        quality: rating.quality,
        fairness: rating.fairness,
        relevance: rating.relevance,
        issues,
        comments
      });
      toast({
        title: "Feedback Saved",
        description: "Your review has been successfully persisted to the database.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save feedback.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleIssue = (issue: string) => {
    setIssues(prev => prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]);
  };

  if (!session) return <div className="p-12 text-center">Loading session details...</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Dashboard
        </Button>
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-primary/5">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-headline font-bold">{session.candidateName}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="font-mono text-[10px]">{session.id}</Badge>
                    <span>•</span>
                    <Badge variant="secondary">{session.skill}</Badge>
                    <span>•</span>
                    <Badge variant="outline">v{session.promptVersion}</Badge>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</div>
                   <Badge className={cn(session.status === 'COMPLETED' ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800")}>
                    {session.status}
                   </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                  <MessageSquareQuote className="w-5 h-5 text-primary" /> Interview Transcript
                </h3>
                <div className="space-y-6">
                  {session.state.conversationHistory.map((m, i) => (
                    <div key={i} className={cn(
                      "flex gap-4 p-4 rounded-xl border",
                      m.speaker === 'ai' ? "bg-white" : "bg-muted/30 border-dashed"
                    )}>
                      <Avatar className="w-8 h-8 shrink-0 border">
                        <AvatarFallback className={m.speaker === 'ai' ? "bg-primary text-white" : "bg-accent text-white"}>
                          {m.speaker === 'ai' ? 'AI' : 'CA'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 w-full">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase text-muted-foreground tracking-tighter">
                            {m.speaker === 'ai' ? 'Agent' : 'Candidate'}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-8 shadow-xl border-accent/20 border-2">
            <CardHeader className="bg-accent/5">
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <Flag className="w-5 h-5 text-accent" /> Evaluator Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Overall Quality</Label>
                    <span className="text-xs font-bold text-accent">{rating.quality}/10</span>
                  </div>
                  <Slider 
                    value={[rating.quality]} 
                    onValueChange={([v]) => setRating(p => ({...p, quality: v}))}
                    max={10} step={1} 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Fairness & Bias</Label>
                    <span className="text-xs font-bold text-accent">{rating.fairness}/10</span>
                  </div>
                  <Slider 
                    value={[rating.fairness]} 
                    onValueChange={([v]) => setRating(p => ({...p, fairness: v}))}
                    max={10} step={1} 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Technical Relevance</Label>
                    <span className="text-xs font-bold text-accent">{rating.relevance}/10</span>
                  </div>
                  <Slider 
                    value={[rating.relevance]} 
                    onValueChange={([v]) => setRating(p => ({...p, relevance: v}))}
                    max={10} step={1} 
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-bold">Flag Issues</Label>
                {[
                  { id: 'weak-eval', label: 'Weak Evaluation' },
                  { id: 'inappropriate', label: 'Inappropriate Question' },
                  { id: 'repetition', label: 'Repetitive Prompts' },
                  { id: 'missed-probing', label: 'Missed Probing Opportunity' },
                ].map(issue => (
                  <div key={issue.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={issue.id} 
                      checked={issues.includes(issue.id)}
                      onCheckedChange={() => toggleIssue(issue.id)}
                    />
                    <label htmlFor={issue.id} className="text-sm cursor-pointer select-none">
                      {issue.label}
                    </label>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm">Internal Comments</Label>
                <Textarea 
                  placeholder="Notes for the prompt engineering team..." 
                  className="min-h-[100px] text-sm"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 border-t">
              <Button 
                onClick={handleSubmitFeedback} 
                className="w-full h-11" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Submit Feedback'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-blue-50/50 border-blue-100">
             <CardContent className="p-4 flex gap-3 text-xs text-blue-700">
                <Info className="w-4 h-4 shrink-0" />
                <p>Prompt instructions used: <strong>{DB.prompts.getActive().instructions}</strong>. This feedback will be used to automatically propose updates to v{Number(session.promptVersion.split('.')[0]) + 1}.</p>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
