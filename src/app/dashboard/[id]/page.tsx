
'use client';

import { useState, useEffect, use } from 'react';
import { getFirestore, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getFeedbackForSessionAction, submitFeedbackAction } from '@/app/actions/interview';
import { FeedbackRecord } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  MessageSquareQuote, 
  Volume2, 
  Star, 
  AlertTriangle,
  CheckCircle2,
  Mic,
  Brain
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = getFirestore();
  const { data: session, loading } = useDoc(doc(db, 'sessions', id));
  const [activeTurn, setActiveTurn] = useState<number | null>(null);
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [overallRating, setOverallRating] = useState(4);
  const [fairnessRating, setFairnessRating] = useState(4);
  const [relevanceRating, setRelevanceRating] = useState(4);
  const [flagsInput, setFlagsInput] = useState('');
  const [notes, setNotes] = useState('');



  useEffect(() => {
    async function loadFeedback() {
      const data = await getFeedbackForSessionAction(id);
      setFeedback(data);
    }
    loadFeedback();
  }, [id]);

  const handleSubmitFeedback = async () => {
    await submitFeedbackAction({
      sessionId: id,
      evaluatorId: 'dashboard-evaluator',
      overallRating,
      fairnessRating,
      relevanceRating,
      flags: flagsInput.split(',').map((f) => f.trim()).filter(Boolean),
      notes,
    });
    const data = await getFeedbackForSessionAction(id);
    setFeedback(data);
    setFlagsInput('');
    setNotes('');
    toast({ title: 'Feedback submitted', description: 'Evaluation persisted successfully.' });
  };

  const handleUpdateTurnEval = async (index: number, field: string, value: any) => {
    if (!session || !db) return;
    const newHistory = [...session.history];
    const turn = { ...newHistory[index] };
    turn.evaluations = { 
      ...(turn.evaluations || {}), 
      [field]: value 
    };
    newHistory[index] = turn;

    try {
      await updateDoc(doc(db, 'sessions', session.id), { history: newHistory });
      toast({ title: "Metric Updated", description: "Per-turn evaluation saved." });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  if (loading) return <div className="p-12 text-center">Loading session dataset...</div>;
  if (!session) return <div className="p-12 text-center">Session not found.</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Dataset
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
                    <Badge variant="secondary">{session.skill}</Badge>
                    <Badge variant="outline">Prompt v{session.promptVersion}</Badge>
                  </div>
                </div>
                <Badge className={cn(session.status === 'COMPLETED' ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800")}>
                  {session.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <h3 className="text-lg font-headline font-bold flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-primary" /> Training Dataset / Transcript
              </h3>
              <div className="space-y-6">
                {session.history.map((m, i) => (
                  <div key={i} className={cn(
                    "relative group p-4 rounded-xl border transition-all",
                    m.speaker === 'ai' ? "bg-white" : "bg-muted/30 border-dashed",
                    activeTurn === i && "ring-2 ring-primary"
                  )}>
                    <div className="flex gap-4">
                      <Avatar className="w-8 h-8 shrink-0 border">
                        <AvatarFallback className={m.speaker === 'ai' ? "bg-primary text-white" : "bg-accent text-white"}>
                          {m.speaker === 'ai' ? 'AI' : 'CA'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 w-full">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase text-muted-foreground">
                            {m.speaker === 'ai' ? 'Agent (TTS/Logic)' : 'Candidate (ASR)'}
                          </span>
                          <div className="flex gap-1">
                            {m.evaluations?.asrRating && <Badge variant="outline" className="text-[9px] gap-1"><Mic className="w-2 h-2"/> ASR {m.evaluations.asrRating}</Badge>}
                            {m.evaluations?.ttsRating && <Badge variant="outline" className="text-[9px] gap-1"><Volume2 className="w-2 h-2"/> TTS {m.evaluations.ttsRating}</Badge>}
                            {m.evaluations?.logicRating && <Badge variant="outline" className="text-[9px] gap-1"><Brain className="w-2 h-2"/> LOGIC {m.evaluations.logicRating}</Badge>}
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed">{m.text}</p>
                        
                        <div className="flex items-center gap-2">
                          {m.audioDataUri && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => {
                              const audio = new Audio(m.audioDataUri);
                              audio.play();
                            }}>
                              <Volume2 className="w-3 h-3" /> Play Audio
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setActiveTurn(activeTurn === i ? null : i)}>
                            {activeTurn === i ? 'Close Eval' : 'Evaluate Turn'}
                          </Button>
                        </div>

                        {activeTurn === i && (
                          <div className="mt-4 p-4 bg-muted/50 rounded-lg border space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">ASR Acc (1-5)</Label>
                                <div className="flex gap-1">
                                  {[1,2,3,4,5].map(v => (
                                    <button 
                                      key={v} 
                                      onClick={() => handleUpdateTurnEval(i, 'asrRating', v)}
                                      className={cn("w-6 h-6 rounded text-[10px] border", m.evaluations?.asrRating === v ? "bg-primary text-white" : "bg-white")}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">TTS Qual (1-5)</Label>
                                <div className="flex gap-1">
                                  {[1,2,3,4,5].map(v => (
                                    <button 
                                      key={v} 
                                      onClick={() => handleUpdateTurnEval(i, 'ttsRating', v)}
                                      className={cn("w-6 h-6 rounded text-[10px] border", m.evaluations?.ttsRating === v ? "bg-primary text-white" : "bg-white")}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Logic Acc (1-5)</Label>
                                <div className="flex gap-1">
                                  {[1,2,3,4,5].map(v => (
                                    <button 
                                      key={v} 
                                      onClick={() => handleUpdateTurnEval(i, 'logicRating', v)}
                                      className={cn("w-6 h-6 rounded text-[10px] border", m.evaluations?.logicRating === v ? "bg-primary text-white" : "bg-white")}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-8 border-2">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" /> Analytics Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Dataset ID</Label>
                <div className="p-2 bg-muted rounded font-mono text-[10px] break-all">{session.id}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Prompt Version</Label>
                <Badge variant="outline" className="w-full justify-center py-1">v{session.promptVersion}</Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Audio Samples</Label>
                <div className="text-sm font-medium">{session.history.filter(h => !!h.audioDataUri).length} Captured</div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Submit Conversation Feedback</Label>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <Input type="number" min={1} max={5} value={overallRating} onChange={(e) => setOverallRating(Number(e.target.value))} placeholder="Overall" />
                  <Input type="number" min={1} max={5} value={fairnessRating} onChange={(e) => setFairnessRating(Number(e.target.value))} placeholder="Fairness" />
                  <Input type="number" min={1} max={5} value={relevanceRating} onChange={(e) => setRelevanceRating(Number(e.target.value))} placeholder="Relevance" />
                </div>
                <Input value={flagsInput} onChange={(e) => setFlagsInput(e.target.value)} placeholder="flags (comma separated)" />
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional notes" />
                <Button onClick={handleSubmitFeedback} size="sm" className="w-full">Save Feedback</Button>
                <div className="text-xs text-muted-foreground">Stored entries: {feedback.length}</div>
              </div>
              <Separator />
              <div className="text-[10px] text-muted-foreground italic">
                This data is formatted for training future ASR/TTS/Logic models.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <label className={cn("text-sm font-medium leading-none", className)}>{children}</label>
);

const Separator = () => <div className="h-px bg-border w-full my-4" />;
