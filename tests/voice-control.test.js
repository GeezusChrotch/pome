"use strict";

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");

var context = {
  console: {log: function() {}},
  localStorage: {getItem: function() { return null; }, setItem: function() {}},
  Pebble: {
    addEventListener: function() {},
    sendAppMessage: function(payload, success) { if (success) success(); },
    openURL: function() {}
  },
  XMLHttpRequest: function() {},
  setTimeout: function(callback) { callback(); },
  clearTimeout: function() {},
  isFinite: isFinite,
  JSON: JSON,
  Math: Math,
  Error: Error,
  Array: Array,
  String: String,
  Date: Date
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("src/pkjs/index.js", "utf8"), context);

var catalog = context.buildVoiceCatalog([
  {name: "Lounge TV", room: "Lounge", type: "switch", reachable: true},
  {name: "Lounge Lights", room: "Lounge", type: "light", reachable: true},
  {name: "Lounge Ceiling", room: "Lounge", type: "light", reachable: true},
  {name: "Lounge Blinds", room: "Lounge", type: "blinds", reachable: true},
  {name: "Nest Temperature", room: "Lounge", type: "temperature-sensor", reachable: true},
  {name: "Den Air", room: "Den", type: "switch", reachable: true},
  {name: "Den Fan", room: "Den", type: "fan", reachable: true}
], [
  {name: "Lounge TV"},
  {name: "Goodnight"}
], [
  {name: "Lounge"},
  {name: "Den"}
]);

function parse(text) {
  var result = context.parseVoiceCommand(text, catalog);
  assert.ok(!result.error, text + ": " + result.error);
  return result;
}

var result = parse("Set Lounge TV");
assert.strictEqual(result.intent.action, "scene");
assert.strictEqual(result.intent.scene, "Lounge TV");

result = parse("Set Lounge TV on");
assert.strictEqual(result.intent.action, "scene");
assert.strictEqual(result.intent.scene, "Lounge TV");

result = parse("Set scene Lounge TV");
assert.strictEqual(result.intent.action, "scene");
assert.strictEqual(result.intent.scene, "Lounge TV");

result = parse("Turn Lounge TV on");
assert.strictEqual(result.intent.action, "power");
assert.strictEqual(result.intent.entity.type, "switch");
assert.strictEqual(result.intent.value, true);

result = parse("Turn lounge lights green");
assert.strictEqual(result.intent.action, "color");
assert.strictEqual(result.intent.entity.type, "light-group");
assert.strictEqual(result.intent.hue, 120);

result = parse("Set the lounge lights to 50 percent");
assert.strictEqual(result.intent.action, "brightness");
assert.strictEqual(result.intent.value, 50);

result = parse("Turn den air on");
assert.strictEqual(result.intent.action, "power");
assert.strictEqual(result.intent.entity.name, "Den Air");

result = parse("Set den fan to 75%");
assert.strictEqual(result.intent.action, "speed");
assert.strictEqual(result.intent.value, 75);

result = parse("Close lounge blinds");
assert.strictEqual(result.intent.action, "blind");
assert.strictEqual(result.intent.value, 1);

result = parse("Slow up lounge blinds");
assert.strictEqual(result.intent.action, "blind");
assert.strictEqual(result.intent.value, 4);

result = parse("Set lounge blinds to 40 percent");
assert.strictEqual(result.intent.action, "position");
assert.strictEqual(result.intent.value, 40);

result = parse("What is lounge temperature?");
assert.strictEqual(result.intent.action, "query");
assert.strictEqual(result.intent.entity.type, "temperature-sensor");

assert.ok(context.parseVoiceCommand("Make the house cozy", catalog).error);
assert.strictEqual(context.voiceSceneIsSensitive("Lounge TV"), false);
assert.strictEqual(context.voiceSceneIsSensitive("Garage Open"), true);

var ambiguousCatalog = context.buildVoiceCatalog([
  {name: "Den Air", room: "Den", type: "switch", reachable: true},
  {name: "Den Air", room: "Den", type: "fan", reachable: true}
], [], [{name: "Den"}]);
assert.ok(context.parseVoiceCommand("Turn den air on", ambiguousCatalog).error);

var paths = [];
var messages = [];
context.apiGet = function(path, callback) {
  paths.push(path);
  callback(null, {status: "ok"});
};
context.send = function(payload) { messages.push(payload); };
context.setDevicePower("Den", "Den Air", "switch", true);
assert.deepStrictEqual(paths, ["/on/Den/Den%20Air"]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(messages)), [{STATUS: "Turned on"}]);

var executedIntent = null;
messages = [];
context.VOICE_CATALOG = catalog;
context.resolveVoiceServiceId = function(intent, done) { done(null); };
context.executeVoiceIntent = function(intent) { executedIntent = intent; };
context.send = function(payload) { messages.push(payload); };
context.handleVoiceTranscript("Set Lounge TV");
assert.strictEqual(executedIntent.action, "scene");
assert.strictEqual(executedIntent.scene, "Lounge TV");
assert.deepStrictEqual(messages, []);

var sensitiveCatalog = context.buildVoiceCatalog([], [{name: "Garage Open"}], []);
context.VOICE_CATALOG = sensitiveCatalog;
executedIntent = null;
messages = [];
context.handleVoiceTranscript("Set Garage Open");
assert.strictEqual(executedIntent, null);
assert.strictEqual(context.PENDING_VOICE_INTENT.action, "scene");
assert.deepStrictEqual(JSON.parse(JSON.stringify(messages)),
  [{VOICE_PROMPT: "Scene\nGarage Open"}]);

console.log("Voice control tests passed");
