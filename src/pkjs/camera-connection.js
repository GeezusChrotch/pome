'use strict';
var KEY='pomeCameraConnection';
exports.create=function(storage,fallback){
 function read(){try{var saved=JSON.parse(storage.getItem(KEY));if(saved&&typeof saved.url==='string'&&typeof saved.token==='string')return saved;}catch(e){}return fallback||{};}
 function save(value){
  if(!value)return;
  var old=read(),url=String(value.url||'').trim().replace(/\/+$/,''),token=String(value.token||'').trim();
  if(!url){storage.setItem(KEY,JSON.stringify({url:'',token:''}));return;}
  if(!/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::[0-9]{1,5})?$/i.test(url))throw new Error('Camera URL must be an HTTPS origin with no path or credentials.');
  if(!token&&url!==old.url)throw new Error('Paste the camera token when changing the camera URL.');
  token=token||old.token;
  if(!token||/[\s\x00-\x1f\x7f]/.test(token))throw new Error('Paste a valid camera token from Connector.');
  storage.setItem(KEY,JSON.stringify({url:url,token:token}));
 }
 return {read:read,save:save,publicState:function(){var c=read();return {url:c.url||'',paired:!!c.token};}};
};
