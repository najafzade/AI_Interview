
'use client';

import { useState, useMemo } from 'react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, User, ArrowRight, FilterX } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');

  const sessionsQuery = useMemo(() => {
    return query(collection(useFirestore()!, 'sessions'), orderBy('createdAt', 'desc'));
  }, []);

  const { data: sessions = [], loading } = useCollection(sessionsQuery);

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      const matchSearch = s.candidateName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSkill = skillFilter === 'all' || s.skill === skillFilter;
      return matchSearch && matchSkill;
    });
  }, [sessions, searchTerm, skillFilter]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-bold text-primary">Evaluator Dashboard</h1>
          <p className="text-muted-foreground">Audit interview performance and version prompts.</p>
        </div>
        <Link href="/admin/prompts"><Button variant="outline">Manage Prompts</Button></Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 p-4 bg-white rounded-xl border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search candidates..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger><SelectValue placeholder="Skill Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skills</SelectItem>
            <SelectItem value="Problem Solving">Problem Solving</SelectItem>
            <SelectItem value="Communication">Communication</SelectItem>
            <SelectItem value="Collaboration & Teamwork">Collaboration & Teamwork</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={() => { setSearchTerm(''); setSkillFilter('all'); }}><FilterX className="mr-2 w-4 h-4" /> Clear</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? <p>Loading sessions...</p> : filtered.map(s => (
          <Card key={s.id} className="group hover:shadow-lg transition-all border-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge variant={s.status === 'COMPLETED' ? 'default' : 'secondary'}>{s.status}</Badge>
                <span className="text-[10px] font-mono">v{s.promptVersion}</span>
              </div>
              <CardTitle className="flex items-center gap-2 mt-2"><User className="w-4 h-4" /> {s.candidateName}</CardTitle>
              <CardDescription>{format(new Date(s.createdAt), 'PPP p')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-2 rounded mb-4 text-sm">Skill: <b>{s.skill}</b></div>
              <Link href={`/dashboard/${s.id}`}><Button className="w-full">Review <ArrowRight className="ml-2 w-4 h-4" /></Button></Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
