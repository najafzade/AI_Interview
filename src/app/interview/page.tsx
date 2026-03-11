
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { processTurnAction } from '@/app/actions/interview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, CheckCircle2, User, Mic, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { doc, setDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  role: 'ai' | 'candidate';
  text: string;
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
  const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
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
      if (!snap.empty) setActivePrompt(snap.docs[0].data());
    }
    loadConfig();
  }, [db]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playAiAudio = (uri: string) => {
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
      const id = uuidv4();
      const output = await processTurnAction({
        sessionId: id,
        systemInstructions: activePrompt?.instructions
      });

      const sessionData = {
        id,
        candidateName,
        skill: output.newState.skill,
        status: 'IN_PROGRESS',
        state: output.newState,
        promptVersion: activePrompt?.version || '1.0.0',
        createdAt: new Date().toISOString()
      };

      setDoc(doc(db, 'sessions', id), sessionData);
      
      setSessionId(id);
      stateRef.current = output.newState;
      setIsStarted(true);
      setMessages([{ role: 'ai', text: output.aiResponse }]);
      
      if (output.audioResponse) {
        setLastAudioUri(output.audioResponse);
        setTimeout(() => playAiAudio(output.audioResponse!), 500);
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
    if (userText) setMessages(prev => [...prev, { role: 'candidate', text: userText }]);
    setIsLoading(true);

    try {
      const output = await processTurnAction({
        sessionId: sessionId!,
        candidateResponse: userText,
        audioDataUri: audioUri,
        currentState: stateRef.current,
        systemInstructions: activePrompt?.instructions
      });

      if (audioUri && output.transcription) {
        setMessages(prev => [...prev, { role: 'candidate', text: output.transcription! }]);
      }

      setMessages(prev => [...prev, { role: 'ai', text: output.aiResponse }]);
      stateRef.current = output.newState;
      
      const updateData = {
        state: output.newState,
        status: output.isInterviewComplete ? 'COMPLETED' : 'IN_PROGRESS'
      };
      setDoc(doc(db, 'sessions', sessionId!), updateData, { merge: true });

      if (output.audioResponse) {
        setLastAudioUri(output.audioResponse);
        playAiAudio(output.audioResponse);
      }

      if (output.isInterviewComplete) setIsComplete(true);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl border-2">
          <h2 className="text-3xl font-headline font-bold text-center mb-8">AI Voice Interview</h2>
          <form onSubmit={handleStart} className="space-y-4">
            <Input placeholder="Full Name" value={candidateName} onChange={e => setCandidateName(e.target.value)} required h-12 />
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
      <header className="border-b bg-white p-4 flex justify-between items-center">
        <h1 className="font-bold">{candidateName}</h1>
        <Link href="/"><Button variant="ghost">Exit</Button></Link>
      </header>

      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === 'candidate' ? "justify-end" : "justify-start")}>
              <div className={cn("p-4 rounded-xl max-w-[80%]", m.role === 'candidate' ? "bg-primary text-white" : "bg-white border")}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && <Loader2 className="animate-spin mx-auto" />}
          {isComplete && <div className="text-center font-bold p-8">Interview Complete!</div>}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t">
        <div className="max-w-2xl mx-auto space-y-2">
          {!isRecording ? (
            <Button onClick={startRecording} className="w-full h-16" disabled={isLoading || isComplete}>
              <Mic className="mr-2" /> Speak
            </Button>
          ) : (
            <Button onClick={() => mediaRecorderRef.current?.stop()} className="w-full h-16 bg-red-500 animate-pulse">
              <Square className="mr-2" /> Stop
            </Button>
          )}
          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type response..." disabled={isLoading || isComplete} />
            <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading || isComplete}><Send /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
