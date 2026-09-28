import {admin} from '@/lib/auth';import {NextResponse} from 'next/server';export async function GET(){const a=await admin();return NextResponse.json(a||{error:'Not signed in'},{status:a?200:401})}
