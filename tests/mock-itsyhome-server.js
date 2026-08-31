"use strict";

var http = require("http");

var scenes = [
  {name: "Good Morning", kind: "scene", state: {on: false}},
  {name: "Movie Time", kind: "scene", state: {on: true}},
  {name: "Good Night", kind: "scene", state: {on: false}},
  {name: "Living Room Relax", kind: "scene", state: {on: false}}
];

var rooms = [
  {name: "Living Room"},
  {name: "Kitchen"},
  {name: "Bedroom"}
];

var livingRoom = [
  {name: "Living Room Temperature", type: "temperature-sensor", reachable: true,
    state: {temperature: 72}},
  {name: "Living Room Window", type: "contact-sensor", reachable: true,
    state: {detected: false}},
  {name: "Living Room Ceiling", type: "light", reachable: true,
    state: {on: true, brightness: 75}},
  {name: "Living Room Floor Lamp", type: "light", reachable: true,
    state: {on: false, brightness: 50}},
  {name: "Living Room Fan", type: "fan", reachable: true, state: {on: false}},
  {name: "Living Room TV", type: "outlet", reachable: true, state: {on: true}}
];

function json(response, value, status) {
  response.writeHead(status || 200, {"Content-Type": "application/json"});
  response.end(JSON.stringify(value));
}

var server = http.createServer(function(request, response) {
  var path = decodeURIComponent(request.url.split("?")[0]);
  if (path === "/list/favourites") {
    json(response, scenes.slice(0, 2));
  } else if (path === "/list/scenes") {
    json(response, scenes);
  } else if (path === "/list/rooms") {
    json(response, rooms);
  } else if (path === "/info/Living Room") {
    json(response, livingRoom);
  } else if (path.indexOf("/info/") === 0) {
    json(response, []);
  } else if (/^\/(toggle|on|off|brightness|color|speed|scene)\//.test(path)) {
    json(response, {status: "success"});
  } else if (path === "/status") {
    json(response, {status: "success", rooms: rooms.length, devices: livingRoom.length});
  } else {
    json(response, {status: "error", message: "Not found"}, 404);
  }
});

server.listen(18423, "127.0.0.1", function() {
  console.log("Mock Itsyhome server listening on http://127.0.0.1:18423");
});
