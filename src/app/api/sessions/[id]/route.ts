import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = DB.sessions.get(id);
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(session);
}
