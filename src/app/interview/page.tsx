
'use client';

import { useState, useEffect, useRef } from 'react';
import { startInterviewAction, submitResponseAction } from '@/app/actions/interview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send, CheckCircle2, User, Mic, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Message {
  role: 'ai' | 'candidate';
  text: string;
}

export default function InterviewPage() {
  const [candidateName, setCandidateName] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastAudioUri, setLastAudioUri] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const playAiAudio = (uri: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = uri;
      audioPlayerRef.current.play();
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) return;
    setIsLoading(true);
    try {
      const session = await startInterviewAction(candidateName);
      setSessionId(session.id);
      setIsStarted(true);
      
      const history = session.state.conversationHistory.map((h: any) => ({
        role: h.speaker as 'ai' | 'candidate',
        text: h.text
      }));
      setMessages(history);

      if (session.initialAudio) {
        setLastAudioUri(session.initialAudio);
        setTimeout(() => playAiAudio(session.initialAudio!), 500);
      }
    } catch (error) {
      console.error("Failed to start interview:", error);
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

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          handleSend(undefined, base64Audio);
        };
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, audioUri?: string) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !audioUri) || isLoading || isComplete) return;

    const userMsg = input;
    setInput('');
    if (userMsg) {
      setMessages(prev => [...prev, { role: 'candidate', text: userMsg }]);
    }
    setIsLoading(true);

    try {
      const output = await submitResponseAction(sessionId!, userMsg || undefined, audioUri);
      
      // If we used audio, the output includes transcription
      if (audioUri && output.transcription) {
        setMessages(prev => [...prev, { role: 'candidate', text: output.transcription! }]);
      }

      setMessages(prev => [...prev, { role: 'ai', text: output.aiResponse }]);
      
      if (output.audioResponse) {
        setLastAudioUri(output.audioResponse);
        playAiAudio(output.audioResponse);
      }

      if (output.isInterviewComplete) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error("Error submitting response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl border-2">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-headline font-bold mb-2">Voice Interview</h2>
            <p className="text-muted-foreground">Ready for your real-time audio assessment? Enter your name to begin.</p>
          </div>
          <form onSubmit={handleStart} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input 
                placeholder="John Doe" 
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                required
                className="h-12 text-lg"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Start Interview'}
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="font-headline font-semibold text-lg">{candidateName}</h1>
            <p className="text-xs text-muted-foreground flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Audio Session Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastAudioUri && (
            <Button variant="outline" size="sm" onClick={() => playAiAudio(lastAudioUri)}>
              <Volume2 className="w-4 h-4 mr-1" /> Replay Agent
            </Button>
          )}
          <Link href="/">
            <Button variant="ghost" size="sm">Exit</Button>
          </Link>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={cn(
              "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
              m.role === 'candidate' ? "justify-end" : "justify-start"
            )}>
              <div className={cn(
                "flex max-w-[85%] gap-3",
                m.role === 'candidate' ? "flex-row-reverse" : "flex-row"
              )}>
                <Avatar className="w-8 h-8 mt-1 shrink-0">
                  <AvatarFallback className={m.role === 'ai' ? "bg-primary text-white" : "bg-accent text-white"}>
                    {m.role === 'ai' ? 'AI' : 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "p-4 rounded-2xl shadow-sm",
                  m.role === 'candidate' 
                    ? "bg-accent text-white rounded-tr-none" 
                    : "bg-white border rounded-tl-none text-foreground"
                )}>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
               <div className="flex max-w-[85%] gap-3">
                <Avatar className="w-8 h-8 mt-1 shrink-0">
                  <AvatarFallback className="bg-primary text-white">AI</AvatarFallback>
                </Avatar>
                <div className="bg-white border p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          {isComplete && (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-headline font-bold">Interview Completed</h2>
              <p className="text-muted-foreground text-center">Your audio performance has been transcribed and stored for review.</p>
              <Link href="/">
                <Button variant="outline" size="lg">Return Home</Button>
              </Link>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-white">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                disabled={isLoading || isComplete}
                className="flex-1 h-16 text-lg bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Mic className="w-6 h-6" /> Tap to Speak
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                className="flex-1 h-16 text-lg bg-red-600 hover:bg-red-700 animate-pulse flex items-center justify-center gap-2"
              >
                <Square className="w-6 h-6 fill-white" /> Stop & Send
              </Button>
            )}
          </div>

          <div className="relative flex items-center space-x-2">
            <Input 
              placeholder={isComplete ? "Interview closed" : "Or type your response here..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isComplete || isRecording}
              className="flex-1 h-12 pr-12 text-base rounded-xl"
            />
            <Button 
              onClick={() => handleSend()}
              size="icon" 
              disabled={!input.trim() || isLoading || isComplete || isRecording}
              className="h-10 w-10 absolute right-1 rounded-lg"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
            Real-time Audio Prototyping • Gemini 2.5 Flash
          </p>
        </div>
      </div>
    </div>
  );
}
