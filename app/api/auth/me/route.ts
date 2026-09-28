import {NextResponse} from 'next/server';import {googleAccess,withSession} from '@/lib/google';
export async function GET(){const a=await googleAccess();if(!a)return NextResponse.json({error:'Not signed in'},{status:401});return withSession(NextResponse.json({email:a.session.email,name:a.session.name,picture:a.session.picture||''}),a)}
