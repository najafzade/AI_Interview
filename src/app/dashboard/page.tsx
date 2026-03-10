'use client';

import { useState, useEffect } from 'react';
import { getAllSessionsAction } from '@/app/actions/interview';
import { InterviewSession } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, User, ArrowRight, FilterX } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [filtered, setFiltered] = useState<InterviewSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');

  useEffect(() => {
    async function load() {
      const data = await getAllSessionsAction();
      setSessions(data);
      setFiltered(data);
    }
    load();
  }, []);

  useEffect(() => {
    let result = sessions;
    if (searchTerm) {
      result = result.filter(s => 
        s.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (skillFilter !== 'all') {
      result = result.filter(s => s.skill === skillFilter);
    }
    setFiltered(result);
  }, [searchTerm, skillFilter, sessions]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-headline font-bold text-primary">Evaluator Dashboard</h1>
          <p className="text-muted-foreground">Review and audit technical interview performances.</p>
        </div>
        <Link href="/admin/prompts">
          <Button variant="outline" size="sm">Manage Prompt Versions</Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search candidate name or ID..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Skill" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            <SelectItem value="Problem Solving">Problem Solving</SelectItem>
            <SelectItem value="Communication">Communication</SelectItem>
            <SelectItem value="Collaboration & Teamwork">Collaboration & Teamwork</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="ghost" 
          onClick={() => { setSearchTerm(''); setSkillFilter('all'); }}
          className="justify-start text-muted-foreground"
        >
          <FilterX className="mr-2 w-4 h-4" /> Clear Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-24 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Search className="text-muted-foreground w-8 h-8 opacity-20" />
            </div>
            <p className="text-xl text-muted-foreground">No interview sessions found matching your criteria.</p>
          </div>
        ) : (
          filtered.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow border-2 group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={s.status === 'COMPLETED' ? 'default' : 'secondary'} className="rounded-md">
                    {s.status}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    PROMPT v{s.promptVersion}
                  </span>
                </div>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <User className="w-5 h-5 text-primary/70" /> {s.candidateName}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="w-3.5 h-3.5" /> {format(new Date(s.createdAt), 'MMM dd, yyyy • HH:mm')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted/40 rounded-lg text-sm font-medium border">
                  Skill: <span className="text-primary">{s.skill}</span>
                </div>
                <Link href={`/dashboard/${s.id}`}>
                  <Button className="w-full group-hover:bg-accent group-hover:text-white transition-colors">
                    Review Transcript <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
