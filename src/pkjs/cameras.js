'use strict';
var config = {}; try { config=require('./camera-private-config'); } catch(e) {}
var connection = require('./camera-connection').create(localStorage,config);
var camerasEnabled=config.experimental===true;
var generation = 0, platform = 'emery';
var cameraSettings = require('./camera-settings');
var pipeline='natural';
function sectionOrder(value){var result='';String(value||'012345').split('').forEach(function(c){if('012345'.indexOf(c)>=0&&result.indexOf(c)<0)result+=c;});'012345'.split('').forEach(function(c){if(result.indexOf(c)<0)result+=c;});return result;}
function imageMode(){var m=localStorage.getItem('pome-camera-mode');return ['natural','high-contrast','original'].indexOf(m)>=0?m:'natural';}

function autoPan(){var n=Number(localStorage.getItem('camera-auto-pan'));return localStorage.getItem('camera-auto-pan')!==null&&[0,1,2,3,5,10,15,30].indexOf(n)>=0?n:3;}
function request(method, path, callback) {
  if(!camerasEnabled){callback('Cameras are experimental and unavailable in this public release.');return;}
  var config=connection.read();
  var xhr = new XMLHttpRequest(), called = false;
  function done(error, data) { if (!called) { called = true; callback(error,data); } }
  if(!config.url||!config.token){callback('Camera connector is not configured');return;}
  xhr.open(method, config.url + path, true);
  xhr.timeout = 12000;
  xhr.setRequestHeader('Authorization', 'Bearer ' + config.token);
  xhr.onload = function() {
    var data; try { data=JSON.parse(xhr.responseText); } catch(e) { done('Invalid server response'); return; }
    if(xhr.status < 200 || xhr.status >= 300) { done(data.error || ('HTTP '+xhr.status)); return; }
    done(null,data);
  };
  xhr.onerror=function(){done('Cannot reach Mac. Check Tailscale.');};
  xhr.ontimeout=function(){done('Mac connection timed out');};
  xhr.send();
}
function send(rid, packet, next) {
  if(rid !== generation) return;
  packet.RID=rid;
  var mapped={};Object.keys(packet).forEach(function(k){mapped['CAMERA_'+k]=packet[k];});
  Pebble.sendAppMessage(mapped,function(){if(rid===generation && next) next();},function(){
    // Stop rather than sending later chunks after a missing chunk.
    if(rid===generation) generation = -1;
  });
}
function error(rid,message){send(rid,{KIND:6,ERROR:String(message).slice(0,95)});}
function list(rid,page) {
  request('GET','/cameras',function(err,data){
    if(rid!==generation)return;
    if(err){error(rid,err);return;}
    var cameras=data.cameras || [], pages=Math.max(1,Math.ceil(cameras.length/10));
    page=Math.max(0,Math.min(pages-1,page));
    var rows=cameras.slice(page*10,page*10+10), index=0;
    function next(){
      if(index>=rows.length){send(rid,{KIND:2,COUNT:rows.length,PAGE:page,PAGES:pages});return;}
      var c=rows[index];
      send(rid,{KIND:1,INDEX:index++,NAME:c.name.slice(0,60),ID:c.id,AGE:c.age},next);
    }
    next();
  });
}
function decode(base64){
  var alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',out=[],bits=0,value=0;
  for(var i=0;i<base64.length;i++){
    if(base64[i]==='=')break;
    var n=alphabet.indexOf(base64[i]); if(n<0)throw new Error('Invalid pixels');
    value=(value<<6)|n;bits+=6;
    if(bits>=8){bits-=8;out.push((value>>bits)&255);}
  }
  return out;
}
function captureTimestamp(seconds){
  if(!Number.isFinite(seconds)||seconds<=0)return 'Timestamp unavailable';
  var date=new Date(seconds*1000);
  if(!Number.isFinite(date.getTime()))return 'Timestamp unavailable';
  function pad(n){return n<10?'0'+n:String(n);}
  return (date.getHours()%12||12)+':'+pad(date.getMinutes())+(date.getHours()<12?' AM':' PM');
}
function frame(rid,id,photo,freshAfter){
  var started=Date.now(), queued=false;
  function get(){
    if(rid!==generation)return;
    request('GET','/frame/'+encodeURIComponent(id)+'?platform='+platform+'&mode='+imageMode()+(photo?'&image='+encodeURIComponent(photo):''),function(err,data){
      if(rid!==generation)return;
      if(err){
        if(err!=='No prepared image yet'){error(rid,err);return;}
        if(Date.now()-started>30000){error(rid,'Camera not ready. Try again shortly.');return;}
        if(!queued){queued=true;request('POST','/refresh/'+encodeURIComponent(id),function(e){if(e)error(rid,e);else setTimeout(get,1000);});}
        else setTimeout(get,1000);
        return;
      }
      var pixels;
      if(freshAfter!==undefined && (data.image!==photo || !Number.isFinite(data.snapshotAt) || data.snapshotAt<freshAfter)){
        error(rid,'Camera returned an old image. Try Capture now again.');return;
      }
      try {pixels=decode(data.pixels);}catch(e){error(rid,e.message);return;}
      var nativeH=platform==='emery'?228:168,byteLimit=platform==='emery'?110000:48000;
      if(data.encoding!=='gcolor6'||!Number.isInteger(data.width)||data.width<1||data.width>2048||data.height!==nativeH||pixels.length!==Math.ceil(data.width*data.height*6/8)||pixels.length>byteLimit){error(rid,'Invalid native image dimensions');return;}
      var offset=0;
      send(rid,{KIND:3,W:data.width,H:data.height,TOTAL:pixels.length,AGE:data.age,TIMESTAMP:captureTimestamp(data.snapshotAt),AUTO_PAN:autoPan()},function chunk(){
        if(offset>=pixels.length){send(rid,{KIND:5});return;}
        var end=Math.min(offset+900,pixels.length),packet={KIND:4,OFFSET:offset,DATA:pixels.slice(offset,end)};
        offset=end;send(rid,packet,chunk);
      });
    });
  }
  get();
}

Pebble.addEventListener('appmessage',function(event){
  var raw=event.payload;if(raw.CAMERA_CMD===undefined)return;
  var p={};Object.keys(raw).forEach(function(k){if(k.indexOf('CAMERA_')===0)p[k.slice(7)]=raw[k];});generation=p.RID;
  platform=p.W===144?'basalt':'emery';
  if(p.CMD===1)list(generation,p.PAGE||0);
  if(p.CMD===2)frame(generation,p.ID,p.PHOTO);
  if(p.CMD===4)history(generation,p.ID);
  if(p.CMD===5)capture(generation,p.ID);
  // CMD 3 cancels a previous transfer without waking any camera.
});

function ageText(seconds){seconds=Math.max(0,seconds);function pad(n){return n<10?'0'+n:String(n);}return pad(Math.floor(seconds/3600))+':'+pad(Math.floor(seconds/60)%60)+':'+pad(seconds%60);}
function history(rid,id){
 request('GET','/history/'+encodeURIComponent(id),function(err,data){
  if(rid!==generation)return;if(err){error(rid,err);return;}
  var rows=data.images.slice(0,9),i=0;
  function next(){if(i>=rows.length){send(rid,{KIND:2,COUNT:rows.length,PAGE:0,PAGES:1});return;}
   var img=rows[i];send(rid,{KIND:1,INDEX:i,NAME:i===0?'Newest snapshot':'Snapshot '+(i+1),ID:img.id,AGE:img.age},function(){i++;next();});}next();
 });
}
function capture(rid,id){
 var began=Date.now()/1000;
 request('POST','/refresh/'+encodeURIComponent(id),function(err,result){
  if(rid!==generation)return;if(err){error(rid,err);return;}
  if(!result.requestID){error(rid,'Update the Mac camera helper first.');return;}
  var lastState='';
  function poll(){if(rid!==generation)return;
   if(Date.now()/1000-began>40){error(rid,'Fresh capture timed out. Saved images are unchanged.');return;}
   request('GET','/capture/'+encodeURIComponent(id)+'?request='+encodeURIComponent(result.requestID),function(e,data){
    if(rid!==generation)return;if(e){error(rid,e);return;}
    if(data.state==='failed'){error(rid,data.error||'Camera capture failed');return;}
    if(data.state==='ready'){
     if(typeof data.image!=='string'||!data.image||!Number.isFinite(data.requestedAt)||!Number.isFinite(data.snapshotAt)||data.snapshotAt<data.requestedAt){error(rid,'Fresh capture not verified. Update the Mac camera helper.');return;}
     frame(rid,id,data.image,data.requestedAt);return;
    }
    if(data.state!==lastState){lastState=data.state;send(rid,{KIND:8,ERROR:data.state==='queued'?'Waiting for another manual capture…':'Waiting for camera…'},function(){setTimeout(poll,400);});}
    else setTimeout(poll,400);
   });
  }poll();
 });
}
module.exports={
 order:function(){return sectionOrder(localStorage.getItem('pome-section-order'));},
 settings: function(done){request('GET','/camera-settings',function(err,data){done({enabled:camerasEnabled,connection:connection.publicState(),order:sectionOrder(localStorage.getItem('pome-section-order')),autoPan:autoPan(),mode:imageMode(),cameras:err?[]:data.cameras,error:err||localStorage.getItem('camera-save-error')});});},
 save:function(value){
  if(!value)return;
  var previousConnection=connection.read();
  if(camerasEnabled)connection.save(value.connection);
  var currentConnection=connection.read();
  var connectionChanged=previousConnection.url!==currentConnection.url||previousConnection.token!==currentConnection.token;
  if(connectionChanged)generation=-1;
  if(typeof value.order==='string')localStorage.setItem('pome-section-order',sectionOrder(value.order));
  if([0,1,2,3,5,10,15,30].indexOf(value.autoPan)>=0)localStorage.setItem('camera-auto-pan',String(value.autoPan));
  if(['natural','high-contrast','original'].indexOf(value.mode)>=0)localStorage.setItem('pome-camera-mode',value.mode);
  // A catalog fetched from the old server must never configure the new one.
  var changes=!connectionChanged&&Array.isArray(value.changes)?value.changes:[];
  function next(){if(!changes.length)return;var c=changes.shift();if(typeof c.id!=='string'||[-1,0,15,30,60,300,900,3600].indexOf(c.interval)<0)return;
   request('POST','/schedule/'+encodeURIComponent(c.id)+'?interval='+c.interval,function(err){if(err){localStorage.setItem('camera-save-error',err);error(generation,'Camera settings save failed; reopen settings.');return;}localStorage.removeItem('camera-save-error');next();});
  }next();
 }
};
