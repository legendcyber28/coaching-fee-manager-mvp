import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const store=readFileSync(new URL('../lib/store.ts',import.meta.url),'utf8');
test("new attendance mark uses the explicitly selected batch rather than a student primary batch",()=>{
  const branch=store.slice(store.indexOf("if(resource==='attendance'){"),store.indexOf("if(resource==='batches'){"));
  assert.match(branch,/const old=arr\.find\(x=>x\.studentId===st\.id&&x\.batchId===b\.batchId&&x\.date===day\)/);
  assert.match(branch,/const v=\{id:randomUUID\(\),studentId:st\.id,batchId:b\.batchId,date:day,status:b\.status\}/);
  assert.doesNotMatch(branch,/const v=\{[^}]*batchId:st\.batchId/);
});
