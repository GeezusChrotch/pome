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
assert.ok(configurationHtml.indexOf(">Setup instructions</a>") !== -1);
assert.ok(configurationHtml.indexOf("https://github.com/GeezusChrotch/pome#setup") !== -1);
assert.ok(configurationHtml.indexOf("tailscale serve --bg") === -1);

var duplicateItems = [
  {name: "Studio Fan", type: "fan", room: "Studio", state: {speed: 100}},
  {name: "Studio Fan", type: "light", room: "Studio", state: {on: true}}
];
context.apiGet = function(path, callback) {
  assert.strictEqual(path, "/debug/Studio%20Fan");
  callback(null, [
    {serviceTypeLabel: "fan", serviceId: "FAN-UUID", room: "Studio"},
    {serviceTypeLabel: "light", serviceId: "LIGHT-UUID", room: "Studio"}
  ]);
};
var enrichmentFinished = false;
context.enrichDuplicateServices(duplicateItems, "Studio", function() {
  enrichmentFinished = true;
});
assert.strictEqual(enrichmentFinished, true);
assert.strictEqual(duplicateItems[0].serviceId, "FAN-UUID");
assert.strictEqual(duplicateItems[0].pomeDisplayName, "Studio Fan (Fan)");
assert.strictEqual(duplicateItems[1].serviceId, "LIGHT-UUID");
assert.strictEqual(duplicateItems[1].pomeDisplayName, "Studio Fan (Light)");

assert.strictEqual(context.displayNameInRoom("Bathroom Globe", "Bathroom"), "Globe");
assert.strictEqual(context.displayNameInRoom("Bathroom - Vanity", "Bathroom"), "Vanity");
assert.strictEqual(context.displayNameInRoom("bathroom: Sensor", "Bathroom"), "Sensor");
assert.strictEqual(context.displayNameInRoom("Bathroom", "Bathroom"), "Bathroom");
assert.strictEqual(context.displayNameInRoom("BathroomScale", "Bathroom"), "BathroomScale");

var orderedDevices = [
  {name: "Office Zebra Plug", type: "outlet"},
  {name: "Office Alpha Switch", type: "switch"},
  {name: "Office Zebra Light", type: "light"},
  {name: "Office Alpha Fan", type: "fan"},
  {name: "Office Alpha Light", type: "light"},
  {name: "Office Alpha Plug", type: "outlet"},
  {name: "Office Blinds", type: "blinds"}
].sort(context.compareByDeviceTypeAndRoomName("Office"));
assert.deepStrictEqual(orderedDevices.map(function(item) { return item.name; }), [
  "Office Alpha Light", "Office Zebra Light", "Office Alpha Fan",
  "Office Alpha Switch", "Office Alpha Plug", "Office Zebra Plug", "Office Blinds"
]);

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

var rejectedPaths = [];
var rejectedMessages = [];
context.apiGet = function(path) { rejectedPaths.push(path); };
context.send = function(payload) { rejectedMessages.push(payload); };
context.setBrightness("Office", "Desk Switch", 75, "switch");
context.setColor("Office", "Desk Switch", 35, 100, "switch");
assert.deepStrictEqual(rejectedPaths, []);
assert.strictEqual(rejectedMessages.length, 2);
assert.ok(rejectedMessages[0].ERROR.indexOf("only available for lights") !== -1);
assert.ok(rejectedMessages[1].ERROR.indexOf("only available for lights") !== -1);

var fanPaths = [];
var fanMessages = [];
context.apiGet = function(path, callback) {
  fanPaths.push(path);
  callback(null, {status: "ok"});
};
context.send = function(payload) { fanMessages.push(payload); };
context.setSpeed("Living Room", "Ceiling Fan", 75, "fan");
assert.deepStrictEqual(fanPaths, ["/speed/75/Living%20Room/Ceiling%20Fan"]);
assert.strictEqual(JSON.stringify(fanMessages), JSON.stringify([{STATUS: "Speed set"}]));

fanPaths = [];
fanMessages = [];
context.setSpeed("Studio", "Studio Fan", 100, "fan", "FAN-UUID");
assert.deepStrictEqual(fanPaths, ["/speed/100/FAN-UUID"]);
assert.strictEqual(JSON.stringify(fanMessages), JSON.stringify([{STATUS: "Speed set"}]));

fanPaths = [];
fanMessages = [];
context.toggleDevice("Holiday", "Holiday Festivus", "switch", "SWITCH-UUID");
assert.deepStrictEqual(fanPaths, ["/toggle/SWITCH-UUID"]);
assert.strictEqual(JSON.stringify(fanMessages), JSON.stringify([{STATUS: "Device toggled"}]));

fanPaths = [];
fanMessages = [];
context.setSpeed("Office", "Desk Switch", 75, "switch");
assert.deepStrictEqual(fanPaths, []);
assert.ok(fanMessages[0].ERROR.indexOf("only available for fans") !== -1);

function runBlindCase(action, currentPosition, expectedPosition) {
  var paths = [];
  var messages = [];
  context.apiGet = function(path, callback) {
    paths.push(path);
    if (path === "/info/BLIND-UUID") {
      callback(null, {name: "Office Blinds", type: "blinds",
        state: {position: currentPosition}});
    } else {
      callback(null, {status: "success"});
    }
  };
  context.send = function(payload) { messages.push(payload); };
  context.setBlindPosition("Office", "Office Blinds", action, "blinds", "BLIND-UUID");
  var expectedPaths = action < 2
    ? ["/position/" + expectedPosition + "/BLIND-UUID"]
    : ["/info/BLIND-UUID", "/position/" + expectedPosition + "/BLIND-UUID"];
  assert.deepStrictEqual(paths, expectedPaths);
  assert.strictEqual(JSON.stringify(messages),
    JSON.stringify([{STATUS: "Position set to " + expectedPosition + "%"}]));
}

runBlindCase(0, 42, 100);
runBlindCase(1, 42, 0);
runBlindCase(2, 42, 47);
runBlindCase(3, 42, 37);
runBlindCase(4, 42, 43);
runBlindCase(5, 42, 41);
runBlindCase(6, 42, 52);
runBlindCase(7, 42, 32);
runBlindCase(6, 97, 100);
runBlindCase(7, 3, 0);

var blindPaths = [];
var blindMessages = [];
context.apiGet = function(path) { blindPaths.push(path); };
context.send = function(payload) { blindMessages.push(payload); };
context.setBlindPosition("Office", "Desk Switch", 0, "switch", "SWITCH-UUID");
assert.deepStrictEqual(blindPaths, []);
assert.ok(blindMessages[0].ERROR.indexOf("only available for blinds") !== -1);

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
