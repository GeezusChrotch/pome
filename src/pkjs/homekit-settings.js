'use strict';
function esc(value) { return String(value).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
exports.augment = function(html, scenes, selected) {
  // A temporarily unavailable catalog must not erase saved favorites on Save.
  scenes = scenes.slice();
  selected.forEach(function(name) { if (!scenes.some(function(s) { return (typeof s === 'string' ? s : s.name) === name; })) scenes.push(name); });
  // Reuse camera pairing IDs/storage: upgrades keep their existing credentials.
  // Move the one set of fields into Setup, not a second independent connection.
  var connection = /<h2>Camera connection<\/h2>[\s\S]*?(?=<h2>Camera viewing<\/h2>)/.exec(html);
  if (connection) {
    html = html.replace(connection[0], '');
    var fields = connection[0].replace(/Camera connection/g, 'Connector connection')
      .replace(/Copy the Camera URL and Camera Token[^]*?<\/p>/, 'Copy the URL and token from Connector on your Mac. This single connection handles devices, scenes, sensors, and cameras. Itsyhome is not required.</p>')
      .replace(/Camera URL/g, 'Connector URL').replace(/Camera token/g, 'Connector token').replace(/Camera Token/g, 'Connector Token')
      .replace('Clearing the URL disconnects cameras.', 'Clearing the URL disconnects Pome.');
    html = html.replace('<div id="homeConnection"></div>', fields);
  }
  var favorites = '<details><summary>Favorite scenes</summary><p>Choose the scenes to show in Pome’s Favorites. Apple Home favorites are not exposed by HomeKit.</p>';
  scenes.forEach(function(scene) {
    var name = typeof scene === 'string' ? scene : scene.name;
    if (!name) return;
    favorites += '<label><input type="checkbox" class="homeFavorite" value="' + esc(name) + '"' + (selected.indexOf(name) >= 0 ? ' checked' : '') + '>' + esc(name) + '</label>';
  });
  if (!scenes.length) favorites += '<p>Pair Connector, then reopen settings to load scenes.</p>';
  favorites += '</details>';
  html = html.replace('<h2>Light colors</h2>', favorites + '<h2>Light colors</h2>');
  html = html.replace('baseUrl:value,colors:colors', 'homeFavorites:Array.prototype.filter.call(document.querySelectorAll(".homeFavorite"),function(c){return c.checked;}).map(function(c){return c.value;}),colors:colors');
  return html;
};
