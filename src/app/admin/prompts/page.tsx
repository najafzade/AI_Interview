'use client';

import { useState, useEffect } from 'react';
import { getPromptConfigsAction, createPromptConfigAction } from '@/app/actions/interview';
import { PromptConfig } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, History, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';

export default function PromptsAdminPage() {
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [newInstructions, setNewInstructions] = useState('');
  const [newVersion, setNewVersion] = useState('1.1.0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const data = await getPromptConfigsAction();
      setConfigs(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    load();
  }, []);

  const handleCreate = async () => {
    if (!newInstructions.trim()) return;
    setIsSubmitting(true);
    try {
      const config = await createPromptConfigAction(newInstructions, newVersion);
      setConfigs(prev => [config, ...prev]);
      setNewInstructions('');
      setNewVersion(v => {
        const parts = v.split('.');
        parts[1] = String(Number(parts[1]) + 1);
        return parts.join('.');
      });
      toast({
        title: "Prompt Updated",
        description: `Version ${config.version} is now active for all new interviews.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 max-w-5xl mx-auto space-y-12">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/dashboard" className="text-primary flex items-center gap-1 text-sm font-bold mb-2 hover:underline">
            <ArrowLeft className="w-3 h-3" /> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-headline font-bold text-primary">Prompt Management</h1>
          <p className="text-muted-foreground">Modify and version the interview agent's instructions.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-primary" /> Update System Instructions
              </CardTitle>
              <CardDescription>
                Changing this will affect the behavior of all future interview sessions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Version Label</Label>
                <Input 
                  value={newVersion} 
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="e.g. 1.2.0"
                />
              </div>
              <div className="space-y-2">
                <Label>Prompt Instructions</Label>
                <Textarea 
                  placeholder="Enter the updated system prompt or evaluation criteria..." 
                  className="min-h-[250px] font-mono text-sm"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreate} 
                className="w-full h-12 text-lg" 
                disabled={isSubmitting}
              >
                Deploy New Version
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <History className="w-5 h-5" /> Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {configs.map(c => (
                  <div key={c.id} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">v{c.version}</span>
                      {c.isActive && (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "{c.instructions}"
                    </p>
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">
                      Deployed {format(new Date(c.createdAt), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
