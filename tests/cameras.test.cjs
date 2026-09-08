const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('src/pkjs/cameras.js','utf8');
function setup(responses){
 const handlers={},packets=[],requests=[],timers=[],store={};
 function XHR(){this.open=(method,path)=>{this.method=method;this.path=path;};this.setRequestHeader=(k,v)=>assert.equal(v,'Bearer test');this.send=()=>{requests.push({method:this.method,path:this.path});const r=responses.shift();assert(r,'unexpected request');this.status=r.status||200;this.responseText=JSON.stringify(r.body);this.onload();};}
 const ctx={module:{exports:{}},require:n=>n==='./camera-private-config'?{experimental:true,url:'https://private.test',token:'test'}:n==='./camera-connection'?require('../src/pkjs/camera-connection'):{},XMLHttpRequest:XHR,Date,Number,localStorage:{getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},setTimeout:f=>timers.push(f),Pebble:{addEventListener:(k,f)=>handlers[k]=f,sendAppMessage:(p,ok)=>{packets.push(p);if(ok)ok();}}};
 vm.runInNewContext(source,ctx);
 return {packets,requests,timers,store,exports:ctx.module.exports,run:p=>handlers.appmessage({payload:p})};
}
let t=setup([{body:{images:Array.from({length:12},(_,i)=>({id:'photo'+i,age:i,snapshotAt:100-i}))}}]);
t.run({CAMERA_CMD:4,CAMERA_RID:10,CAMERA_ID:'cam',CAMERA_W:200});assert.equal(t.packets.length,10);assert.equal(t.packets[9].CAMERA_COUNT,9);assert.equal(t.requests.length,1);assert.equal(t.requests[0].method,'GET');
t=setup([{body:{width:405,height:228,encoding:'gcolor6',pixels:Buffer.alloc(69255).toString('base64'),age:61}}]);t.store['pome-camera-mode']='high-contrast';
t.run({CAMERA_CMD:2,CAMERA_RID:11,CAMERA_ID:'cam',CAMERA_PHOTO:'old-photo',CAMERA_W:200});assert.equal(t.requests.length,1);assert(t.requests[0].path.includes('image=old-photo'));assert(t.requests[0].path.includes('mode=high-contrast'));assert.equal(t.packets.at(-1).CAMERA_KIND,5);
t=setup([{body:{queued:true,requestID:'request1'}},{body:{state:'capturing'}}]);t.run({CAMERA_CMD:5,CAMERA_RID:12,CAMERA_ID:'cam',CAMERA_W:200});assert.equal(t.requests[0].method,'POST');assert(t.requests[1].path.includes('request=request1'));assert.equal(t.packets[0].CAMERA_KIND,8);t.run({CAMERA_CMD:3,CAMERA_RID:13,CAMERA_W:200});t.timers[0]();assert.equal(t.requests.length,2);
t=setup([{body:{queued:true,requestID:'request2'}},{body:{state:'failed',error:'Camera unavailable'}}]);t.run({CAMERA_CMD:5,CAMERA_RID:14,CAMERA_ID:'cam',CAMERA_W:200});assert.equal(t.packets[0].CAMERA_ERROR,'Camera unavailable');
t=setup([]);t.run({COMMAND:1});assert.equal(t.requests.length,0);
for(const ready of [{state:'ready'},{state:'ready',image:'fresh',requestedAt:100,snapshotAt:99}]){
 const bad=setup([{body:{requestID:'r'}},{body:ready}]);bad.run({CAMERA_CMD:5,CAMERA_RID:20,CAMERA_ID:'cam',CAMERA_W:200});
 assert.equal(bad.requests.length,2);assert.equal(bad.packets.at(-1).CAMERA_KIND,6);
}
for(const image of ['wrong','fresh']){
 const bad=setup([{body:{requestID:'r'}},{body:{state:'ready',image:'fresh',requestedAt:100,snapshotAt:101}},{body:{image,snapshotAt:image==='fresh'?99:101}}]);
 bad.run({CAMERA_CMD:5,CAMERA_RID:21,CAMERA_ID:'cam',CAMERA_W:200});assert.equal(bad.packets.at(-1).CAMERA_KIND,6);
 assert(bad.requests[2].path.includes('image=fresh'));assert(!bad.packets.some(p=>p.CAMERA_KIND===3));
}
const fresh=setup([{body:{requestID:'r'}},{body:{state:'ready',image:'fresh',requestedAt:100,snapshotAt:101}},{body:{image:'fresh',snapshotAt:101,width:405,height:228,encoding:'gcolor6',pixels:Buffer.alloc(69255).toString('base64'),age:3}}]);
fresh.run({CAMERA_CMD:5,CAMERA_RID:22,CAMERA_ID:'cam',CAMERA_W:200});assert.equal(fresh.packets.at(-1).CAMERA_KIND,5);assert(fresh.requests[2].path.includes('image=fresh'));
const date=new Date(101000),pad=n=>String(n).padStart(2,'0');
const stamp=(date.getHours()%12||12)+':'+pad(date.getMinutes())+(date.getHours()<12?' AM':' PM');
assert.equal(fresh.packets.find(p=>p.CAMERA_KIND===3).CAMERA_TIMESTAMP,stamp);
const timestampSource=source.slice(source.indexOf('function captureTimestamp('),source.indexOf('function frame('));
const clock={Number,Date};vm.createContext(clock);vm.runInContext(timestampSource,clock);
for(const missing of [undefined,null,NaN,Infinity,-1,0])assert.equal(clock.captureTimestamp(missing),'Timestamp unavailable');
assert.equal(clock.captureTimestamp(101),stamp);
t.exports.save({autoPan:0,mode:'original',changes:[]});assert.equal(t.store['camera-auto-pan'],'0');assert.equal(t.store['pome-camera-mode'],'original');
const html=require('../src/pkjs/camera-settings').augment('<html><script>function save(){}</script></html>',{autoPan:3,mode:'natural',cameras:[{name:'<Outside>',id:'x',interval:900}]});
assert(html.includes('camerasPanel'));assert(html.includes('&lt;Outside&gt;'));assert(html.includes('nine newest'));assert(html.includes('readCameraConfig'));assert(html.includes('Original (no dithering)'));
assert(html.includes('id="saveCameras" onclick="save()">Save camera settings'));
new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log('PASS: camera history limit/order, read-only saved selection, stable photo ID/mode, fresh-only manual capture, cancellation, settings persistence and privacy tab');
t=setup([{body:{ok:true}}]);t.exports.save({order:'4432105',changes:[{id:'cam',interval:15}]});
assert.equal(t.exports.order(),'432105');assert(t.requests[0].path.endsWith('interval=15'));
assert(html.includes('value="15">15 seconds'));assert(html.includes('value="900" selected'));
const ordered=require('../src/pkjs/camera-settings').augment('<h2>Light colors</h2><script>function save(){}</script>',{home:{revision:12,items:'432105'.split('').map(k=>({token:Number(k),name:'Section '+k,type:'Section'}))},cameras:[]});
assert(ordered.indexOf('data-section="4"')<ordered.indexOf('data-section="3"'));
assert(ordered.includes('class="home-drag-handle"'));assert(ordered.includes('Drag the handles'));assert(!ordered.includes('onclick="moveSection'));
new vm.Script(ordered.match(/<script>([\s\S]*)<\/script>/)[1]);
const parent={children:[],addEventListener(){},insertBefore(row,other){this.children.splice(this.children.indexOf(row),1);this.children.splice(this.children.indexOf(other),0,row);}};
parent.children='432105'.split('').map(key=>({parentNode:parent,getAttribute:()=>key,get previousElementSibling(){return parent.children[parent.children.indexOf(this)-1];},get nextElementSibling(){return parent.children[parent.children.indexOf(this)+1];}}));
const browser={window:{addEventListener(){}},document:{querySelectorAll:q=>q==='.cameraSchedule'?[]:parent.children,getElementById:id=>id==='sectionOrder'?parent:({value:id==='cameraPan'?'3':'natural'})}};
vm.createContext(browser);vm.runInContext(ordered.match(/<script>([\s\S]*)<\/script>/)[1],browser);
browser.moveSection({parentNode:parent.children[0]},-1);assert.equal(browser.readCameraConfig().home.order.join(''),'432105');
browser.moveSection({parentNode:parent.children[0]},1);assert.equal(browser.readCameraConfig().home.order.join(''),'342105');
browser.moveSection({parentNode:parent.children[1]},-1);assert.equal(browser.readCameraConfig().home.order.join(''),'432105');assert.equal(browser.readCameraConfig().home.revision,12);
const watch=fs.readFileSync('src/c/cameras.c','utf8');
const direct=watch.slice(watch.indexOf('void cameras_capture('),watch.indexOf('#else\nbool cameras_inbox'));
assert(direct.includes('history_mode=false'));assert(direct.includes('request(5,selected_camera)'));assert(!direct.includes('request(4,'));
assert(watch.includes('if(pome_pin_button(buttons[i]))'));
assert(!watch.includes('window_long_click_subscribe(BUTTON_ID_SELECT,700,camera_pin,NULL)'));
console.log('PASS: 15-second refresh, unchanged saved defaults, section ordering and direct camera pin capture');
