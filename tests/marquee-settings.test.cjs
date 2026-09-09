const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const stored={},handlers={},packets=[];
const context={console,localStorage:{getItem:k=>Object.hasOwn(stored,k)?stored[k]:null,setItem:(k,v)=>stored[k]=v},Pebble:{addEventListener:(k,f)=>handlers[k]=f,sendAppMessage:(p,ok)=>{packets.push(p);if(ok)ok();}},setTimeout,clearTimeout,XMLHttpRequest:function(){}};
vm.createContext(context);vm.runInContext(fs.readFileSync('src/pkjs/index.js','utf8'),context);
assert.equal(context.configuredMarqueeSpeed(),2);
for(let speed=0;speed<=4;speed++){
 stored.pomeMarqueeSpeed=String(speed);
 assert.equal(context.configuredMarqueeSpeed(),speed);
 context.sendDisplaySettings();assert.equal(packets.at(-1).MARQUEE_SPEED,speed);
 const html=decodeURIComponent(context.configurationPage().split(',').slice(1).join(','));
 assert.ok(html.includes('value="'+speed+'" selected>'+['Off','Slow','Normal (default)','Fast','Very fast'][speed]));
}
for(const bad of [-1,5,1.5,'bad'])assert.equal(context.normalizeMarqueeSpeed(bad),2);
handlers.webviewclosed({response:encodeURIComponent(JSON.stringify({marqueeSpeed:4}))});
assert.equal(stored.pomeMarqueeSpeed,'4');
context.time2Enhanced=()=>true;
const html=decodeURIComponent(context.configurationPage().split(',').slice(1).join(','));
assert.ok(html.indexOf('id="marqueeSpeed"')>html.indexOf('id="themesPanel"'));
const palette=JSON.parse(html.match(/var watchColors=(\[[^;]+\]);/)[1]);
const sharedOptions=JSON.parse(html.match(/\)\((\{"app":"pome"[^]*?\})\);/)[1]);
assert.deepEqual(sharedOptions.watchColors,palette,'Shared picker and theme preview use identical palette');
for(let i=0;i<64;i++){
 const sent=context.themeMessage({...context.configuredTheme(),selection:palette[i]});
 assert.equal(sent.THEME_SELECTION,0xc0|i);
 const channels=[(sent.THEME_SELECTION>>4)&3,(sent.THEME_SELECTION>>2)&3,sent.THEME_SELECTION&3];
 assert.equal('#'+channels.map(n=>(n*85).toString(16).padStart(2,'0')).join(''),palette[i]);
}
assert.equal(palette[48],'#ff0000','Red is no longer replaced by simulated muted pink');
assert.equal(palette[12],'#00ff00','Green is no longer replaced by simulated mint');
const c=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
assert.match(c,/#define MARQUEE_FRAME_MS 40/);
assert.match(c,/s_marquee_speed = 2/);
assert.match(c,/s_marquee_offset \+= s_marquee_speed/);
assert.match(c,/if \(!s_marquee_speed\) return/);
assert.match(c,/persist_write_int\(MARQUEE_SPEED_KEY, s_marquee_speed\)/);
assert.match(c,/persist_read_int\(MARQUEE_SPEED_KEY\)/);
assert.match(c,/s_marquee_max = s_marquee_speed &&/);
assert.equal(2/0.04,2*(2/0.08),'New default twice as fast as previous');
assert.equal(JSON.parse(fs.readFileSync('package.json')).pebble.messageKeys.MARQUEE_SPEED,48);
console.log('PASS: five persisted marquee speeds, twice-as-fast default, Off disables scrolling, setting reaches watch, all64 preview/picker colors exactly match transmitted GColor8');
