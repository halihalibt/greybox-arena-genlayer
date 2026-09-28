import type {Case,Selection} from "./campaign-engine";
export type Network="studionet"|"bradbury";
export type Arena={network:Network;address:string;publisher:string};
export type OfficialRound={id:string;caseId:string;caseKey:string;player:string;network:Network;address:string;txId:string;createdAt:number;status:string;verdict?:string;routes?:string[];observations?:{id:string;facts:string[]}[]};
type Provider={request:(args:{method:string;params?:unknown[]})=>Promise<unknown>};
export const NETWORKS={studionet:{name:"Studionet",id:61999,rpc:"https://studio.genlayer.com/api",explorer:"https://explorer-studio.genlayer.com"},bradbury:{name:"Bradbury",id:4221,rpc:"https://rpc-bradbury.genlayer.com",explorer:"https://explorer-bradbury.genlayer.com"}};
const provider=()=>typeof window!=="undefined"?(window as Window&{ethereum?:Provider}).ethereum:undefined;
export async function chainClient(network:Network,account?:string){
  const [{createClient},{studionet,testnetBradbury}]=await Promise.all([import("genlayer-js"),import("genlayer-js/chains")]);
  return createClient({chain:network==="studionet"?studionet:testnetBradbury,...(account?{account:account as any,provider:provider() as any}:{})});
}
export async function connectWallet(network:Network){
  const p=provider();if(!p)throw new Error("NO_WALLET");const meta=NETWORKS[network];
  const accounts=await p.request({method:"eth_requestAccounts"}) as string[];if(!accounts?.[0])throw new Error("NO_WALLET");
  try{await p.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x"+meta.id.toString(16)}]})}catch(e){if(Number((e as {code?:number|string})?.code)!==4902)throw e;await p.request({method:"wallet_addEthereumChain",params:[{chainId:"0x"+meta.id.toString(16),chainName:"GenLayer "+meta.name,nativeCurrency:{name:"GEN",symbol:"GEN",decimals:18},rpcUrls:[meta.rpc],blockExplorerUrls:[meta.explorer]}]})}
  const activeChain=await p.request({method:"eth_chainId"});
  if(Number(activeChain)!==meta.id)throw new Error(`Wallet network mismatch: expected ${meta.name} (${meta.id}), got ${String(activeChain)}`);
  return accounts[0];
}
// GenLayerJS 1.1.8's Studionet getTransaction path does not always expose
// txExecutionResultName. A finalized transaction is confirmed by reading its
// finalized contract state, never by assuming a missing execution field failed.
const executionFailed=(tx:{txExecutionResultName?:string;txExecutionResult?:number})=>tx.txExecutionResultName!==undefined?tx.txExecutionResultName!=="FINISHED_WITH_RETURN":tx.txExecutionResult!==undefined&&tx.txExecutionResult!==1;
export async function checkDeployment(network:Network,hash:string){
  const c=await chainClient(network),tx=await c.getTransaction({hash:hash as any});
  if(tx.statusName==="CANCELED")return {status:"FAILED",address:"",publisher:""};
  if(tx.statusName!=="FINALIZED")return {status:tx.statusName||"PENDING",address:"",publisher:""};
  const address=tx.recipient||(tx.data as {contract_address?:string}|undefined)?.contract_address;
  if(executionFailed(tx)||!address)return {status:"FAILED",address:"",publisher:""};
  const {TransactionHashVariant}=await import("genlayer-js/types");
  const info=JSON.parse(String(await c.readContract({address:String(address) as any,functionName:"get_engine",args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})));
  if(info.engine!=="EvidenceCourt"||info.version!==1)throw new Error("UNSUPPORTED");
  return {status:"FINALIZED",address:String(address),publisher:String(info.publisher)};
}
export async function readScores(arena:Arena,account:string,cases:Case[]){
  const {TransactionHashVariant}=await import("genlayer-js/types");const c=await chainClient(arena.network);
  const scores=await Promise.all(cases.map(async item=>{
    const key=arena.publisher.toLowerCase()+":"+item.id+":"+String(item.manifest.version);
    const raw=await c.readContract({address:arena.address as any,functionName:"get_score",args:[account,key],transactionHashVariant:TransactionHashVariant.LATEST_FINAL});
    const value=JSON.parse(String(raw));return [item.id,Number.isInteger(value.wins)&&value.wins>0?value.wins:0] as const;
  }));
  return Object.fromEntries(scores) as Record<string,number>;
}
export async function submitRound(arena:Arena,account:string,caseData:Case,selection:Selection){
  const {TransactionHashVariant}=await import("genlayer-js/types");const c=await chainClient(arena.network,account);
  const version=Number(caseData.manifest.version);if(!Number.isInteger(version)||version<1)throw new Error("UNSUPPORTED");
  const caseKey=arena.publisher.toLowerCase()+":"+caseData.id+":"+version;
  const [raw,engineRaw]=await Promise.all([
    c.readContract({address:arena.address as any,functionName:"get_case",args:[caseKey],transactionHashVariant:TransactionHashVariant.LATEST_FINAL}),
    c.readContract({address:arena.address as any,functionName:"get_engine",args:[],transactionHashVariant:TransactionHashVariant.LATEST_FINAL})
  ]);
  const engine=JSON.parse(String(engineRaw));if(engine.engine!=="EvidenceCourt"||engine.version!==1)throw new Error("UNSUPPORTED");
  const registered=JSON.parse(String(raw));if(registered.manifest_hash!==caseData.manifest_hash)throw new Error("UNSUPPORTED");
  const images:Uint8Array[]=[];
  for(const id of [...selection.evidence].sort()){const e=caseData.evidence.find(x=>x.id===id)!;if(e.kind==="image"){const r=await fetch(e.url!);if(!r.ok)throw new Error("Image unavailable");images.push(new Uint8Array(await r.arrayBuffer()))}}
  const id=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,"0")).join("");
  const txId=await c.writeContract({address:arena.address as any,functionName:"submit_round",args:[id,caseKey,JSON.stringify(selection),images],value:BigInt(0)});
  return {id,caseId:caseData.id,caseKey,player:account,network:arena.network,address:arena.address,txId,createdAt:Date.now(),status:"SUBMITTED"} satisfies OfficialRound;
}
export async function refreshRound(round:OfficialRound):Promise<OfficialRound>{
  const c=await chainClient(round.network),tx=await c.getTransaction({hash:round.txId as any});const status=tx.statusName||"PROCESSING";
  if(status==="CANCELED"||status==="FINALIZED"&&executionFailed(tx))return {...round,status:"FAILED",verdict:undefined,routes:undefined,observations:undefined};
  if(["ACCEPTED","READY_TO_FINALIZE","FINALIZED"].includes(status)&&!executionFailed(tx)){
    const {TransactionHashVariant}=await import("genlayer-js/types");
    try{const raw=await c.readContract({address:round.address as any,functionName:"get_round",args:[round.player,round.id],transactionHashVariant:status==="FINALIZED"?TransactionHashVariant.LATEST_FINAL:TransactionHashVariant.LATEST_NONFINAL});const data=JSON.parse(String(raw));if(!["PROVED","NOT_PROVED","INCONCLUSIVE"].includes(data.verdict))throw new Error("Invalid round");return {...round,status,verdict:data.verdict,routes:data.routes,observations:data.observations}}catch(e){if(status==="FINALIZED")throw e}
  }
  return {...round,status,verdict:undefined,routes:undefined,observations:undefined};
}
