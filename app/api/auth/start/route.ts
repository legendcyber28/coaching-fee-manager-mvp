import {NextResponse} from 'next/server';
import {authUrl,cookieOptions,seal} from '@/lib/google';
import {createHash,randomBytes} from 'node:crypto';
export async function GET(){try{const verifier=randomBytes(32).toString('base64url'),nonce=randomBytes(24).toString('base64url');const challenge=createHash('sha256').update(verifier).digest('base64url');const r=NextResponse.redirect(authUrl(challenge,nonce));r.cookies.set('fee_oauth_state',seal({verifier,nonce,until:Date.now()+600000}),cookieOptions(600));return r}catch{return NextResponse.json({error:'Google sign-in is not configured yet'},{status:503})}}
