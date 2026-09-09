'use strict';
// Keep existing menu/voice contracts, but never send controls to Itsyhome.
exports.create = function(storage, XHR) {
  var connection = require('./camera-connection').create(storage, {});
  function favorites() {
    try { var value = JSON.parse(storage.getItem('pomeHomeFavorites')); return Array.isArray(value) ? value : []; }
    catch (e) { return []; }
  }
  function request(path, callback) {
    var config = connection.read();
    if (!config.url || !config.token) { callback(new Error('Set up in phone app')); return; }
    if (path === '/list/favourites') {
      request('/list/scenes', function(error, scenes) {
        if (error) { callback(error); return; }
        var selected = favorites();
        callback(null, scenes.filter(function(s) { return selected.indexOf(s.id) >= 0 || selected.indexOf(s.name) >= 0; }));
      });
      return;
    }
    var read = /^\/(status$|list\/|info\/|debug\/)/.test(path);
    var xhr = new XHR(), called = false;
    function done(error, data) { if (!called) { called = true; callback(error, data); } }
    xhr.open(read ? 'GET' : 'POST', config.url + '/home' + path, true);
    xhr.timeout = 13000;
    xhr.setRequestHeader('Authorization', 'Bearer ' + config.token);
    xhr.onload = function() {
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { done(new Error('Invalid Connector response')); return; }
      if (xhr.status < 200 || xhr.status >= 300) {
        var error = new Error(data.error || data.message || ('Connector HTTP ' + xhr.status));
        error.status = xhr.status; done(error); return;
      }
      done(null, data);
    };
    xhr.onerror = function() { done(new Error('Cannot reach Connector. Check Tailscale.')); };
    xhr.ontimeout = function() { done(new Error('Connector timed out; refresh before retrying.')); };
    xhr.send();
  }
  return {request: request, favorites: favorites, url: function() { return connection.read().url || ''; }};
};
