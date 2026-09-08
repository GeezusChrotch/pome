'use strict';
var KEY='pomeCameraConnection';
function normalize(value,old){
 old=old||{};
 var url=String(value.url||'').trim().replace(/\/+$/,''),token=String(value.token||'').trim();
 if(!url)return {url:'',token:''};
 var match=/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::([0-9]{1,5}))?$/i.exec(url);
 if(!match||(match[1]&&(Number(match[1])<1||Number(match[1])>65535)))throw new Error('Camera URL must be an HTTPS origin with no path or credentials.');
 if(!token&&url!==old.url)throw new Error('Paste the camera token when changing the camera URL.');
 token=token||old.token;
 if(!token||/[\s\x00-\x1f\x7f]/.test(token))throw new Error('Paste a valid camera token from Connector.');
 return {url:url,token:token};
}
exports.normalize=normalize;
exports.create=function(storage,fallback){
 // One-time migration for an explicitly private local upgrade. Public builds
 // have an empty fallback. Never replace existing pairing or a saved disconnect.
 if(storage.getItem(KEY)==null&&fallback&&fallback.url&&fallback.token){
  storage.setItem(KEY,JSON.stringify(normalize(fallback,{})));
 }
 function read(){try{var saved=JSON.parse(storage.getItem(KEY));if(saved&&typeof saved.url==='string'&&typeof saved.token==='string')return saved;}catch(e){}return fallback||{};}
 function save(value){
  if(!value)return;
  storage.setItem(KEY,JSON.stringify(normalize(value,read())));
 }
 return {read:read,save:save,publicState:function(){var c=read();return {url:c.url||'',paired:!!c.token};}};
};
