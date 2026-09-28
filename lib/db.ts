import postgres from 'postgres';
let client:ReturnType<typeof postgres>|undefined;
export function db(){if(!process.env.DATABASE_URL)throw Error('Central database not configured');return client??=postgres(process.env.DATABASE_URL,{ssl:'require',max:8,prepare:false});}
let ready:Promise<void>|undefined;
export async function schema(){return ready??=(async()=>{const sql=db();await sql`CREATE TABLE IF NOT EXISTS tenants (
 sub text PRIMARY KEY, email text NOT NULL, name text NOT NULL, data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), paid_through date,
 suspended boolean NOT NULL DEFAULT false, deleted_at timestamptz,
 sheet_id text, refresh_cipher text, mirror_error text, last_mirror_at timestamptz,
 consent_until timestamptz
)`;await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS refresh_cipher text`;await sql`CREATE TABLE IF NOT EXISTS admin_owner (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), sub text UNIQUE NOT NULL)`;await sql`CREATE TABLE IF NOT EXISTS admin_audit (id bigserial PRIMARY KEY, actor_sub text NOT NULL, target_sub text, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;await sql`CREATE TABLE IF NOT EXISTS subscriptions (id bigserial PRIMARY KEY, tenant_sub text NOT NULL REFERENCES tenants(sub), amount_paise integer NOT NULL CHECK(amount_paise>0), paid_on date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date, note text NOT NULL, recorded_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;})();}
export const adminEmail='devspace786.work@gmail.com';
export async function isOwner(sub:string,email:string){await schema();const sql=db();if(email.toLowerCase()===adminEmail){await sql`INSERT INTO admin_owner(singleton,sub) VALUES(true,${sub}) ON CONFLICT(singleton) DO NOTHING`;}const [row]=await sql`SELECT sub FROM admin_owner WHERE singleton=true`;return row?.sub===sub}
