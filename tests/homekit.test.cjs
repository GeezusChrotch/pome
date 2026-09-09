'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const store = {itsyhomeBaseUrl:'http://legacy.invalid:8423'};
const storage = {getItem:k=>store[k]===undefined?null:store[k],setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
let requests=[];
function XHR(){requests.push(this);this.headers={};this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=(k,v)=>this.headers[k]=v;this.send=()=>{};}
const home = require('../src/pkjs/homekit').create(storage,XHR);
let result;
home.request('/status',(e,d)=>result={e,d});
assert.match(result.e.message,/Set up/);assert.equal(requests.length,0,'Must never fall back to old Itsyhome URL');
store.pomeCameraConnection=JSON.stringify({url:'https://connector.example:10550',token:'test-only-token'});
function respond(body,status=200){const r=requests.at(-1);r.status=status;r.responseText=JSON.stringify(body);r.onload();return r;}
home.request('/list/rooms',(e,d)=>result={e,d});
let r=respond([{name:'Lounge'}]);assert.equal(r.method,'GET');assert.equal(r.url,'https://connector.example:10550/home/list/rooms');assert.equal(r.headers.Authorization,'Bearer test-only-token');assert.equal(result.d[0].name,'Lounge');
for(const path of ['/toggle/id','/on/id','/off/id','/brightness/50/id','/color/20/100/id','/speed/75/id','/position/12/id','/scene/Lounge%20TV']){
 home.request(path,(e,d)=>result={e,d});r=respond({status:'success'});assert.equal(r.method,'POST');assert.equal(result.e,null);
}
let calls=0;home.request('/toggle/id',()=>calls++);r=respond({error:'Home access denied'},403);r.onerror();assert.equal(calls,1,'Exactly one callback, no retry after uncertain result');
store.pomeHomeFavorites=JSON.stringify(['Lounge TV']);home.request('/list/favourites',(e,d)=>result={e,d});respond([{name:'Lounge TV',kind:'scene'},{name:'Goodnight',kind:'scene'}]);assert.deepEqual(result.d.map(s=>s.name),['Lounge TV']);
home.request('/status',(e,d)=>result={e,d});respond({error:'Direct HomeKit unavailable'},503);assert.equal(result.e.status,503);assert.match(result.e.message,/unavailable/);
const context={console,localStorage:storage,XMLHttpRequest:XHR,setTimeout,clearTimeout,Pebble:{addEventListener(){},sendAppMessage(p,ok){if(ok)ok();},openURL(){}},require:n=>{
 if(n==='./cameras')return {settings(){},save(v,cb){cb();}};
 if(n==='./home-screen')return {read(){},save(v,cb){cb();}};
 return require('../src/pkjs/'+n.slice(2));
}};
vm.createContext(context);vm.runInContext(fs.readFileSync('src/pkjs/index.js','utf8'),context);
store.pomeShortcutScenes=JSON.stringify(['Lounge TV','Goodnight']);
const html=decodeURIComponent(context.configurationPage({enabled:true,connection:{url:'https://connector.example:10550',paired:true},autoPan:3,mode:'natural',cameras:[]}).split(',').slice(1).join(','));
assert.equal((html.match(/id="cameraUrl"/g)||[]).length,1);
assert.ok(html.indexOf('id="cameraUrl"')<html.indexOf('id="themesPanel"'),'One connection lives on Setup');
assert.ok(!html.includes('test-only-token'));
assert.ok(!html.includes('Itsyhome server URL'));
assert.match(html,/class="homeFavorite" value="Lounge TV" checked/);
assert.match(html,/homeFavorites:Array/);
for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
const previous=requests.length;
store.pomeCameraConnection=JSON.stringify({url:'',token:''});
home.request('/on/id',(e,d)=>result={e,d});assert.equal(requests.length,previous,'Explicit disconnect stops all HomeKit control');
console.log('PASS: direct HomeKit transport, migrated camera credentials, no Itsyhome fallback, POST controls, authenticated reads, favorites, one shared Setup pairing, secret-free HTML and executable settings scripts');
