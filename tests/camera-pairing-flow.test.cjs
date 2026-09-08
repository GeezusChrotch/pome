const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('src/pkjs/cameras.js','utf8');
function setup(){
 const store={},requests=[],pending=[];
 function XHR(){this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=(key,value)=>this.auth=value;this.send=()=>{requests.push({method:this.method,url:this.url,auth:this.auth});pending.push(this);};}
 const context={module:{exports:{}},require:n=>n==='./camera-private-config'?{}:require('../src/pkjs/'+n.slice(2)),XMLHttpRequest:XHR,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},Pebble:{addEventListener(){},sendAppMessage(){}},setTimeout(){}};
 vm.runInNewContext(source,context);
 return {store,requests,api:context.module.exports,reply(status,body){const xhr=pending.shift();assert(xhr);xhr.status=status;xhr.responseText=JSON.stringify(body);xhr.onload();}};
}
let t=setup(),result='waiting';
t.api.save({connection:{url:'https://mac.example:10550',token:'test-token'},changes:[{id:'old-host-camera',interval:15}]},error=>result=error);
assert.equal(result,'waiting');assert.deepEqual(t.requests,[{method:'GET',url:'https://mac.example:10550/camera-settings',auth:'Bearer test-token'}]);
t.reply(200,{cameras:[]});assert.equal(result,null);assert.equal(t.requests.length,1,'old catalog cannot change new host schedules');
let state;t.api.settings(s=>state=s);t.reply(200,{cameras:[{id:'camera',name:'Camera',interval:0}]});assert.equal(state.connection.paired,true);assert(!JSON.stringify(state).includes('test-token'));
const changes=[{id:'camera',interval:15},{id:'second',interval:900}];result='waiting';
t.api.save({connection:{url:'https://mac.example:10550',token:''},changes},error=>result=error);
assert.equal(result,'waiting');t.reply(200,{ok:true});assert.equal(result,'waiting');t.reply(200,{ok:true});assert.equal(result,null);assert.equal(changes.length,2,'save must not mutate configuration payload');
assert(t.requests.at(-1).url.endsWith('/schedule/second?interval=900'));
t.api.save({connection:{url:'https://other.example:10550',token:'new-token'}},error=>result=error);t.reply(401,{error:'Unauthorized'});assert(result.includes('connection check failed'));assert(t.store['camera-save-error'].includes('Unauthorized'));
assert.equal(JSON.parse(t.store.pomeCameraConnection).token,'new-token','failed check preserves pairing for correction, not false success');
assert.throws(()=>t.api.save({connection:{url:'https://third.example',token:''}}),/changing/);
const before=t.requests.length;t.api.save({connection:{url:'',token:''}},error=>result=error);assert.equal(result,null);assert.equal(t.requests.length,before);
console.log('PASS: first-user pairing, authenticated connection check, secret-free settings, host-change schedule isolation, async save acknowledgement and honest failures');
