import {admin} from './auth';
import {NextResponse} from 'next/server';
export const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
export async function guard(){return await admin()}
export function safeError(e:unknown){const m=e instanceof Error?e.message:'Unexpected error';if(m.includes('Unique constraint'))return fail('This record already exists',409);if(m.includes('Foreign key'))return fail('Linked record cannot be deleted',409);return fail(m,400)}
