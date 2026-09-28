// Original, generated-in-browser score. No audio service, sample pack or network.
export class Soundscape {
  private ctx:AudioContext|null=null;
  private master:GainNode|null=null;
  private timer:ReturnType<typeof setInterval>|null=null;
  private step=0;
  private level=0;
  private next=0;
  private volume=.22;
  private enabled=false;
  async start(level:number,volume:number){
    this.level=level;this.volume=volume;this.enabled=true;
    if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=volume*.35;const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-24;compressor.ratio.value=4;this.master.connect(compressor);compressor.connect(this.ctx.destination)}
    await this.ctx.resume();this.next=this.ctx.currentTime+.06;
    if(!this.timer)this.timer=setInterval(()=>this.schedule(),120);
    this.schedule();
  }
  setLevel(level:number){this.level=level;this.step=0}
  setVolume(volume:number){this.volume=volume;if(this.ctx&&this.master)this.master.gain.setTargetAtTime(volume*.35,this.ctx.currentTime,.12)}
  async pause(){this.enabled=false;if(this.timer){clearInterval(this.timer);this.timer=null}await this.ctx?.suspend()}
  private note(freq:number,when:number,duration:number,amplitude:number,type:OscillatorType="sine"){
    if(!this.ctx||!this.master)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(amplitude,when+.08);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain);gain.connect(this.master);osc.start(when);osc.stop(when+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()};
  }
  private schedule(){
    if(!this.ctx||!this.enabled)return;
    const roots=[73.416,65.406,77.782,69.296,73.416],root=roots[this.level%5],scale=[0,7,12,15,19,15,12,7];
    while(this.next<this.ctx.currentTime+.45){
      const s=this.step++,when=this.next,beat=.72-this.level*.045;
      if(s%8===0){this.note(root,when,7,.11);this.note(root*1.4983,when,6.5,.045);this.note(root*2.3784,when,6,.024)}
      if(s%2===0)this.note(root*2**(scale[s%8]/12)*2,when,1.9,.032);
      this.note(root/2,when,.27,.052);
      if(this.level>2&&s%4===3)this.note(root*4,when,.3,.016,"triangle");
      this.next+=beat;
    }
  }
  cue(kind:"pick"|"win"|"loss"){
    if(!this.ctx||!this.enabled)return;const now=this.ctx.currentTime+.015;
    const notes=kind==="win"?[293.66,369.99,440,587.33]:kind==="loss"?[220,207.65]:[440,659.25];
    notes.forEach((f,i)=>this.note(f,now+i*.09,kind==="pick"?.18:.85,.07));
  }
  async dispose(){if(this.timer)clearInterval(this.timer);this.timer=null;this.enabled=false;await this.ctx?.close();this.ctx=null;this.master=null}
}
