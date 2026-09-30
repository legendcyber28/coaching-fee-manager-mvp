import {NextResponse} from 'next/server';
import {parseStoreEvent,payloadHash,validSignature} from '@/lib/store-contract';
import {applyStoreEvent} from '@/lib/entitlements';
export const runtime='nodejs';
export async function POST(request:Request){
 if(new URL(request.url).protocol!=='https:'&&!(process.env.CONNECTOR_TEST_MODE==='true'&&new URL(request.url).hostname==='localhost'))return NextResponse.json({error:'TLS required'},{status:400});
 const secret=process.env.STORE_CONNECTOR_SECRET||'';if(secret.length<32)return NextResponse.json({error:'Connector unavailable'},{status:503});
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return NextResponse.json({error:'JSON required'},{status:415});
 const reader=request.body?.getReader();if(!reader)return NextResponse.json({error:'Missing body'},{status:400});let size=0;const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return NextResponse.json({error:'Body too large'},{status:413})}chunks.push(value)}const raw=Buffer.concat(chunks);
 if(!validSignature(raw,request.headers.get('X-DevSpace-Timestamp'),request.headers.get('X-DevSpace-Signature'),secret))return NextResponse.json({error:'Invalid signature or timestamp'},{status:401});
 let event;try{event=parseStoreEvent(new TextDecoder('utf-8',{fatal:true}).decode(raw))}catch{return NextResponse.json({error:'Invalid event or term'},{status:400})}
 try{const outcome=await applyStoreEvent(event,payloadHash(raw));return NextResponse.json({eventId:event.eventId,orderId:event.orderId,googleSub:event.googleSub,outcome,startsAt:event.startsAt,expiresAt:event.expiresAt},{status:outcome==='REJECTED'?409:200})}catch{console.error('Store entitlement transaction failed');return NextResponse.json({error:'Entitlement not committed; retry the same event'},{status:503})}
}
