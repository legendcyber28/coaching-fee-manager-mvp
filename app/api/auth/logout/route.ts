import {NextResponse} from 'next/server';import {sameOrigin,sessionCookie,stateCookie} from '@/lib/google';
export async function POST(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});const r=NextResponse.json({ok:true});r.cookies.delete(sessionCookie);r.cookies.delete(stateCookie);return r}
