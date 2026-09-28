import {NextResponse} from 'next/server';import {cookieName} from '@/lib/auth';export async function POST(){const r=NextResponse.json({ok:true});r.cookies.delete(cookieName);return r}
