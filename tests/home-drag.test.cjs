const assert=require('assert'),fs=require('fs'),vm=require('vm');
const events={},windowEvents={},frames=new Map();let nextFrame=0,captured=null,scroll=0;
const list={children:[],addEventListener:(k,f)=>events[k]=f,contains:h=>list.children.includes(h.parentNode),setPointerCapture:id=>captured=id,hasPointerCapture:id=>captured===id,releasePointerCapture:()=>captured=null,
 insertBefore(row,before){this.children.splice(this.children.indexOf(row),1);this.children.splice(before===null?this.children.length:this.children.indexOf(before),0,row);},appendChild(row){this.insertBefore(row,null);}};
const rows=Array.from({length:6},(_,token)=>{const row={token,classList:{add(){},remove(){}},getAttribute:()=>String(token),getBoundingClientRect:()=>({top:list.children.indexOf(row)*50,height:50}),get nextElementSibling(){return list.children[list.children.indexOf(row)+1]||null;},get previousElementSibling(){return list.children[list.children.indexOf(row)-1]||null;}};row.handle={parentNode:row,closest(){return this;},setAttribute(){},focus(){}};return row;});list.children=rows.slice();
const live={},ctx={exports:{},document:{getElementById:id=>id==='sectionOrder'?list:live},window:{innerHeight:300,addEventListener:(k,f)=>windowEvents[k]=f,requestAnimationFrame:f=>(frames.set(++nextFrame,f),nextFrame),cancelAnimationFrame:id=>frames.delete(id),scrollBy:(x,y)=>scroll+=y}};
vm.runInNewContext(fs.readFileSync('src/pkjs/home-drag.js','utf8'),ctx);ctx.exports.install();
const order=()=>list.children.map(r=>r.token).join('');
function event(row,y,id=1){return {target:row.handle,clientY:y,pointerId:id,pointerType:'touch',isPrimary:true,preventDefault(){}};}
events.pointerdown(event(rows[0],20));assert.equal(captured,1);events.pointermove(event(rows[0],130));assert.equal(order(),'120345');events.pointerup(event(rows[0],130));assert.equal(order(),'120345');assert.equal(captured,null);assert.equal(frames.size,0);
events.pointerdown(event(rows[0],120));events.pointermove(event(rows[0],0));assert.equal(order(),'012345');events.pointercancel(event(rows[0],0));assert.equal(order(),'120345');
events.pointerdown(event(rows[1],10));events.pointermove(event(rows[1],290));const tick=[...frames.values()][0];tick();assert(scroll>0);windowEvents.blur();assert.equal(order(),'120345');
events.keydown({...event(rows[0],0),key:'ArrowUp'});assert.equal(order(),'102345');events.keydown({...event(rows[0],0),key:'ArrowDown'});assert.equal(order(),'120345');
events.pointerdown({...event(rows[1],0),pointerType:'mouse',button:2});assert.equal(captured,null);
events.pointerdown(event(rows[1],0));events.pointermove(event(rows[1],280,99));assert.equal(order(),'120345');events.pointerup(event(rows[1],0));
assert(live.textContent.includes('position'));
console.log('PASS: touch drag/drop, cancellation restore, auto-scroll, keyboard accessibility, pointer identity and cleanup');
