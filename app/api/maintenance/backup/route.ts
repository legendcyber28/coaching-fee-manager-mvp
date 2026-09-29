import {NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {retryBackups} from '@/lib/backup-maintenance';
export const dynamic='force-dynamic';
export async function POST(request:Request){const secret=process.env.PURGE_JOB_SECRET||'';const supplied=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';const x=Buffer.from(secret),y=Buffer.from(supplied);if(!secret||x.length!==y.length||!timingSafeEqual(x,y))return NextResponse.json({error:'Unauthorized'},{status:401});try{return NextResponse.json(await retryBackups(5))}catch{return NextResponse.json({error:'Backup retry unavailable'},{status:503})}}
