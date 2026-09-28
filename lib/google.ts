import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';

export const sessionCookie='fee_google_session', stateCookie='fee_oauth_state';
const scope='openid email profile https://www.googleapis.com/auth/drive.file';
function key(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('SESSION_SECRET must be at least 32 characters');return createHash('sha256').update(s).digest()}
export function seal(data:object){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);const body=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url')}
export function unseal<T>(value:string):T|null{try{const b=Buffer.from(value,'base64url');if(b.length<29)return null;const decipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString()) as T}catch{return null}}
export type Session={email:string;sub:string;name:string;picture?:string;access:string;refresh:string;expires:number;until:number};
export function cookieOptions(maxAge:number){return {httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge}}
export function origin(){const u=process.env.APP_URL;if(!u)throw Error('APP_URL is required');return new URL(u).origin}
export function clientId(){if(!process.env.GOOGLE_CLIENT_ID)throw Error('GOOGLE_CLIENT_ID is required');return process.env.GOOGLE_CLIENT_ID}
export function redirectUri(){return `${origin()}/api/auth/callback`}
export function authUrl(challenge:string,state:string){const q=new URLSearchParams({client_id:clientId(),redirect_uri:redirectUri(),response_type:'code',scope,access_type:'offline',prompt:'consent',code_challenge:challenge,code_challenge_method:'S256',state});return `https://accounts.google.com/o/oauth2/v2/auth?${q}`}
export async function token(form:URLSearchParams){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString(),cache:'no-store'});if(!r.ok)throw Error('Google authorization failed');return r.json() as Promise<{access_token:string;refresh_token?:string;expires_in:number;id_token?:string}>}
export function tokenClient(){return process.env.GOOGLE_CLIENT_SECRET||''}
export async function session(){const raw=(await cookies()).get(sessionCookie)?.value;const s=raw?unseal<Session>(raw):null;if(!s||s.until<Date.now()||!s.refresh||!s.sub)return null;return s}
export async function googleAccess(){const s=await session();if(!s)return null;if(s.expires>Date.now()+60000)return {session:s,access:s.access};try{const t=await token(new URLSearchParams({client_id:clientId(),client_secret:tokenClient(),grant_type:'refresh_token',refresh_token:s.refresh}));const renewed={...s,access:t.access_token,expires:Date.now()+t.expires_in*1000};return {session:renewed,access:t.access_token,renewed:true}}catch{return null}}
export function withSession<T extends NextResponse>(response:T,a:{session:Session;renewed?:boolean}){if(a.renewed)response.cookies.set(sessionCookie,seal(a.session),cookieOptions(Math.max(1,Math.floor((a.session.until-Date.now())/1000))));return response}
export function sameOrigin(request:Request){const header=request.headers.get('origin');return header===origin()}
export function constantEquals(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
