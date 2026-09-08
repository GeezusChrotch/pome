'use strict';
var pending=null,queue=[],sequence=0,readers=null;
function finish(job,err,data){
 if(pending!==job)return;
 pending=null;clearTimeout(job.timer);job.done(err,data);pump();
}
function pump(){
 if(pending||!queue.length)return;
 var job=pending=queue.shift();
 job.timer=setTimeout(function(){finish(job,'Open Pome on the watch, then reopen settings to reorder the Home Screen.');},8000);
 Pebble.sendAppMessage(job.packet,function(){},function(){finish(job,'Cannot reach Pome on the watch. Reopen settings to try again.');});
}
function exchange(packet,done){
 packet.HOME_TRANSACTION=++sequence;
 queue.push({packet:packet,done:done});pump();
}
Pebble.addEventListener('appmessage',function(e){
 var p=e.payload||{},job=pending;
 if(!job||p.HOME_TRANSACTION!==job.packet.HOME_TRANSACTION)return;
 if(job.packet.HOME_ORDER!==undefined ? p.HOME_SAVED===undefined : p.HOME_INDEX!==job.packet.HOME_REQUEST)return;
 finish(job,p.HOME_ERROR||null,p);
});
exports.read=function(cameras,done){
 if(readers){readers.push(done);return;}
 readers=[done];
 function complete(value){var callbacks=readers;readers=null;callbacks.forEach(function(cb){cb(value);});}
 var names=(cameras||[]).slice(),items=[],revision=0,count=0;
 function fail(err){complete({error:err});}
 function start(){exchange({HOME_REQUEST:-1},function(err,p){if(err)return fail(err);count=p.HOME_COUNT;revision=p.HOME_REV;if(!Number.isInteger(count)||count<6||count>66)return fail('Invalid Home Screen response');next();});}
 function next(){if(items.length===count){complete({items:items,revision:revision});return;}
  exchange({HOME_REQUEST:items.length,HOME_REV:revision},function(err,p){if(err)return fail(err);if(p.HOME_REV!==revision||p.HOME_INDEX!==items.length||!Number.isInteger(p.HOME_TOKEN)||p.HOME_TOKEN<0||p.HOME_TOKEN>65||items.some(function(i){return i.token===p.HOME_TOKEN;}))return fail('Home Screen changed. Reopen settings.');items.push({token:p.HOME_TOKEN,name:p.ITEM_NAME,type:p.ITEM_TYPE});next();});
 }
 function rename(){if(!names.length){start();return;}var c=names.shift();exchange({HOME_REQUEST:-2,ITEM_ID:c.id,ITEM_NAME:String(c.name).slice(0,63)},function(err){if(err)return fail(err);rename();});}
 rename();
};
exports.save=function(home,done){
 if(!home){done(null);return;}
 if(!Array.isArray(home.order)||home.order.length<6||home.order.length>66||!Number.isInteger(home.revision)){done('Invalid Home Screen settings');return;}
 var seen={};for(var i=0;i<home.order.length;i++){var token=home.order[i];if(!Number.isInteger(token)||token<0||token>65||seen[token]){done('Invalid Home Screen order');return;}seen[token]=true;}
 exchange({HOME_ORDER:home.order.join(','),HOME_REV:home.revision},function(err,p){done(err||(!p.HOME_SAVED?'Home Screen order was not saved':null));});
};
