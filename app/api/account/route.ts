import {NextResponse} from 'next/server';
import {googleAccess,sameOrigin,sessionCookie} from '@/lib/google';
import {db,schema,isOwner} from '@/lib/db';
async function scheduleDeletion(sub:string,actor:string){await schema();const sql=db();const result=await sql.begin(async tx=>{
 const [row]=await tx`SELECT sub,deleted_at FROM tenants WHERE sub=${sub} FOR UPDATE`;
 if(!row)return {ok:false,error:'Account not found'};
 if(row.deleted_at)return {ok:true,pending:true,restoreUntil:new Date(new Date(row.deleted_at).getTime()+48*60*60*1000).toISOString()};
 const [pending]=await tx`UPDATE tenants SET deleted_at=now(),suspended=true WHERE sub=${sub} AND deleted_at IS NULL RETURNING deleted_at`;
 if(!pending)return {ok:false,error:'Could not schedule deletion'};
 if(actor!==sub)await tx`INSERT INTO admin_audit(actor_sub,target_sub,action) VALUES(${actor},${sub},'deletion_scheduled')`;
 return {ok:true,pending:true,restoreUntil:new Date(new Date(pending.deleted_at).getTime()+48*60*60*1000).toISOString()};
 });return result;
}
export async function POST(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});const a=await googleAccess();if(!a)return NextResponse.json({error:'Not signed in'},{status:401});let b:{sub?:string;confirm?:string;admin?:boolean};try{b=await request.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}const owner=await isOwner(a.session.sub,a.session.email);if(owner&&!b.admin)return NextResponse.json({error:'Owner account cannot be deleted'},{status:403});const sub=owner?b.sub:a.session.sub;if(!sub||b.confirm!==`DELETE ${sub}`||owner&&sub===a.session.sub)return NextResponse.json({error:'Type the exact account confirmation'},{status:400});if(b.admin&&!owner)return NextResponse.json({error:'Admin access required'},{status:403});if(owner){const sql=db();const [target]=await sql`SELECT email FROM tenants WHERE sub=${sub}`;if(!target)return NextResponse.json({error:'Customer not found'},{status:404});if(await isOwner(sub,target.email))return NextResponse.json({error:'Owner account cannot be deleted'},{status:403})}const result=await scheduleDeletion(sub,a.session.sub);const response=NextResponse.json(result,{status:result.ok?200:409});if(result.ok&&sub===a.session.sub)response.cookies.delete(sessionCookie);return response}
