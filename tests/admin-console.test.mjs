import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const db=source('lib/db.ts'),admin=source('app/api/admin/route.ts'),extras=source('app/api/admin-extras/route.ts'),portal=source('app/api/customer-portal/route.ts'),ui=source('app/page.tsx');
test('new plan catalog is dormant with nullable prices and legacy tenants unassigned',()=>{
 assert.match(db,/CREATE TABLE IF NOT EXISTS product_plans/);
 assert.match(db,/setup_fee_paise integer CHECK/);
 assert.match(db,/monthly_fee_paise integer CHECK/);
 assert.match(db,/yearly_fee_paise integer CHECK/);
 assert.match(db,/student_limit integer CHECK/);
 assert.match(db,/features jsonb/);
 assert.match(db,/active boolean NOT NULL DEFAULT false/);
 assert.match(db,/ADD COLUMN IF NOT EXISTS plan_id bigint/);
 assert.doesNotMatch(db,/UPDATE tenants SET plan_id=/);
 assert.doesNotMatch(extras,/action==='plan-change'/);
});
test('owner API selects customer metadata and counts, never student records',()=>{
 assert.match(admin,/jsonb_array_length\(CASE WHEN jsonb_typeof\(data->'students'\)='array' THEN data->'students' ELSE '\[\]'::jsonb END\) AS student_count/);
 assert.doesNotMatch(admin,/SELECT\s+\*/);
 assert.match(extras,/if\(!a\|\|!await isOwner/);
 assert.match(ui,/Student names and records are not visible here/);
});
test('customer portal rejects owner, limits submitted text, and serves active in-app announcements only',()=>{
 assert.match(portal,/if\(await isOwner\(a.session.sub,a.session.email\)\)return null/);
 assert.match(portal,/WHERE active=true ORDER BY created_at DESC LIMIT 1/);
 assert.match(portal,/subject.length>100/);
 assert.match(portal,/body.length>3000/);
 assert.match(portal,/sameOrigin\(request\)/);
});
test('India purchase uses owner supplied QR and keeps payment pending until independent review',()=>{
 const plans=source('lib/plans.ts'),proof=source('app/api/payment-proof/route.ts');
 assert.match(plans,/monthlyFeePaise:29900/);
 assert.match(plans,/monthlyFeePaise:69900/);
 assert.match(plans,/monthlyFeePaise:119900/);
 assert.match(proof,/status:'Pending'/);
 assert.match(proof,/UNIQUE|23505/);
 assert.match(ui,/7020638425@kotakbank/);
 assert.match(ui,/Choose plan/);
});
test('owner plan management has no purchase cards and only the owner can edit catalog',()=>{
 assert.match(extras,/if\(!a\|\|!await isOwner/);
 assert.match(extras,/action==='plan-edit'/);
 assert.match(extras,/UPDATE product_plans SET setup_fee_paise/);
 assert.match(ui,/adminPage==='Plans manage'/);
 assert.match(ui,/Customer plans/);
 assert.match(ui,/Payment verification queue/);
 assert.match(ui,/No proof submitted/);
});
test('owner notes are private, editable and seeded for future international work',()=>{
 assert.match(db,/CREATE TABLE IF NOT EXISTS owner_notes/);
 assert.match(db,/Build international version later/);
 assert.match(extras,/action==='note-save'/);
 assert.match(extras,/action==='note-done'/);
 assert.match(ui,/adminPage==='Notes \/ Future actions'/);
});
test('UPI proof is pending until owner reviews and receipt is tenant-private',()=>{
 const proof=source('app/api/payment-proof/route.ts'),receipt=source('app/api/payment-receipt/[id]/route.ts');
 assert.match(proof,/if\(await isOwner/);
 assert.match(proof,/status:'Pending'/);
 assert.match(proof,/A payment review is already pending/);
 assert.match(extras,/action==='payment-review'/);
 assert.match(extras,/bankUtr/);
 assert.match(extras,/FOR UPDATE/);
 assert.match(extras,/UPDATE tenants SET plan_id=/);
 assert.match(extras,/receipt_number=/);
 assert.match(receipt,/row\.tenant_sub!==a\.session\.sub/);
 assert.match(receipt,/application\/pdf/);
});
