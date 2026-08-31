"use strict";

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");

var timeoutDelays = [];
var context = {
  console: {log: function() {}},
  localStorage: {getItem: function() { return null; }, setItem: function() {}},
  Pebble: {
    addEventListener: function() {},
    sendAppMessage: function(payload, success) { if (success) success(); },
    openURL: function() {}
  },
  XMLHttpRequest: function() {},
  setTimeout: function(callback, delay) { timeoutDelays.push(delay); callback(); },
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

assert.strictEqual(context.baseUrl(), "");
var setupError = null;
context.apiGet("/status", function(error) { setupError = error; });
assert.strictEqual(setupError.message, "Set up in phone app");

var configurationHtml = decodeURIComponent(context.configurationPage().split(",")[1]);
assert.ok(configurationHtml.indexOf("How to find your URL") !== -1);
assert.ok(configurationHtml.indexOf("Settings &gt; Webhooks/CLI") !== -1);
assert.ok(configurationHtml.indexOf(
  "tailscale serve --bg --https=10443 localhost:8423") !== -1);
assert.ok(configurationHtml.indexOf("tailscale serve status") !== -1);
assert.ok(configurationHtml.indexOf("do not use Tailscale Funnel") !== -1);
assert.ok(configurationHtml.indexOf("https://github.com/GeezusChrotch/pome#setup") !== -1);

assert.strictEqual(context.displayNameInRoom("Bathroom Globe", "Bathroom"), "Globe");
assert.strictEqual(context.displayNameInRoom("Bathroom - Vanity", "Bathroom"), "Vanity");
assert.strictEqual(context.displayNameInRoom("bathroom: Sensor", "Bathroom"), "Sensor");
assert.strictEqual(context.displayNameInRoom("Bathroom", "Bathroom"), "Bathroom");
assert.strictEqual(context.displayNameInRoom("BathroomScale", "Bathroom"), "BathroomScale");

function runCase(lights, invoke, expectedPaths, expectedStatus) {
  var paths = [];
  var messages = [];
  timeoutDelays = [];
  context.apiGet = function(path, callback) {
    paths.push(path);
    callback(null, path.indexOf("/info/") === 0 ? lights : {status: "ok"});
  };
  context.send = function(payload) { messages.push(payload); };
  invoke();
  assert.deepStrictEqual(paths, expectedPaths);
  assert.strictEqual(JSON.stringify(messages), JSON.stringify([{STATUS: expectedStatus}]));
  assert.strictEqual(timeoutDelays.length, expectedPaths.length - 1);
  timeoutDelays.forEach(function(delay) { assert.strictEqual(delay, 700); });
}

var mixedLights = [
  {name: "Ceiling One", type: "light", reachable: true, state: {on: true}},
  {name: "Ceiling Two", type: "light", reachable: true, state: {on: false}},
  {name: "Offline", type: "light", reachable: false, state: {on: true}},
  {name: "Fan", type: "fan", reachable: true, state: {on: true}}
];

runCase(mixedLights, function() {
  context.toggleDevice("Living Room", "All Lights", "light-group");
}, [
  "/info/Living%20Room",
  "/off/Living%20Room/Ceiling%20One",
  "/off/Living%20Room/Ceiling%20Two"
], "All lights off");

runCase([
  {name: "One", type: "light", reachable: true, state: {on: false}},
  {name: "Two", type: "light", reachable: true, state: {on: false}}
], function() {
  context.toggleDevice("Den", "All Lights", "light-group");
}, ["/info/Den", "/on/Den/One", "/on/Den/Two"], "All lights on");

runCase(mixedLights, function() {
  context.setBrightness("Living Room", "All Lights", 75, "light-group");
}, [
  "/info/Living%20Room",
  "/brightness/75/Living%20Room/Ceiling%20One",
  "/brightness/75/Living%20Room/Ceiling%20Two"
], "Room brightness set");

runCase(mixedLights, function() {
  context.setColor("Living Room", "All Lights", 35, 100, "light-group");
}, [
  "/info/Living%20Room",
  "/color/35/100/Living%20Room/Ceiling%20One",
  "/color/35/100/Living%20Room/Ceiling%20Two"
], "Room color set");

var retryPaths = [];
var retryMessages = [];
var firstLightAttempts = 0;
timeoutDelays = [];
context.apiGet = function(path, callback) {
  retryPaths.push(path);
  if (path === "/info/Den") {
    callback(null, [
      {name: "One", type: "light", reachable: true, state: {on: false}},
      {name: "Two", type: "light", reachable: true, state: {on: false}}
    ]);
  } else if (path === "/on/Den/One" && firstLightAttempts++ === 0) {
    callback(new Error("Temporary failure"));
  } else {
    callback(null, {status: "ok"});
  }
};
context.send = function(payload) { retryMessages.push(payload); };
context.toggleDevice("Den", "All Lights", "light-group");
assert.deepStrictEqual(retryPaths, [
  "/info/Den", "/on/Den/One", "/on/Den/One", "/on/Den/Two"
]);
assert.strictEqual(JSON.stringify(retryMessages),
  JSON.stringify([{STATUS: "All lights on"}]));
assert.deepStrictEqual(timeoutDelays, [700, 700, 700]);

console.log("Group control tests passed");
