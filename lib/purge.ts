import {db,schema,adminEmail} from './db';
import {clientId,token,tokenClient,unseal} from './google';

const holdMs=48*60*60*1000;
type Result={ok:boolean;error?:string;deleted?:boolean};
/** Deletes one held customer; an unverified Google deletion never counts as success. */
export async function purgeCustomer(sub:string,opts:{force?:boolean;actor?:string;confirmEmail?:string}={}):Promise<Result>{
 await schema();const sql=db();
 try{const row=await sql.begin(async tx=>{
  const [row]=await tx`SELECT sub,email,deleted_at,sheet_id,refresh_cipher,purge_started_at,sheet_deleted_at,sheet_delete_attempted_at,sheet_delete_accepted_at FROM tenants WHERE sub=${sub} FOR UPDATE`;
  if(!row?.deleted_at)throw Error('Customer is not in Deleted accounts');
  if(String(row.email).toLowerCase()===adminEmail||(await tx`SELECT sub FROM admin_owner WHERE singleton=true AND sub=${sub}`).length)throw Error('Owner account cannot be deleted');
  if(!opts.force&&new Date(row.deleted_at).getTime()+holdMs>Date.now())throw Error('48-hour hold has not ended');
  if(opts.force&&opts.confirmEmail?.toLowerCase()!==String(row.email).toLowerCase())throw Error('Customer email does not match');
  if(row.purge_started_at&&new Date(row.purge_started_at).getTime()>Date.now()-15*60*1000)throw Error('Purge is already in progress');
  if(!row.sheet_deleted_at&&(!row.sheet_id||!row.refresh_cipher))throw Error('Google Sheet reference or authorization missing; account retained for review');
  await tx`UPDATE tenants SET purge_started_at=now(),purge_error=NULL WHERE sub=${sub}`;return row;});
  if(!row.sheet_deleted_at){const creds=unseal<{refresh:string}>(row.refresh_cipher);
  if(!creds?.refresh)throw Error('Stored Google authorization unavailable; account retained for review');
  const access=await token(new URLSearchParams({client_id:clientId(),client_secret:tokenClient(),grant_type:'refresh_token',refresh_token:creds.refresh}));
  const headers={Authorization:`Bearer ${access.access_token}`};
  const query=new URLSearchParams({q:"name = 'Coaching Fee Manager Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",fields:'nextPageToken,files(id,name)',pageSize:'100'});
  async function listedIds(){const ids=new Set<string>();let pageToken:string|undefined;do{const url='https://www.googleapis.com/drive/v3/files?'+query+(pageToken?'&pageToken='+encodeURIComponent(pageToken):'');const response=await fetch(url,{headers,cache:'no-store'});if(!response.ok)throw Error('Cannot inspect app-created Sheets (HTTP '+response.status+')');const result=await response.json();for(const file of result.files||[])if(file.id)ids.add(file.id);pageToken=result.nextPageToken}while(pageToken);return ids}
  const knownIds=await listedIds();knownIds.add(row.sheet_id);
  for(const id of knownIds){const url='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id);
   const before=await fetch(url+'?fields=id,trashed',{headers,cache:'no-store'});
   if(before.status===404){if(id===row.sheet_id&&!row.sheet_delete_attempted_at)throw Error('Sheet absent before deletion attempt; cannot verify this app removed it');continue}
   if(!before.ok)throw Error('Could not check Google Sheet (HTTP '+before.status+')');
   await sql`UPDATE tenants SET sheet_delete_attempted_at=now() WHERE sub=${sub} AND deleted_at IS NOT NULL`;
   const del=await fetch(url,{method:'DELETE',headers,cache:'no-store'});
   if(!del.ok)throw Error('Google Sheet removal failed (HTTP '+del.status+'); account retained for review');
   await sql`UPDATE tenants SET sheet_delete_accepted_at=now() WHERE sub=${sub} AND deleted_at IS NOT NULL`;
   const verify=await fetch(url+'?fields=id,trashed',{headers,cache:'no-store'});
   if(verify.status!==404)throw Error('Google Sheet removal could not be verified (HTTP '+verify.status+'); account retained for retry');
  }
  if((await listedIds()).size)throw Error('At least one app-created Sheet remains; account retained for retry');
  await sql`UPDATE tenants SET sheet_deleted_at=now() WHERE sub=${sub} AND deleted_at IS NOT NULL`;}
  await sql.begin(async tx=>{await tx`DELETE FROM subscriptions WHERE tenant_sub=${sub}`;await tx`DELETE FROM tenants WHERE sub=${sub} AND deleted_at IS NOT NULL AND purge_started_at IS NOT NULL`;await tx`INSERT INTO admin_audit(actor_sub,target_sub,action) VALUES(${opts.actor||'system'},${sub},'permanent_deletion_verified')`});return {ok:true,deleted:true};
 }catch(e){const error=e instanceof Error?e.message:'Permanent deletion failed';
  await sql`UPDATE tenants SET purge_error=${error.slice(0,250)},purge_started_at=NULL WHERE sub=${sub} AND deleted_at IS NOT NULL AND purge_started_at IS NOT NULL`.catch(()=>{});
  return {ok:false,error};
 }
}
export async function purgeExpired(limit=8){await schema();const sql=db();const due=await sql`SELECT sub FROM tenants WHERE deleted_at IS NOT NULL AND deleted_at<=now()-interval '48 hours' ORDER BY deleted_at LIMIT ${limit}`;let deleted=0,failed=0;for(const row of due){const result=await purgeCustomer(row.sub);if(result.ok)deleted++;else failed++}return {checked:due.length,deleted,failed}}
