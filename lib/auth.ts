import {cookies} from 'next/headers';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {db} from './db';
export const cookieName='fee_admin';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw Error('SESSION_SECRET must be at least 32 characters');return s}
export function sign(id:string){const expiration=Date.now()+8*60*60*1000;const data=`${id}.${expiration}`;const mac=createHmac('sha256',secret()).update(data).digest('hex');return `${data}.${mac}`}
export async function admin(){let token=(await cookies()).get(cookieName)?.value;if(!token)return null;const [id,expiry,mac]=token.split('.');if(!id||!expiry||!mac||Number(expiry)<Date.now())return null;const expected=createHmac('sha256',secret()).update(`${id}.${expiry}`).digest('hex');if(mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;return db.admin.findUnique({where:{id},select:{id:true,email:true}})}
