"use client";

import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {ArrowDown,ArrowRight,ArrowUp,AudioLines,Check,CheckCheck,ChevronRight,ExternalLink,FileText,Fingerprint,Globe,Image as ImageIcon,Layers,Link2,Minus,Plus,Radio,RotateCcw,ScanLine,ShieldCheck,Sparkles,Volume2,VolumeX,X,Zap} from "lucide-react";
import {CASES,copy,freshSelection,type Locale,type Selection} from "./campaign-engine";
import {Soundscape} from "./campaign-audio";
import {NETWORKS,connectWallet,readScores,refreshRound,submitRound,type Arena,type Network,type OfficialRound} from "./campaign-chain";
import "./campaign.css";

const KEYS={log:"greybox-court-rounds-v1",locale:"greybox-locale"};
const read=(key:string,fallback:unknown)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
const save=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* Play remains available without storage. */}};
const short=(value:string)=>value.slice(0,6)+"…"+value.slice(-4);
const finished=(r:OfficialRound)=>r.status==="FINALIZED"||r.status==="FAILED";
const exhibitIcon={record:FileText,web:Globe,image:ImageIcon};
function parseArenas(raw:unknown):Partial<Record<Network,Arena>>{
  const result:Partial<Record<Network,Arena>>={};
  if(!raw||typeof raw!=="object")return result;
  for(const network of ["studionet","bradbury"] as const){const value=(raw as Record<string,unknown>)[network];if(!value||typeof value!=="object")continue;const {address,publisher}=value as Record<string,unknown>;if(typeof address==="string"&&typeof publisher==="string"&&/^0x[0-9a-fA-F]{40}$/.test(address)&&/^0x[0-9a-fA-F]{40}$/.test(publisher))result[network]={network,address,publisher}}
  return result;
}

function Modal({title,close,children,wide=false,closeLabel}:{title:string;close:()=>void;children:ReactNode;wide?:boolean;closeLabel:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const el=ref.current;if(el&&!el.open)el.showModal();return()=>el?.close()},[]);
  return <dialog ref={ref} className={"court-modal"+(wide?" court-modal-wide":"")} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}} aria-label={title}>
    <header className="modal-heading"><span>{title}</span><button onClick={close} className="icon-button" aria-label={closeLabel}><X size={19}/></button></header>
    <div className="modal-content">{children}</div>
  </dialog>;
}

export default function CampaignGame(){
  const [locale,setLocale]=useState<Locale>("zh"),[index,setIndex]=useState(0),[selection,setSelection]=useState<Selection>(()=>freshSelection(CASES[0]));
  const [focused,setFocused]=useState(CASES[0].evidence[0].id),[scores,setScores]=useState<Record<string,number>>({}),[ready,setReady]=useState(false);
  const [showHint,setShowHint]=useState(false),[trace,setTrace]=useState(false),[zoom,setZoom]=useState(false),[notice,setNotice]=useState("");
  const [soundOn,setSoundOn]=useState(false),[volume,setVolume]=useState(.22),[showSound,setShowSound]=useState(false);
  const [panel,setPanel]=useState<"chain"|"log"|null>(null),[network,setNetwork]=useState<Network>("studionet"),[shared,setShared]=useState<Partial<Record<Network,Arena>>>({});
  const [wallet,setWallet]=useState(""),[rounds,setRounds]=useState<OfficialRound[]>([]),[busy,setBusy]=useState(false),[configError,setConfigError]=useState(false);
  const audio=useRef<Soundscape|null>(null),polling=useRef(false),pollIndex=useRef(0);
  const c=CASES[index],t=copy[locale],detail=c.evidence.find(e=>e.id===focused)||c.evidence[0];
  const chosen=c.evidence.filter(e=>selection.evidence.includes(e.id)),cost=chosen.reduce((n,e)=>n+e.cost,0),power=Object.values(selection.allocation).reduce((a,b)=>a+b,0);
  const cleared=CASES.filter(x=>scores[x.id]>0).length;
  const arena=shared[network];
  const text=(zh:string,en:string)=>locale==="zh"?zh:en;

  useEffect(()=>{
    const lang=read(KEYS.locale,"zh");if(lang==="zh"||lang==="en")setLocale(lang);
    const log=read(KEYS.log,[]);if(Array.isArray(log))setRounds(log.filter(r=>r&&typeof r.id==="string"&&typeof r.txId==="string"&&["studionet","bradbury"].includes(r.network)).slice(0,50));
    audio.current=new Soundscape();setReady(true);
    fetch("/evidence-protocol.json").then(r=>{if(!r.ok)throw new Error("Config");return r.json()}).then(raw=>{
      if(!raw||typeof raw!=="object")throw new Error("Config");const config=raw as Record<string,unknown>;
      setShared(parseArenas(config.networks));if(config.active==="studionet"||config.active==="bradbury")setNetwork(config.active);
    }).catch(()=>setConfigError(true));
    return()=>{void audio.current?.dispose()};
  },[]);
  useEffect(()=>{if(ready){save(KEYS.locale,locale);document.documentElement.lang=locale==="zh"?"zh-CN":"en"}},[locale,ready]);
  useEffect(()=>{let canceled=false;setScores({});if(wallet&&arena)void readScores(arena,wallet,CASES).then(value=>{if(!canceled)setScores(value)}).catch(()=>{if(!canceled)setNotice(text("暂时无法读取链上战绩，请稍后重试。","Could not read onchain scores. Try again later."))});return()=>{canceled=true}},[wallet,arena?.address,arena?.publisher,network]);
  useEffect(()=>{audio.current?.setLevel(index)},[index]);
  useEffect(()=>{const handle=()=>{if(document.hidden)void audio.current?.pause();else if(soundOn)void audio.current?.start(index,volume)};document.addEventListener("visibilitychange",handle);return()=>document.removeEventListener("visibilitychange",handle)},[soundOn,index,volume]);
  useEffect(()=>{if(!notice||panel)return;const timer=setTimeout(()=>setNotice(""),6500);return()=>clearTimeout(timer)},[notice,panel]);
  useEffect(()=>{
    const pending=rounds.filter(r=>!finished(r));if(!pending.length)return;
    const timer=setInterval(async()=>{if(polling.current)return;polling.current=true;const r=pending[pollIndex.current++%pending.length];try{saveRound(await refreshRound(r))}catch{/* Manual refresh provides an error without interrupting play. */}finally{polling.current=false}},12000);
    return()=>clearInterval(timer);
  },[rounds]);

  function change(patch:Partial<Selection>){setSelection(s=>({...s,...patch}))}
  function openCase(next:number){const n=CASES[next];setIndex(next);setSelection(freshSelection(n));setFocused(n.evidence[0].id);setShowHint(false);setTrace(false);setZoom(false);window.scrollTo({top:0,behavior:"instant"})}
  function reset(){setSelection(freshSelection(c));setShowHint(false);setTrace(false)}
  function toggleEvidence(id:string){
    if(selection.evidence.includes(id)){change({evidence:selection.evidence.filter(x=>x!==id)});return}
    const e=c.evidence.find(x=>x.id===id)!;if(selection.evidence.length>=c.slots||cost+e.cost>c.budget){setNotice(t.limit);return}
    change({evidence:[...selection.evidence,id]});audio.current?.cue("pick");
  }
  function verifyCase(){
    if(!selection.evidence.length||!selection.tactic){setNotice(t.needEvidence);return}
    setPanel("chain");setNotice("");
  }
  function reorder(at:number,by:number){const next=[...selection.sequence];[next[at],next[at+by]]=[next[at+by],next[at]];change({sequence:next})}
  async function toggleSound(){try{if(soundOn){await audio.current?.pause();setSoundOn(false)}else{await audio.current?.start(index,volume);setSoundOn(true)}}catch{setNotice(text("当前浏览器无法播放音频。","Audio is unavailable in this browser."))}}
  function saveRound(r:OfficialRound){setRounds(old=>{const next=[r,...old.filter(x=>x.id!==r.id)].sort((a,b)=>b.createdAt-a.createdAt).slice(0,50);save(KEYS.log,next);return next});if(r.status==="FINALIZED"&&arena&&wallet.toLowerCase()===r.player.toLowerCase()&&arena.address.toLowerCase()===r.address.toLowerCase())void readScores(arena,wallet,CASES).then(setScores).catch(()=>{})}
  function showError(e:unknown){
    const details=e&&typeof e==="object"?e as {shortMessage?:unknown;message?:unknown;code?:unknown}:null;
    const message=typeof details?.shortMessage==="string"?details.shortMessage:typeof details?.message==="string"?details.message:String(e);
    const code=typeof details?.code==="number"||typeof details?.code==="string"?` [${details.code}]`:"";
    setNotice(t.error+(message.includes("NO_WALLET")?t.noWallet:message.includes("UNSUPPORTED")?t.unsupported:(message+code).slice(0,550)));
  }
  async function connect(){setBusy(true);setNotice(text("请在钱包里确认连接和网络切换。","Confirm wallet connection and network switch."));try{setWallet(await connectWallet(network));setNotice("")}catch(e){showError(e)}finally{setBusy(false)}}
  async function submit(){if(!arena)return;if(!selection.evidence.length||!selection.tactic){setNotice(t.needEvidence);return}setBusy(true);try{const account=await connectWallet(network);setWallet(account);saveRound(await submitRound(arena,account,c,selection));setPanel("log");setNotice(t.sent)}catch(e){showError(e)}finally{setBusy(false)}}
  async function refresh(r:OfficialRound){setBusy(true);try{saveRound(await refreshRound(r))}catch(e){showError(e)}finally{setBusy(false)}}
  const phase=(r:OfficialRound)=>r.status==="FINALIZED"?t.finalized:r.status==="FAILED"?t.failed:r.verdict?t.provisional:t.pending;
  const verdictName=(r:OfficialRound)=>r.verdict==="PROVED"?t.proved:r.verdict==="NOT_PROVED"?t.notProved:r.verdict==="INCONCLUSIVE"?t.inconclusive:"";

  return <main className="court" style={{"--case-accent":c.accent} as CSSProperties}>
    <div className="court-atmosphere" aria-hidden="true"/>
    <header className="court-header">
      <a href="/" className="court-brand" aria-label="Greybox Arena"><span className="brand-emblem"><Fingerprint size={26}/></span><span><b>GREYBOX<span className="brand-dot">.</span></b><small>{t.brand}</small></span></a>
      <div className="header-coordinate"><span className="live-dot"/> {t.campaign}<span className="coordinate-divider">/</span>{t.season}</div>
      <div className="court-tools">
        <div className="sound-tools"><button onClick={toggleSound} className={"tool-button sound-toggle "+(soundOn?"active":"")} aria-label={soundOn?t.soundOn:t.soundOff} aria-pressed={soundOn} title={t.musicHint}>{soundOn?<AudioLines size={17}/>:<VolumeX size={17}/>}<span>{t.music}</span></button><button className="icon-button volume-button" onClick={()=>setShowSound(!showSound)} aria-label={t.volume} aria-expanded={showSound}><Volume2 size={14}/></button>{showSound&&<div className="sound-popover"><label>{t.volume}<input aria-label={t.volume} type="range" min="0" max="0.6" step="0.02" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);audio.current?.setVolume(v)}}/></label></div>}</div>
        <button className="tool-button language-button" onClick={()=>setLocale(locale==="zh"?"en":"zh")} aria-label={locale==="zh"?"Switch to English":"切换为中文"}><span className={locale==="zh"?"current-language":""}>中</span><span className="language-slash">/</span><span className={locale==="en"?"current-language":""}>EN</span></button>
        <button className="tool-button log-button" aria-label={t.log} onClick={()=>setPanel("log")}><Layers size={16}/><span>{t.log}</span>{rounds.some(r=>!finished(r))&&<i className="live-dot"/>}</button>
      </div>
    </header>

    <div className="court-layout">
      <aside className="campaign-rail">
        <div className="rail-heading"><span>01 — 05</span><b>{t.season}</b></div>
        <nav aria-label={t.season} className="case-navigation">{CASES.map((x,i)=>{const done=scores[x.id]>0;return <button key={x.id} onClick={()=>openCase(i)} aria-current={index===i?"step":undefined} aria-label={`${x.chapter} ${x.title[locale]}`} className={"case-nav "+(index===i?"is-current ":"")+(done?"is-cleared":"")}><span className="case-number">{done?<Check size={16}/>:x.chapter}</span><span className="case-nav-text"><strong>{x.title[locale]}</strong><small>{x.innovation[locale]}</small></span><ChevronRight size={13} className="case-nav-arrow"/></button>})}</nav>
        <div className="campaign-progress"><div><span>{t.progress}</span><strong>{cleared}<i>/ 5</i></strong></div><div className="progress-track"><span style={{width:`${cleared*20}%`}}/></div><small>{wallet?t.scoreVerified:t.connectScores}</small></div>
        <div className="rail-stamp"><ScanLine size={27}/><p>{t.caption}</p><span>{t.fiction}</span></div>
      </aside>

      <div className="court-main" key={c.id}>
        <section className="case-scene" aria-labelledby="case-title">
          <div className="scene-art" aria-hidden="true"/><div className="scene-sweep" aria-hidden="true"/>
          <div className="scene-content"><div className="scene-kicker"><span className="case-chip">{t.stage} {c.chapter}</span><span>{c.innovation[locale]}</span><span className="difficulty" aria-label={text(`难度 ${c.difficulty} / 5`,`Difficulty ${c.difficulty} of 5`)}>{[1,2,3,4,5].map(n=><i key={n} className={n<=c.difficulty?"on":""}/>)}</span></div><h1 id="case-title">{c.title[locale]}</h1><p className="scene-subtitle">{c.subtitle[locale]}</p><p className="scene-objective"><span/>{c.objective[locale]}</p></div>
          <span className="scene-index" aria-hidden="true">{c.chapter}</span><div className="scene-corner" aria-hidden="true">GXB / {c.chapter}<span>CLASSIFIED ARCHIVE</span></div>
        </section>
        <section className="brief-strip"><div><span className="section-eyebrow">{t.brief}</span><p>{c.briefing[locale]}</p></div><button className={"hint-button "+(showHint?"active":"")} onClick={()=>setShowHint(!showHint)} aria-expanded={showHint}><Sparkles size={16}/>{t.hint}</button></section>
        {showHint&&<div className="hint-banner"><Sparkles size={17}/><div><strong>{t.hintTitle}</strong><p>{c.hint[locale]}</p></div></div>}

        <div className="investigation-grid">
          <section className="evidence-bay" aria-labelledby="evidence-heading">
            <header className="bay-heading"><h2 id="evidence-heading"><ScanLine size={19}/>{t.evidence}</h2><div className="budget-indicator"><span>{t.budget}</span><strong>{cost}<i>/ {c.budget}</i></strong><div className="budget-cells">{Array.from({length:c.budget},(_,i)=><i key={i} className={i<cost?"used":""}/>)}</div></div></header>
            <div className="evidence-deck">{c.evidence.map((e,i)=>{const Icon=exhibitIcon[e.kind],selected=selection.evidence.includes(e.id);return <button key={e.id} onClick={()=>setFocused(e.id)} className={"evidence-card "+(focused===e.id?"focused ":"")+(selected?"selected":"")} aria-pressed={focused===e.id} aria-label={`${t.inspect} ${e.title[locale]}`}><span className="evidence-meta"><span><Icon size={12}/>{t[e.kind]} / {String(i+1).padStart(2,"0")}</span><span>{selected?<Check size={13}/>:<>{e.cost}<Zap size={10}/></>}</span></span><strong>{e.title[locale]}</strong><p>{e.summary[locale]}</p><span className="evidence-bottom">{selected?t.selected:t.inspect}<ArrowRight size={12}/></span></button>})}</div>
            <article className="exhibit-view" key={detail.id}><div className="exhibit-title"><span className="file-tab"><Fingerprint size={13}/>{detail.id.toUpperCase()}</span><span>{t[detail.kind]}</span></div><h3>{detail.title[locale]}</h3>{detail.kind==="image"&&<button className="image-evidence" onClick={()=>setZoom(true)} aria-label={`${text("放大图像","Enlarge image")} ${detail.title[locale]}`}><img src={detail.url} alt={detail.title[locale]}/>{detail.id==="s3-frame"&&["serial","timestamp"].includes(selection.focus)&&<i className={"image-focus-marker marker-"+selection.focus} aria-hidden="true"/>}<span><ScanLine size={14}/>{text("放大检查细节","Inspect full resolution")}</span></button>}<p className="exhibit-body">{detail.body[locale]}</p><div className="exhibit-actions">{detail.kind==="web"?<a href={detail.url} target="_blank" rel="noreferrer">{t.source}<ExternalLink size={12}/></a>:<span className="source-label">{text("案卷封存记录","Archived case exhibit")}</span>}<button className={"select-evidence "+(selection.evidence.includes(detail.id)?"is-selected":"")} onClick={()=>toggleEvidence(detail.id)}>{selection.evidence.includes(detail.id)?<><Check size={15}/>{t.remove}</>:<><Plus size={15}/>{t.select}<small>−{detail.cost}</small></>}</button></div></article>
          </section>

          <section className="strategy-bay" aria-labelledby="strategy-heading">
            <header className="bay-heading"><h2 id="strategy-heading"><Fingerprint size={19}/>{t.strategy}</h2><span className="slot-count">{chosen.length} / {c.slots}<small>{t.slots}</small></span></header>
            <div className="submitted-evidence" aria-live="polite">{chosen.length?chosen.map(e=><button key={e.id} onClick={()=>toggleEvidence(e.id)} aria-label={`${t.remove} ${e.title[locale]}`}><Check size={12}/>{e.title[locale]}<X size={12}/></button>):<span><Plus size={14}/>{t.noSelection}</span>}</div>
            <div className="defense-note"><span className="section-eyebrow"><ShieldCheck size={12}/>{t.defense}</span><blockquote>“{c.defense[locale]}”</blockquote></div>

            {c.targets.length>1&&<div className="strategy-section"><h3>{t.target}</h3><div className="plan-options">{c.targets.map(x=><button key={x.id} className={selection.target===x.id?"chosen":""} aria-pressed={selection.target===x.id} onClick={()=>change({target:x.id})}><strong>{x.label[locale]}</strong><span>{x.detail[locale]}</span></button>)}</div></div>}
            {c.mechanic==="timeline"&&<div className="strategy-section"><h3>{t.timeline}<span>UTC + 08</span></h3><p className="mechanic-help">{t.timelineHelp}</p><ol className="timeline-board">{selection.sequence.map((id,i)=>{const x=c.sequence.find(x=>x.id===id)!;return <li key={id}><span className="event-index">0{i+1}</span><div><strong>{x.label[locale]}</strong><small>{x.detail[locale]}</small></div><button className="icon-button" aria-label={`${t.up} ${x.label[locale]}`} disabled={i===0} onClick={()=>reorder(i,-1)}><ArrowUp size={14}/></button><button className="icon-button" aria-label={`${t.down} ${x.label[locale]}`} disabled={i===selection.sequence.length-1} onClick={()=>reorder(i,1)}><ArrowDown size={14}/></button></li>})}</ol></div>}
            {c.mechanic==="focus"&&<div className="strategy-section"><h3>{t.focus}</h3><div className="focus-options">{c.focus.map((x,i)=><button key={x.id} onClick={()=>{change({focus:x.id});setFocused("s3-frame")}} className={selection.focus===x.id?"chosen":""} aria-pressed={selection.focus===x.id}><span>{String(i+1).padStart(2,"0")}</span><strong>{x.label[locale]}</strong><small>{x.detail[locale]}</small>{selection.focus===x.id&&<ScanLine size={16}/>}</button>)}</div></div>}
            {c.mechanic==="provenance"&&<div className="strategy-section"><h3>{t.provenance}</h3><button className="trace-button" onClick={()=>setTrace(!trace)} aria-expanded={trace}><Link2 size={15}/>{t.trace}<Plus size={14}/></button>{trace&&<div className="source-tree"><div className="source-root">BULLETIN B19</div><div className="source-branches">{c.evidence.slice(0,3).map(x=><span key={x.id}>{x.title[locale]}</span>)}</div><p>{text("三次转载，同一个起点。","Three repetitions. One origin.")}</p></div>}<span className="small-label">{t.root}</span><div className="compact-options">{c.focus.map(x=><button key={x.id} className={selection.focus===x.id?"chosen":""} aria-pressed={selection.focus===x.id} onClick={()=>change({focus:x.id})}>{x.label[locale]}</button>)}</div></div>}
            {c.mechanic==="allocation"&&<div className="strategy-section"><h3>{t.allocation}<span>{t.remaining} {c.resource_budget-power}</span></h3><div className="power-bank">{Array.from({length:c.resource_budget},(_,i)=><i key={i} className={i<power?"allocated":""}><Zap size={15}/></i>)}</div><div className="resource-controls">{c.resources.map(x=><div key={x.id}><div><strong>{x.label[locale]}</strong><small>{x.detail[locale]}</small></div><button className="icon-button" disabled={!selection.allocation[x.id]} aria-label={`${t.subtract} ${x.label[locale]}`} onClick={()=>change({allocation:{...selection.allocation,[x.id]:(selection.allocation[x.id]||0)-1}})}><Minus size={14}/></button><b>{selection.allocation[x.id]||0}</b><button className="icon-button" disabled={power>=c.resource_budget} aria-label={`${t.add} ${x.label[locale]}`} onClick={()=>change({allocation:{...selection.allocation,[x.id]:(selection.allocation[x.id]||0)+1}})}><Plus size={14}/></button></div>)}</div></div>}

            <div className="strategy-section rebuttal-section"><h3>{t.rebuttal}<span>0{c.tactics.length}</span></h3><div className="tactic-options">{c.tactics.map((x,i)=><button key={x.id} className={selection.tactic===x.id?"chosen":""} aria-pressed={selection.tactic===x.id} onClick={()=>change({tactic:x.id})}><span className="tactic-letter">{String.fromCharCode(65+i)}</span><span><strong>{x.label[locale]}</strong><small>{x.detail[locale]}</small></span><span className="tactic-check">{selection.tactic===x.id&&<Check size={13}/>}</span></button>)}</div></div>
            <div className="strategy-submit"><button className="court-primary" onClick={verifyCase}>{t.submit}<ArrowRight size={17}/></button><div className="secondary-actions"><button onClick={reset}><RotateCcw size={13}/>{t.reset}</button></div><p>{t.playNote}</p></div>
          </section>
        </div>

        {cleared===5&&<section className="campaign-complete"><CheckCheck size={32}/><div><h2>{t.allDone}</h2><p>{t.allDoneText}</p></div><span>05 / 05</span></section>}
        <footer className="court-footer"><span>{t.footer}</span></footer>
      </div>
    </div>

    {notice&&!panel&&<div className="court-toast" role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label={t.close}><X size={14}/></button></div>}
    {zoom&&<Modal title={detail.title[locale]} close={()=>setZoom(false)} closeLabel={t.close} wide><img className="zoom-evidence" src={detail.url} alt={detail.title[locale]}/><p className="result-note">{detail.body[locale]}</p></Modal>}
    {panel&&<Modal title={panel==="chain"?t.chain:t.log} close={()=>{setPanel(null);setNotice("")}} closeLabel={t.close} wide>
      <div className="chain-tabs"><button className={panel==="chain"?"active":""} onClick={()=>setPanel("chain")}>{t.chain}</button><button className={panel==="log"?"active":""} onClick={()=>setPanel("log")}>{t.log}<span>{rounds.length}</span></button></div>
      {notice&&<div className={"chain-feedback"+(notice.startsWith(t.error)?" is-error":"")} role="status"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label={t.close}><X size={16}/></button></div>}
      {panel==="chain"?<>
        <div className="chain-intro"><Radio size={28}/><div><h2>{arena?text("让验证节点重新核对这份证据","Let validators independently check your evidence"):t.notOpen}</h2><p>{arena?t.officialNote:t.notOpenDetail}</p>{configError&&<p>{text("共享配置暂时无法读取，请稍后刷新。","Shared configuration could not be loaded. Refresh later.")}</p>}</div></div>
        <div className="chain-summary"><span>{t.draft}<b>{c.title[locale]}</b></span><span>{t.network}<b>{NETWORKS[network].name}</b></span><span>{t.slots}<b>{chosen.length} / {c.slots}</b></span></div>
        <p className="finality-note"><ShieldCheck size={17}/>{t.finality}</p>
        <div className="chain-actions"><button className="court-secondary" onClick={connect} disabled={busy}>{wallet?short(wallet):t.wallet}</button><button className="court-primary" onClick={submit} disabled={busy||!arena}>{busy?t.loading:t.submit}<ArrowRight size={16}/></button></div>
      </>:<><p className="result-note">{t.finality}</p>{rounds.length?<div className="round-log">{rounds.map(r=><article key={r.id} className={r.status==="FINALIZED"?"round-final":""}><header><strong>{CASES.find(x=>x.id===r.caseId)?.title[locale]||r.caseId}</strong><span>{NETWORKS[r.network].name}</span></header><div className="round-verdict"><b>{verdictName(r)||phase(r)}</b><span>{phase(r)}</span></div><small>{new Date(r.createdAt).toLocaleString(locale==="zh"?"zh-CN":"en-US")} · {r.status}</small>{r.verdict&&r.status!=="FINALIZED"&&<p className="provisional-note">{t.acceptMayChange}</p>}{r.observations&&<details><summary>{t.observations}</summary><ul>{r.observations.map(o=><li key={o.id}><code>{o.id}</code> : {o.facts.join(", ")||"—"}</li>)}</ul></details>}<footer><a href={`${NETWORKS[r.network].explorer}/transactions/${r.txId}`} target="_blank" rel="noreferrer">{t.tx}<ExternalLink size={12}/></a>{!finished(r)&&<button disabled={busy} onClick={()=>refresh(r)}><RotateCcw size={12}/>{t.refresh}</button>}</footer></article>)}</div>:<div className="empty-log"><Layers size={35}/><p>{t.emptyLog}</p></div>}</>}
    </Modal>}
  </main>;
}
