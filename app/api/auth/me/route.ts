import {purgeExpired} from '@/lib/purge';
import {NextResponse} from 'next/server';
import {googleAccess,withSession} from '@/lib/google';
import {db,schema,isOwner} from '@/lib/db';
let nextSweep=0;
export async function GET(){
 const a=await googleAccess();
 if(a&&Date.now()>=nextSweep){nextSweep=Date.now()+5*60*1000;await purgeExpired(2).catch(()=>{});}
 if(!a)return NextResponse.json({error:'Not signed in'},{status:401});
 await schema();const sql=db();
 if(!await isOwner(a.session.sub,a.session.email)){const [tenant]=await sql`SELECT deleted_at,suspended FROM tenants WHERE sub=${a.session.sub}`;if(tenant?.deleted_at)return NextResponse.json({error:'This account is in Deleted accounts. Ask the app owner about restoration.'},{status:403});if(tenant?.suspended)return NextResponse.json({error:'This account is suspended.'},{status:403});}
 return withSession(NextResponse.json({email:a.session.email,sub:a.session.sub,name:a.session.name,picture:a.session.picture||''}),a);
}
