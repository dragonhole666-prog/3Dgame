export class GameAudio {
 private context?:AudioContext;private output?:GainNode;enabled=true;
 start(){if(!this.context){this.context=new AudioContext();this.output=this.context.createGain();this.output.gain.value=.13;this.output.connect(this.context.destination);}void this.context.resume();}
 setEnabled(value:boolean){this.enabled=value;if(this.output)this.output.gain.value=value?.13:0;}
 play(kind:'hit'|'swing'|'loot'|'hurt'|'equip'|'thunder'|'fire'|'frost'){
  if(!this.context||!this.output||!this.enabled)return;const ctx=this.context,now=ctx.currentTime;
  if(kind==='hit'||kind==='swing'||kind==='hurt'||kind==='thunder'||kind==='fire'||kind==='frost'){
   const duration=kind==='thunder'?.55:kind==='fire'?.36:kind==='frost'?.42:.18,buffer=ctx.createBuffer(1,ctx.sampleRate*duration,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++){const t=i/data.length,env=(1-t)**(kind==='frost'?1.25:2);data[i]=(Math.random()*2-1)*env*(kind==='fire'?(0.65+0.35*Math.sin(i*.12)):1);}
   const source=ctx.createBufferSource();source.buffer=buffer;const filter=ctx.createBiquadFilter();filter.type=kind==='frost'?'highpass':'lowpass';filter.frequency.value=kind==='swing'?2500:kind==='thunder'?650:kind==='fire'?1250:kind==='frost'?1800:1100;const gain=ctx.createGain();gain.gain.value=kind==='hurt'?.8:kind==='fire'||kind==='frost'?.58:.5;source.connect(filter).connect(gain).connect(this.output);source.start();
   if(kind==='frost'){const osc=ctx.createOscillator(),tone=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(1180,now);osc.frequency.exponentialRampToValueAtTime(420,now+.34);tone.gain.setValueAtTime(.11,now);tone.gain.exponentialRampToValueAtTime(.001,now+.4);osc.connect(tone).connect(this.output);osc.start(now);osc.stop(now+.42);}
  }else {for(let i=0;i<3;i++){const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=(kind==='loot'?523:392)*[1,1.5,2][i];gain.gain.setValueAtTime(0,now+i*.07);gain.gain.linearRampToValueAtTime(.25,now+i*.07+.01);gain.gain.exponentialRampToValueAtTime(.001,now+i*.07+.7);oscillator.connect(gain).connect(this.output);oscillator.start(now+i*.07);oscillator.stop(now+1);}}
 }
}
