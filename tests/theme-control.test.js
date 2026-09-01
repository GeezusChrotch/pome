"use strict";

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");

var stored = {};
var handlers = {};
var sent = [];
var openedUrl = null;
var context = {
  console: {log: function() {}},
  localStorage: {
    getItem: function(key) { return Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null; },
    setItem: function(key, value) { stored[key] = value; }
  },
  Pebble: {
    addEventListener: function(name, callback) { handlers[name] = callback; },
    sendAppMessage: function(payload, success) { sent.push(payload); if (success) success(); },
    openURL: function(url) { openedUrl = url; }
  },
  XMLHttpRequest: function() {},
  setTimeout: function(callback) { callback(); },
  clearTimeout: function() {},
  isFinite: isFinite,
  JSON: JSON,
  Math: Math,
  Error: Error,
  Array: Array,
  String: String
};

vm.createContext(context);
vm.runInContext(fs.readFileSync("src/pkjs/index.js", "utf8"), context);

assert.strictEqual(context.pebbleColor("#000000"), 0xc0);
assert.strictEqual(context.pebbleColor("#ffffff"), 0xff);
assert.strictEqual(context.pebbleColor("#ff0000"), 0xf0);
assert.strictEqual(context.contrastingColor("#fdbf37"), "#000000");
assert.strictEqual(context.contrastingColor("#14213d"), "#ffffff");

var defaults = context.configuredTheme();
assert.strictEqual(defaults.name, "Classic");
assert.strictEqual(defaults.font, "gothic");
assert.strictEqual(defaults.size, "medium");
assert.strictEqual(defaults.icons, true);

var configurationHtml = decodeURIComponent(context.configurationPage().split(",")[1]);
var embeddedScript = configurationHtml.match(/<script>([\s\S]*)<\/script>/);
assert.ok(embeddedScript);
assert.doesNotThrow(function() { new vm.Script(embeddedScript[1]); });
assert.ok(configurationHtml.indexOf('<meta charset="utf-8">') !== -1);
assert.ok(configurationHtml.indexOf("id=\"setupTab\"") !== -1);
assert.ok(configurationHtml.indexOf("id=\"themesTab\"") !== -1);
assert.ok(configurationHtml.indexOf("id=\"preview\"") !== -1);
assert.ok(configurationHtml.indexOf("Font color") !== -1);
assert.ok(configurationHtml.indexOf("Background color") !== -1);
assert.ok(configurationHtml.indexOf("Selection color") !== -1);
assert.ok(configurationHtml.indexOf("Show device icons") !== -1);
assert.ok(configurationHtml.indexOf("Save this theme") !== -1);
assert.ok(configurationHtml.indexOf("function pebbleHex") !== -1);

var customTheme = {
  name: "Amber Night",
  text: "#fdf0d5",
  background: "#14213d",
  selection: "#fca311",
  font: "gothic-bold",
  size: "large",
  icons: false
};
handlers.webviewclosed({
  response: encodeURIComponent(JSON.stringify({
    baseUrl: "https://example.invalid:10443",
    colors: context.DEFAULT_COLORS,
    sections: {favorites: true, scenes: true, rooms: true, sensors: true},
    theme: customTheme,
    themes: [customTheme]
  }))
});

assert.deepStrictEqual(JSON.parse(stored.pomeTheme), customTheme);
assert.deepStrictEqual(JSON.parse(stored.pomeThemes), [customTheme]);
assert.strictEqual(context.configuredTheme().icons, false);

sent = [];
context.sendDisplaySettings();
assert.strictEqual(sent.length, 1);
assert.strictEqual(sent[0].THEME_BACKGROUND, context.pebbleColor(customTheme.background));
assert.strictEqual(sent[0].THEME_TEXT, context.pebbleColor(customTheme.text));
assert.strictEqual(sent[0].THEME_SELECTION, context.pebbleColor(customTheme.selection));
assert.strictEqual(sent[0].THEME_FONT, 1);
assert.strictEqual(sent[0].THEME_SIZE, 2);
assert.strictEqual(sent[0].THEME_ICONS, 0);

handlers.showConfiguration();
assert.ok(/^data:text\/html/.test(openedUrl));

console.log("Theme control tests passed");
