import {db,schema,isOwner} from './db';
import {GOOGLE_ISSUER,type StoreEvent} from './store-contract';
import {billing,dayInIndia,sqlDate} from './billing';
import type {Session} from './google';
type SQL=ReturnType<typeof db>;
let ready:Promise<void>|undefined;
export async function entitlementSchema(){return ready??=(async()=>{await schema();const sql=db();await sql`CREATE TABLE IF NOT EXISTS store_entitlement_events(event_id text PRIMARY KEY,payload_hash text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`;await sql`CREATE TABLE IF NOT EXISTS store_entitlement_orders(order_id text PRIMARY KEY,google_issuer text NOT NULL,google_sub text NOT NULL,starts_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,revoked boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`;await sql`CREATE INDEX IF NOT EXISTS store_entitlement_identity ON store_entitlement_orders(google_issuer,google_sub)`})().catch(e=>{ready=undefined;throw e})}
export async function applyStoreEvent(event:StoreEvent,hash:string){await entitlementSchema();const sql=db();return sql.begin(async tx=>{
 await tx`SELECT pg_advisory_xact_lock(hashtextextended(${'entitlement:'+event.googleIssuer+':'+event.googleSub},0))`;
 await tx`SELECT pg_advisory_xact_lock(hashtextextended(${'store-event:'+event.eventId},0))`;
 await tx`SELECT pg_advisory_xact_lock(hashtextextended(${'store-order:'+event.orderId},0))`;
 const [prior]=await tx`SELECT payload_hash FROM store_entitlement_events WHERE event_id=${event.eventId}`;
 if(prior)return prior.payload_hash===hash?'ALREADY_APPLIED' as const:'REJECTED' as const;
 const [order]=await tx`SELECT * FROM store_entitlement_orders WHERE order_id=${event.orderId} FOR UPDATE`;
 if(order&&(order.google_issuer!==event.googleIssuer||order.google_sub!==event.googleSub||new Date(order.starts_at).getTime()!==Date.parse(event.startsAt)||new Date(order.expires_at).getTime()!==Date.parse(event.expiresAt)||order.revoked&&event.action==='GRANT'))return 'REJECTED' as const;
 if(!order)await tx`INSERT INTO store_entitlement_orders(order_id,google_issuer,google_sub,starts_at,expires_at,revoked) VALUES(${event.orderId},${event.googleIssuer},${event.googleSub},${event.startsAt},${event.expiresAt},${event.action==='REVOKE'})`;
 else if(event.action==='REVOKE')await tx`UPDATE store_entitlement_orders SET revoked=true,updated_at=now() WHERE order_id=${event.orderId}`;
 await tx`INSERT INTO store_entitlement_events(event_id,payload_hash,payload) VALUES(${event.eventId},${hash},${tx.json(event)})`;
 return 'APPLIED' as const;
 })}
export class EntitlementRequired extends Error{status=402;constructor(){super('Your Fee Manager access is inactive. Renew your plan or contact support. Your data is kept.')}}
export async function identityEntitlement(sub:string,issuer=GOOGLE_ISSUER,sql:SQL=db()){
 const rows=await sql`SELECT starts_at,expires_at,revoked FROM store_entitlement_orders WHERE google_issuer=${issuer} AND google_sub=${sub}`;
 if(!rows.length){
 const [tenant]=await sql`SELECT connector_signup,created_at,paid_through,suspended,deleted_at,trial_extension_days FROM tenants WHERE sub=${sub}`;
 if(tenant?.suspended||tenant?.deleted_at)return {managed:false,active:false,source:'BLOCKED',startsAt:null,expiresAt:null};
 const mode=process.env.NEW_SIGNUP_ACCESS_MODE||'LEGACY';
 if(tenant&&!tenant.connector_signup||mode==='LEGACY')return {managed:false,active:true,source:'LEGACY',startsAt:null,expiresAt:null};
 if(tenant?.paid_through&&sqlDate(tenant.paid_through)!>=dayInIndia(new Date()))return {managed:true,active:true,source:'LEGACY_PAID',startsAt:null,expiresAt:sqlDate(tenant.paid_through)};
 if(mode==='TRIAL'){const start=tenant?new Date(tenant.created_at).getTime():null;const end=start===null?null:start+3*86400000;return {managed:true,active:end===null||Date.now()<end,source:'TRIAL',startsAt:start===null?null:new Date(start).toISOString(),expiresAt:end===null?null:new Date(end).toISOString()}}
 return {managed:true,active:false,source:'STORE_REQUIRED',startsAt:null,expiresAt:null};
 }
 const [current]=await sql`SELECT starts_at,expires_at FROM store_entitlement_orders WHERE google_issuer=${issuer} AND google_sub=${sub} AND revoked=false AND starts_at<=now() AND expires_at>now() ORDER BY expires_at DESC LIMIT 1`;
 const [legacy]=await sql`SELECT paid_through,suspended,deleted_at FROM tenants WHERE sub=${sub}`;
 if(legacy?.suspended||legacy?.deleted_at)return {managed:true,active:false,source:'BLOCKED',startsAt:null,expiresAt:null};
 if(current)return {managed:true,active:true,source:'STORE',startsAt:new Date(current.starts_at).toISOString(),expiresAt:new Date(current.expires_at).toISOString()};
 // Existing manually verified calendar-date access is independent of Store orders.
 const [paid]=await sql`SELECT paid_through FROM tenants WHERE sub=${sub} AND paid_through >= (now() AT TIME ZONE 'Asia/Kolkata')::date`;
 return {managed:true,active:!!paid,source:paid?'LEGACY_PAID':'STORE_INACTIVE',startsAt:null,expiresAt:paid?.paid_through?String(paid.paid_through):null};
}
export async function entitlementStatus(s:Session){await entitlementSchema();if(s.issuer&&s.issuer!==GOOGLE_ISSUER)throw new EntitlementRequired();if(await isOwner(s.sub,s.email))return {managed:false,active:true,source:'OWNER',startsAt:null,expiresAt:null};return identityEntitlement(s.sub)}
export async function requireEntitlement(s:Session){const status=await entitlementStatus(s);if(!status.active)throw new EntitlementRequired();return status}
export async function requireEntitlementInTransaction(s:Session,tx:any,owner:boolean){if(owner)return;await tx`SELECT pg_advisory_xact_lock(hashtextextended(${'entitlement:'+GOOGLE_ISSUER+':'+s.sub},0))`;const status=await identityEntitlement(s.sub,GOOGLE_ISSUER,tx);if(!status.active)throw new EntitlementRequired()}
