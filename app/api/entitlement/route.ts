import {NextResponse} from 'next/server';
import {session} from '@/lib/google';
import {entitlementStatus} from '@/lib/entitlements';
export async function GET(){const s=await session();if(!s)return NextResponse.json({error:'Not signed in'},{status:401});try{return NextResponse.json(await entitlementStatus(s),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Could not check access'},{status:503})}}
