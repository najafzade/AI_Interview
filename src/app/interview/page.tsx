
'use client';

import { useState, useEffect, useRef } from 'react';
import { appendTurnsToSessionAction, createSessionAction, processTurnAction } from '@/app/actions/interview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, Mic, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { resolveActivePrompt } from '@/lib/prompt-config';

interface Message {
  role: 'ai' | 'candidate';
  text: string;
  audioDataUri?: string;
}

export default function InterviewPage() {
  const db = useFirestore();
  const [candidateName, setCandidateName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activePrompt, setActivePrompt] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef<any>(null);

  useEffect(() => {
    async function loadConfig() {
      if (!db) return;
      const q = query(collection(db, 'prompt_configs'), where('isActive', '==', true), limit(1));
      const snap = await getDocs(q);
      const configs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      setActivePrompt(resolveActivePrompt(configs));
    }
    loadConfig();
  }, [db]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playAudio = (uri: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = uri;
      audioPlayerRef.current.play();
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !db) return;
    setIsLoading(true);
    try {
      const bootstrapId = 'bootstrap';
      const output = await processTurnAction({
        sessionId: bootstrapId,
        systemInstructions: activePrompt?.instructions
      });

      const sessionData = await createSessionAction({
        candidateName,
        initialState: output.newState,
        promptVersion: activePrompt?.version || '1.0.0',
      });

      setSessionId(sessionData.id);
      stateRef.current = output.newState;
      setIsStarted(true);
      setMessages([{ role: 'ai', text: output.aiResponse }]);
      
      if (output.audioResponse) {
        setTimeout(() => playAudio(output.audioResponse!), 500);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => handleSend(undefined, reader.result as string);
      };
      recorder.start();
      setIsRecording(true);
    } catch (e) { console.error(e); }
  };

  const handleSend = async (e?: React.FormEvent, audioUri?: string) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !audioUri) || isLoading || isComplete || !db) return;

    const userText = input;
    setInput('');
    
    // Optimistic UI update for text
    if (userText && !audioUri) {
      setMessages(prev => [...prev, { role: 'candidate', text: userText }]);
    }
    
    setIsLoading(true);

    try {
      const output = await processTurnAction({
        sessionId: sessionId!,
        candidateResponse: userText,
        audioDataUri: audioUri,
        currentState: stateRef.current,
        systemInstructions: activePrompt?.instructions
      });

      // Update state history from AI response
      stateRef.current = output.newState;

      // If it was audio, we add the transcribed message now
      if (audioUri && output.transcription) {
        setMessages(prev => [...prev, { role: 'candidate', text: output.transcription!, audioDataUri: audioUri }]);
      }

      setMessages(prev => [...prev, { role: 'ai', text: output.aiResponse }]);
      
      await appendTurnsToSessionAction({
        sessionId: sessionId!,
        state: output.newState,
        isInterviewComplete: output.isInterviewComplete,
        candidateTurn: output.candidateTurn,
        aiTurn: output.aiTurn,
      });

      if (output.audioResponse) {
        playAudio(output.audioResponse);
      }

      if (output.isInterviewComplete) setIsComplete(true);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsLoading(false); 
      setIsRecording(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl border-2">
          <h2 className="text-3xl font-headline font-bold text-center mb-8">AI Voice Interview</h2>
          <form onSubmit={handleStart} className="space-y-4">
            <Input placeholder="Full Name" value={candidateName} onChange={e => setCandidateName(e.target.value)} required className="h-12" />
            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Start Interview'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <audio ref={audioPlayerRef} hidden />
      <header className="border-b bg-white p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h1 className="font-bold text-primary">{candidateName}</h1>
        </div>
        <Link href="/"><Button variant="ghost" size="sm">Exit Session</Button></Link>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex items-end gap-2", m.role === 'candidate' ? "flex-row-reverse" : "flex-row")}>
              <Avatar className="w-8 h-8 border">
                <AvatarFallback className={m.role === 'ai' ? "bg-primary text-white" : "bg-accent text-white"}>
                  {m.role === 'ai' ? 'AI' : 'C'}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "p-4 rounded-2xl shadow-sm max-w-[80%]", 
                m.role === 'candidate' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border rounded-tl-none"
              )}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                {m.audioDataUri && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-7 gap-1 text-[10px] bg-white/10 hover:bg-white/20"
                    onClick={() => playAudio(m.audioDataUri!)}
                  >
                    <Volume2 className="w-3 h-3" /> Play Recording
                  </Button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start items-center gap-2 text-muted-foreground italic text-xs">
              <Loader2 className="animate-spin w-3 h-3" /> Agent is thinking...
            </div>
          )}
          {isComplete && (
            <Card className="p-6 text-center space-y-4 border-2 border-green-200 bg-green-50">
              <h3 className="text-xl font-bold text-green-800">Interview Complete</h3>
              <p className="text-sm text-green-700">Thank you for your time. Your responses have been saved for review.</p>
              <Link href="/"><Button variant="outline">Return Home</Button></Link>
            </Card>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t shadow-lg">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex gap-2">
            {!isRecording ? (
              <Button onClick={startRecording} className="flex-1 h-14 text-lg shadow-md" disabled={isLoading || isComplete}>
                <Mic className="mr-2 w-5 h-5" /> Tap to Speak
              </Button>
            ) : (
              <Button onClick={() => mediaRecorderRef.current?.stop()} className="flex-1 h-14 text-lg bg-red-500 hover:bg-red-600 animate-pulse shadow-md">
                <Square className="mr-2 w-5 h-5" /> Stop & Send
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Or type a message..." 
              disabled={isLoading || isComplete} 
              className="h-12 rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button 
              onClick={() => handleSend()} 
              disabled={!input.trim() || isLoading || isComplete}
              className="h-12 w-12 rounded-xl"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
