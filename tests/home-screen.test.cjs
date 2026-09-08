const assert=require('assert'),fs=require('fs'),vm=require('vm');
function setup(responses){const sent=[],timers=[],events={},failures=[];const context={exports:{},Number,Array,setTimeout:f=>(timers.push(f),timers.length),clearTimeout:()=>{},Pebble:{addEventListener:(k,f)=>events[k]=f,sendAppMessage:(p,ok,fail)=>{sent.push(p);failures.push(fail);ok();if(responses.length)events.appmessage({payload:Object.assign({HOME_TRANSACTION:p.HOME_TRANSACTION},responses.shift())});}}};vm.runInNewContext(fs.readFileSync('src/pkjs/home-screen.js','utf8'),context);return {api:context.exports,sent,timers,failures,deliver:p=>events.appmessage({payload:p})};}
let rows=[6,0,1,2,3,4,5].map((token,index)=>({HOME_INDEX:index,HOME_REV:7,HOME_TOKEN:token,ITEM_NAME:token===6?'Lounge':'Section '+token,ITEM_TYPE:token===6?'Room':'Section'}));
let t=setup([{HOME_INDEX:-2,HOME_REV:7},{HOME_INDEX:-1,HOME_COUNT:7,HOME_REV:7},...rows]),result;
t.api.read([{id:'camera1',name:'Catio'}],r=>result=r);assert.equal(result.items.length,7);assert.equal(result.items[0].type,'Room');assert.equal(t.sent[0].ITEM_NAME,'Catio');assert.equal(result.revision,7);
t=setup([{HOME_INDEX:-1,HOME_COUNT:6,HOME_REV:7},{HOME_INDEX:0,HOME_ERROR:'Home Screen changed. Reopen settings.'}]);t.api.read([],r=>result=r);assert(result.error.includes('changed'));
t=setup([{HOME_SAVED:1,HOME_REV:8}]);t.api.save({revision:7,order:[0,6,1,2,3,4,5]},e=>result=e);assert.equal(result,null);assert.equal(t.sent[0].HOME_ORDER,'0,6,1,2,3,4,5');
t=setup([{HOME_SAVED:0,HOME_ERROR:'Home Screen changed. Reopen settings.'}]);t.api.save({revision:7,order:[0,1,2,3,4,5]},e=>result=e);assert(result.includes('changed'));
t=setup([]);t.api.save({revision:7,order:[0,1,2,3,4,4]},e=>result=e);assert(result.includes('Invalid'));assert.equal(t.sent.length,0);
t=setup([]);t.api.read([],r=>result=r);t.timers[0]();assert(result.error.includes('Open Pome'));
console.log('PASS: live Home Screen catalog, camera names, revision conflicts, mixed ordering, malformed orders and offline fallback');

// Real transport is asynchronous: overlapping readers must share one transaction chain.
t=setup([]);let first,second;
t.api.read([],r=>first=r);t.api.read([],r=>second=r);assert.equal(t.sent.length,1);assert(!first&&!second);
const firstRequest=t.sent[0];
t.deliver({HOME_TRANSACTION:firstRequest.HOME_TRANSACTION,HOME_INDEX:-1,HOME_COUNT:6,HOME_REV:7});
assert.equal(t.sent.length,2);
t.failures[0]();t.timers[0](); // late transport failure / stale timeout cannot finish the next exchange
t.deliver({HOME_TRANSACTION:firstRequest.HOME_TRANSACTION,HOME_INDEX:-1,HOME_COUNT:6,HOME_REV:7});
assert.equal(t.sent.length,2);assert(!first&&!second);
for(let i=0;i<6;i++){
 const packet=t.sent.at(-1);
 t.deliver({HOME_TRANSACTION:packet.HOME_TRANSACTION,HOME_INDEX:i,HOME_REV:7,HOME_TOKEN:i,ITEM_NAME:'Section '+i,ITEM_TYPE:''});
}
assert.equal(first.items.length,6);assert.strictEqual(first,second);assert.equal(t.sent.length,7);
// Save operations are queued rather than returning a permanent busy state.
t=setup([]);let savedA,savedB;const order={revision:7,order:[0,1,2,3,4,5]};
t.api.save(order,e=>savedA=e);t.api.save(order,e=>savedB=e);assert.equal(t.sent.length,1);
t.deliver({HOME_TRANSACTION:t.sent[0].HOME_TRANSACTION,HOME_SAVED:1});assert.equal(savedA,null);assert.equal(t.sent.length,2);
t.deliver({HOME_TRANSACTION:t.sent[1].HOME_TRANSACTION,HOME_SAVED:1});assert.equal(savedB,null);
assert(!fs.readFileSync('src/pkjs/home-screen.js','utf8').includes('Home Screen settings are busy'));
console.log('PASS: concurrent readers coalesce, saves queue, and late replies/failures/timeouts cannot corrupt the next request');
