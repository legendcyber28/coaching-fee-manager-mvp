import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const callback=readFileSync(new URL('../app/api/auth/callback/route.ts',import.meta.url),'utf8');
test('repeat OAuth consent can reuse a previously encrypted refresh credential',()=>{
 assert.match(callback,/SELECT refresh_cipher FROM tenants WHERE sub=\$\{profile\.sub\}/);
 assert.match(callback,/const refresh=t\.refresh_token\|\|previous\?\.refresh/);
 assert.match(callback,/if\(t\.refresh_token\)await sql`UPDATE tenants SET refresh_cipher=/);
 assert.doesNotMatch(callback,/console\.error\([^;]*(access_token|refresh_token|code_verifier)/);
});

const google=readFileSync(new URL('../lib/google.ts',import.meta.url),'utf8');
test('normal OAuth does not force consent and recovery is bounded',()=>{assert.doesNotMatch(google,/prompt:'consent'/);assert.match(google,/if\(forceConsent\)q.set\('prompt','consent'\)/);assert.match(callback,/if\(!s.forceConsent\)/);assert.match(callback,/api\/auth\/start\?consent=1/);assert.match(callback,/drive_scope_required/);assert.match(callback,/constantEquals\(state,s.nonce\)/)});
test('remembered device session has a fixed30day maximum, old cookies never gain a new lifetime',async()=>{const {newSessionTimes,renewSessionTimes,sessionIdleSeconds,sessionAbsoluteSeconds}=await import('../lib/session-policy.ts');const now=1000000,s=newSessionTimes(now);assert.equal(s.until,now+30*86400000);assert.equal(s.absoluteUntil,now+30*86400000);assert.equal(renewSessionTimes(s,now+80*86400000).until,s.absoluteUntil);assert.equal(renewSessionTimes({until:now+100},now).until,now+100);assert.equal(sessionIdleSeconds,30*86400);assert.equal(sessionAbsoluteSeconds,30*86400);assert.match(google,/s.until<=Date.now/);assert.match(google,/catch\{return null\}/);assert.match(google,/httpOnly:true,sameSite:'lax'/);assert.match(google,/secure:process.env.NODE_ENV==='production'/)});
