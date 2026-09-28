// Reproducible artifact, strategy and transaction-lifecycle checks. No network.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import vm from "node:vm";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url),ts=require("typescript");
const read=p=>readFileSync(resolve(root,p));
const cases=JSON.parse(read("data/campaign.json"));
const hash=raw=>createHash("sha256").update(raw).digest("hex");
const canonical=x=>JSON.stringify(x&&typeof x==="object"?(Array.isArray(x)?x.map(normalize):normalize(x)):x);
function normalize(x){return x&&typeof x==="object"?(Array.isArray(x)?x.map(normalize):Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])]))):x}
function loadTs(file,imports){const module={exports:{}};const js=ts.transpileModule(read(file).toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{module,exports:module.exports,require:id=>{if(!(id in imports))throw new Error("Unexpected import: "+id);return imports[id]},Uint8Array,console},{filename:file});return module.exports}

assert.equal(cases.length,5);assert.equal(cases.reduce((s,c)=>s+c.evidence.length,0),28);
assert.deepEqual(JSON.parse(read("public/campaign/manifests.json")),cases.map(c=>c.manifest));
assert.equal(hash(read("contracts/EvidenceCourt.py")),hash(read("public/EvidenceCourt.py")),"The deployable contract must match reviewed source");
let pinned=0;
for(const c of cases){assert.equal(hash(canonical(c.manifest)),c.manifest_hash);for(const e of c.evidence){assert.ok(e.truth.every(f=>e.checks.includes(f)));if(e.url){const onchain=c.manifest.evidence.find(x=>x.id===e.id);assert.equal(new URL(onchain.url).pathname,e.url);assert.equal(hash(read("public"+e.url)),onchain.sha256);pinned++}}}

const {judge,freshSelection}=loadTs("app/campaign-engine.ts",{"../data/campaign.json":cases});
const solutions=[
  [0,"maintenance",["s1-power","s1-order"]],
  [0,"thermal",["s1-power","s1-thermal"]],
  [1,"camera-route",["s2-camera","s2-clock","s2-receipt"]],
  [2,"wrong-item",["s3-frame","s3-manifest"]],
  [2,"wrong-date",["s3-frame","s3-archive"]],
  [3,"independent-records",["s4-sensor","s4-service"]],
  [3,"withdrawn-source",["s4-sensor","s4-correction"]],
  [4,"north-plan",["s5-scan","s5-manifest","s5-north"]],
  [4,"south-plan",["s5-scan","s5-manifest","s5-south"]],
];
for(const [i,id,evidence] of solutions){const c=cases[i],r=c.routes.find(r=>r.id===id);assert.ok(r);const s={...freshSelection(c),evidence,tactic:r.tactic,target:r.target,focus:r.focus,sequence:r.sequence,allocation:r.allocation};const verdict=judge(c,s);assert.ok(verdict.won,id);assert.equal(verdict.route.id,id);assert.equal(judge(c,{...s,evidence:[]}).won,false);assert.equal(judge(c,{...s,tactic:c.tactics.find(t=>t.id!==r.tactic&& !c.routes.some(route=>route.tactic===t.id))?.id||"invalid"}).won,false)}
assert.equal(solutions.length,cases.reduce((n,c)=>n+c.routes.length,0));

let status="ACCEPTED",execution="FINISHED_WITH_RETURN",readVariant,readFails=false;
const client={getTransaction:async()=>({statusName:status,txExecutionResultName:execution,recipient:"0x"+"1".repeat(40)}),readContract:async({functionName,transactionHashVariant})=>{readVariant=transactionHashVariant;if(readFails)throw new Error("RPC unavailable");return JSON.stringify(functionName==="get_engine"?{engine:"EvidenceCourt",version:1,publisher:"0x"+"2".repeat(40)}:functionName==="get_score"?{attempts:3,wins:2,inconclusive:0}:{verdict:"PROVED",routes:["maintenance"],observations:[{id:"s1-power",facts:["power"]}]})}};
const chain=loadTs("app/campaign-chain.ts",{"genlayer-js":{createClient:()=>client},"genlayer-js/chains":{studionet:{},testnetBradbury:{}},"genlayer-js/types":{TransactionHashVariant:{LATEST_FINAL:"final",LATEST_NONFINAL:"nonfinal"}}});
const base={id:"a".repeat(32),caseId:"silent-orbit",caseKey:"publisher:silent-orbit:1",player:"0x"+"3".repeat(40),network:"studionet",address:"0x"+"1".repeat(40),txId:"0x"+"a".repeat(64),createdAt:1,status:"SUBMITTED"};
let r=await chain.refreshRound(base);assert.equal(r.status,"ACCEPTED");assert.equal(r.verdict,"PROVED");assert.equal(readVariant,"nonfinal");
status="PROPOSING";r=await chain.refreshRound(r);assert.equal(r.verdict,undefined);assert.equal(r.observations,undefined,"An appealed result must not retain old observed facts");
status="READY_TO_FINALIZE";r=await chain.refreshRound(base);assert.equal(r.status,"READY_TO_FINALIZE");assert.equal(readVariant,"nonfinal");
status="FINALIZED";r=await chain.refreshRound(base);assert.equal(r.status,"FINALIZED");assert.equal(readVariant,"final");
execution="CONTRACT_ERROR";r=await chain.refreshRound(base);assert.equal(r.status,"FAILED");assert.equal(r.verdict,undefined);
status="CANCELED";assert.equal((await chain.checkDeployment("studionet",base.txId)).status,"FAILED");
status="FINALIZED";execution=undefined;
assert.equal((await chain.checkDeployment("studionet",base.txId)).status,"FINALIZED","Studionet omits txExecutionResultName; readable finalized contract succeeds");
r=await chain.refreshRound(base);assert.equal(r.status,"FINALIZED");assert.equal(r.verdict,"PROVED","Studionet finalized round is read from the contract");
const score=await chain.readScores({network:"studionet",address:base.address,publisher:"0x"+"2".repeat(40)},base.player,cases);assert.equal(score["silent-orbit"],2);assert.equal(Object.keys(score).length,5);
execution="FINISHED_WITH_RETURN";readFails=true;await assert.rejects(()=>chain.refreshRound(base),/RPC unavailable/);
console.log(`PASS: 5 cases, 28 exhibits, ${solutions.length} winning strategies; ${pinned} pinned assets; identical public contract; Studionet missing-execution and onchain-score checks.`);
