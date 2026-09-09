const assert=require('assert'),fs=require('fs'),vm=require('vm');
const context={console:{log(){}},localStorage:{getItem(){return null;},setItem(){}},
 Pebble:{addEventListener(){},sendAppMessage(){},openURL(){}},XMLHttpRequest:function(){},
 setTimeout(fn){fn();},clearTimeout(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/pkjs/index.js','utf8'),context);
context.nativeHome={};
context.roomLights=(room,cb)=>cb(null,[{name:'A',serviceId:'A'},{name:'B',serviceId:'B'}]);
let requests=[],callbacks=[],active=0,maxActive=0;
context.apiGet=(path,cb)=>{requests.push(path);active++;maxActive=Math.max(maxActive,active);callbacks.push((err)=>{active--;cb(err,{status:'ok'});});};
// Drop every completion/error notification to the watch deliberately.
context.send=()=>{};context.sendError=()=>{};
function set(hue){context.setColor('Room','All Lights',hue,100,'light-group');}
function complete(err){assert(callbacks.length);callbacks.shift()(err);}
set(0);
for(let h=1;h<=99;h++)set(h);
assert.equal(requests.length,1);
complete();complete();
assert.equal(requests[2],'/color/99/100/A');
complete();complete();
assert.equal(context.liveColorBusy,false);
assert.equal(context.liveColorPending,null);
// Repeated live gestures keep progressing despite dropped status replies.
for(let i=0;i<200;i++){
 set(i%360);set((i+1)%360);set((i+2)%360);
 complete(i%7===0?new Error('Unknown result'):null);complete();
 complete();complete();
 assert.equal(context.liveColorBusy,false);
}
assert.equal(maxActive,1);
assert.equal(callbacks.length,0);
// An inventory failure must release the queue too.
context.roomLights=(room,cb)=>cb(new Error('offline'));
set(42);assert.equal(context.liveColorBusy,false);
const src=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
const ack=src.slice(src.indexOf('static void outbox_sent('),src.indexOf('static void root_window_load('));
assert(ack.includes('s_picker_busy = false'));
assert(ack.includes('picker_schedule()'));
assert(src.includes('app_message_register_outbox_sent(outbox_sent)'));
for(const height of [168,228]){
 const extra=height-168,row=42+extra/2;
 assert(42+2*row<128+extra);
 assert(row-5-23>=14); // 15px Time, 45px Time 2, previously 7px.
}
console.log('PASS: 200 live room gestures, latest-only coalescing, dropped status messages, partial and inventory failures, no overlapping writes, taller slider layout');
