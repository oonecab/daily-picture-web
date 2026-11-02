// Test-only clock: advances Date and executes/cancels timers deterministically.
export function createClock(start){
 let now=Date.parse(start),next=0;const timers=new Map();
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const set=(fn,ms,repeat)=>{const id=++next;timers.set(id,{fn,at:now+ms,repeat});return id;};
 return {Date:ClockDate,setTimeout:(fn,ms)=>set(fn,ms,0),clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>set(fn,ms,ms),clearInterval:id=>timers.delete(id),
 async advance(ms){const end=now+ms;for(;;){const pair=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;const [id,t]=pair;now=t.at;if(t.repeat)t.at+=t.repeat;else timers.delete(id);await t.fn();await new Promise(setImmediate);}now=end;await new Promise(setImmediate);}};
}
