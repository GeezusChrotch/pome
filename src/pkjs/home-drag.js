'use strict';
// Serialized into the phone settings page; no external libraries or requests.
exports.install=function installHomeDrag(){
 var list=document.getElementById('sectionOrder'),live=document.getElementById('homeOrderAnnouncement');
 if(!list)return;
 var drag=null,frame=null;
 function announce(row){if(live)live.textContent=row.getAttribute('data-name')+', position '+(Array.prototype.indexOf.call(list.children,row)+1)+' of '+list.children.length;}
 function place(y){
  if(!drag)return;
  var before=null;Array.prototype.some.call(list.children,function(row){if(row===drag.row)return false;var box=row.getBoundingClientRect();if(y<box.top+box.height/2){before=row;return true;}return false;});
  if(drag.row.nextElementSibling!==before)list.insertBefore(drag.row,before);
 }
 function tick(){frame=null;if(!drag)return;var edge=60,h=window.innerHeight,delta=drag.y<edge?-Math.ceil((edge-drag.y)/5):drag.y>h-edge?Math.ceil((drag.y-h+edge)/5):0;
  if(delta){window.scrollBy(0,Math.max(-18,Math.min(18,delta)));place(drag.y);}frame=window.requestAnimationFrame(tick);
 }
 function end(cancel){if(!drag)return;var old=drag;drag=null;if(frame!==null)window.cancelAnimationFrame(frame);frame=null;
  if(cancel)old.original.forEach(function(row){list.appendChild(row);});
  old.row.classList.remove('home-dragging');old.handle.setAttribute('aria-pressed','false');
  if(list.hasPointerCapture&&list.hasPointerCapture(old.id))list.releasePointerCapture(old.id);
  announce(old.row);
 }
 list.addEventListener('pointerdown',function(event){
  var handle=event.target.closest('.home-drag-handle');if(!handle||!list.contains(handle)||drag||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
  event.preventDefault();var row=handle.parentNode;drag={row:row,handle:handle,id:event.pointerId,y:event.clientY,original:Array.prototype.slice.call(list.children)};
  row.classList.add('home-dragging');handle.setAttribute('aria-pressed','true');list.setPointerCapture(event.pointerId);frame=window.requestAnimationFrame(tick);
 });
 list.addEventListener('pointermove',function(event){if(!drag||event.pointerId!==drag.id)return;event.preventDefault();drag.y=event.clientY;place(drag.y);});
 list.addEventListener('pointerup',function(event){if(drag&&event.pointerId===drag.id)end(false);});
 list.addEventListener('pointercancel',function(event){if(drag&&event.pointerId===drag.id)end(true);});
 list.addEventListener('lostpointercapture',function(){if(drag)end(true);});
 window.addEventListener('blur',function(){end(true);});
 list.addEventListener('keydown',function(event){var handle=event.target.closest('.home-drag-handle');if(!handle)return;
  if(event.key==='Escape'){end(true);return;}
  if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
  event.preventDefault();if(drag)return;var row=handle.parentNode,other=event.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;
  if(other)list.insertBefore(event.key==='ArrowUp'?row:other,event.key==='ArrowUp'?other:row);handle.focus();announce(row);
 });
};
