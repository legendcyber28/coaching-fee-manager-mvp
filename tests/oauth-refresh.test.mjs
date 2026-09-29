import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const callback=readFileSync(new URL('../app/api/auth/callback/route.ts',import.meta.url),'utf8');
test('repeat OAuth consent can reuse a previously encrypted refresh credential',()=>{
 assert.match(callback,/SELECT refresh_cipher FROM tenants WHERE sub=\$\{profile\.sub\}/);
 assert.match(callback,/const refresh=t\.refresh_token\|\|previous\?\.refresh/);
 assert.match(callback,/if\(t\.refresh_token\)await sql`UPDATE tenants SET refresh_cipher=/);
 assert.doesNotMatch(callback,/console\.error\([^;]*(access_token|refresh_token|code_verifier)/);
});
