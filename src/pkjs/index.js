var DEFAULT_BASE_URL = "";
var MAX_ITEMS = 64;
var ROOM_LIGHT_COMMAND_DELAY_MS = 700;
var ROOM_LIGHT_MAX_ATTEMPTS = 2;

var COMMAND_LOAD_FAVORITES = 1;
var COMMAND_LOAD_SCENES = 2;
var COMMAND_RUN_SCENE = 3;
var COMMAND_LOAD_ROOMS = 4;
var COMMAND_LOAD_DEVICES = 5;
var COMMAND_TOGGLE_DEVICE = 6;
var COMMAND_SET_BRIGHTNESS = 7;
var COMMAND_SET_COLOR = 8;
var COMMAND_LOAD_COLORS = 9;

var ITEM_KIND_FAVORITE = 1;
var ITEM_KIND_SCENE = 2;
var ITEM_KIND_ROOM = 3;
var ITEM_KIND_DEVICE = 4;
var ITEM_KIND_COLOR = 5;
var ITEM_KIND_SENSOR = 6;
var ITEM_KIND_ROOM_SCENE = 7;

var DEFAULT_COLORS = [
  {name: "Amber", hue: 35, saturation: 100},
  {name: "Red", hue: 0, saturation: 100},
  {name: "Green", hue: 120, saturation: 100},
  {name: "Blue", hue: 240, saturation: 100},
  {name: "Pink", hue: 330, saturation: 100},
  {name: "White", hue: 0, saturation: 0}
];

var COLOR_PALETTE = DEFAULT_COLORS.concat([
  {name: "Orange", hue: 25, saturation: 100},
  {name: "Yellow", hue: 55, saturation: 100},
  {name: "Cyan", hue: 180, saturation: 100},
  {name: "Purple", hue: 280, saturation: 100},
  {name: "Warm White", hue: 35, saturation: 20},
  {name: "Cool White", hue: 210, saturation: 15}
]);

var TOGGLE_SAFE_TYPES = {
  "light": true,
  "switch": true,
  "outlet": true,
  "fan": true,
  "humidifier": true,
  "dehumidifier": true,
  "air-purifier": true
};

function isSensor(item) {
  return item && typeof item.type === "string" && /-sensor$/.test(item.type);
}

function compareByName(left, right) {
  var leftName = (left.name || "").toLowerCase();
  var rightName = (right.name || "").toLowerCase();
  if (leftName < rightName) return -1;
  if (leftName > rightName) return 1;
  var leftOriginal = left.name || "";
  var rightOriginal = right.name || "";
  if (leftOriginal < rightOriginal) return -1;
  if (leftOriginal > rightOriginal) return 1;
  return 0;
}

function displayNameInRoom(name, room) {
  var fullName = name || "";
  var roomName = room || "";
  if (fullName.length <= roomName.length ||
      fullName.substring(0, roomName.length).toLowerCase() !== roomName.toLowerCase()) {
    return fullName;
  }
  var start = roomName.length;
  if (!/[\s\-:/. _]/.test(fullName.charAt(start))) return fullName;
  while (start < fullName.length && /[\s\-:/. _]/.test(fullName.charAt(start))) start += 1;
  return start < fullName.length ? fullName.substring(start) : fullName;
}

function compareByRoomName(room) {
  return function(left, right) {
    return compareByName(
      {name: displayNameInRoom(left.name, room)},
      {name: displayNameInRoom(right.name, room)}
    );
  };
}

function roomScenePrefixes(room) {
  var normalized = (room || "").toLowerCase();
  var prefixes = [normalized];
  if (/ room$/.test(normalized)) prefixes.push(normalized.replace(/ room$/, ""));
  if (normalized === "control room") prefixes.push("cr");
  return prefixes;
}

function sceneBelongsToRoom(scene, room) {
  if (!scene || typeof scene.name !== "string") return false;
  var sceneName = scene.name.toLowerCase();
  var prefixes = roomScenePrefixes(room);
  for (var i = 0; i < prefixes.length; i += 1) {
    if (sceneName === prefixes[i] || sceneName.indexOf(prefixes[i] + " ") === 0) {
      return true;
    }
  }
  return false;
}

function decimal(value, suffix) {
  if (typeof value !== "number" || !isFinite(value)) return null;
  var rounded = Math.round(value * 10) / 10;
  return rounded + suffix;
}

function detectedLabel(type, detected) {
  if (typeof detected !== "boolean") return null;
  if (type === "contact-sensor") return detected ? "Open" : "Closed";
  if (type === "motion-sensor") return detected ? "Motion" : "Clear";
  if (type === "occupancy-sensor") return detected ? "Occupied" : "Clear";
  if (type === "leak-sensor") return detected ? "Leak" : "Dry";
  if (type === "smoke-sensor") return detected ? "Smoke" : "Clear";
  if (type === "carbon-monoxide-sensor") return detected ? "CO detected" : "Clear";
  if (type === "carbon-dioxide-sensor") return detected ? "CO2 detected" : "Clear";
  return detected ? "Detected" : "Clear";
}

function sensorValue(sensor, info) {
  if (!info || info.reachable === false) return "Unavailable";
  var state = info.state || {};
  var formatted = decimal(state.temperature, "\u00b0");
  if (formatted) return formatted;
  formatted = decimal(state.humidity, "%");
  if (formatted) return formatted;
  formatted = decimal(state.lightLevel, " lux");
  if (formatted) return formatted;
  formatted = decimal(state.carbonDioxideLevel, " ppm");
  if (formatted) return formatted;
  formatted = decimal(state.carbonMonoxideLevel, " ppm");
  if (formatted) return formatted;
  formatted = detectedLabel(sensor.type, state.detected);
  if (formatted) return formatted;
  if (state.value !== undefined && state.value !== null) return String(state.value);
  if (state.sensorReading !== undefined && state.sensorReading !== null) {
    return String(state.sensorReading) + (state.sensorUnit || "");
  }
  return "Unknown";
}

function baseUrl() {
  return (localStorage.getItem("itsyhomeBaseUrl") || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function configuredColors() {
  try {
    var saved = JSON.parse(localStorage.getItem("itsyhomeColors") || "null");
    if (Array.isArray(saved) && saved.length === 6) return saved;
  } catch (error) {
    console.log("Invalid saved colors: " + error.message);
  }
  return DEFAULT_COLORS.slice();
}

function configuredSections() {
  var sections = {favorites: true, scenes: true, rooms: true, sensors: true};
  try {
    var saved = JSON.parse(localStorage.getItem("pomeSections") || "null");
    if (saved && typeof saved === "object") {
      sections.favorites = saved.favorites !== false;
      sections.scenes = saved.scenes !== false;
      sections.rooms = saved.rooms !== false;
      sections.sensors = saved.sensors !== false;
    }
  } catch (error) {
    console.log("Invalid saved sections: " + error.message);
  }
  if (!sections.favorites && !sections.scenes && !sections.rooms) sections.favorites = true;
  return sections;
}

function hsvToHex(hue, saturation) {
  var h = ((hue % 360) + 360) % 360;
  var s = Math.max(0, Math.min(100, saturation)) / 100;
  var chroma = s;
  var x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  var red = 0;
  var green = 0;
  var blue = 0;
  if (h < 60) { red = chroma; green = x; }
  else if (h < 120) { red = x; green = chroma; }
  else if (h < 180) { green = chroma; blue = x; }
  else if (h < 240) { green = x; blue = chroma; }
  else if (h < 300) { red = x; blue = chroma; }
  else { red = chroma; blue = x; }
  var match = 1 - chroma;
  function component(value) {
    var hex = Math.round((value + match) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }
  return "#" + component(red) + component(green) + component(blue);
}

function send(payload, onSuccess) {
  var continuation = onSuccess || function() {};
  var attempts = 0;
  function attempt() {
    Pebble.sendAppMessage(payload, continuation, function(error) {
      attempts += 1;
      console.log("AppMessage failed (attempt " + attempts + "): " + JSON.stringify(error));
      if (attempts < 4) {
        setTimeout(attempt, attempts * 150);
      } else {
        continuation();
      }
    });
  }
  attempt();
}

function sendDisplaySettings(done) {
  var sections = configuredSections();
  send({
    "SHOW_FAVORITES": sections.favorites ? 1 : 0,
    "SHOW_SCENES": sections.scenes ? 1 : 0,
    "SHOW_ROOMS": sections.rooms ? 1 : 0,
    "SHOW_SENSORS": sections.sensors ? 1 : 0
  }, done);
}

function apiGet(path, callback) {
  if (!baseUrl()) {
    callback(new Error("Set up in phone app"));
    return;
  }
  var request = new XMLHttpRequest();
  request.timeout = 8000;
  request.onload = function() {
    if (request.status < 200 || request.status >= 300) {
      callback(new Error("Itsyhome HTTP " + request.status));
      return;
    }
    try {
      callback(null, JSON.parse(request.responseText));
    } catch (error) {
      callback(new Error("Invalid Itsyhome response"));
    }
  };
  request.onerror = function() { callback(new Error("Cannot reach Itsyhome")); };
  request.ontimeout = function() { callback(new Error("Itsyhome timed out")); };
  request.open("GET", baseUrl() + path, true);
  request.send();
}

function sendError(error) {
  send({ "ERROR": (error && error.message) || "Unknown error" });
}

function sendColorChoices(done) {
  var colors = configuredColors();
  var index = 0;
  function sendNext() {
    if (index >= colors.length) {
      send({"LIST_DONE": ITEM_KIND_COLOR}, done);
      return;
    }
    var color = colors[index];
    send({
      "ITEM_KIND": ITEM_KIND_COLOR,
      "ITEM_INDEX": index,
      "ITEM_NAME": color.name,
      "ITEM_HUE": color.hue,
      "ITEM_SATURATION": color.saturation
    }, function() {
      index += 1;
      sendNext();
    });
  }
  sendNext();
}

function sendItems(items, kind, done) {
  var filtered = items.filter(function(item) {
    return item && typeof item.name === "string" &&
      (kind !== ITEM_KIND_FAVORITE || item.kind === "scene");
  }).slice(0, MAX_ITEMS);

  var index = 0;
  function sendNext() {
    if (index >= filtered.length) {
      send({ "LIST_DONE": kind }, done);
      return;
    }
    var item = filtered[index];
    var payload = {
      "ITEM_KIND": kind,
      "ITEM_INDEX": index,
      "ITEM_NAME": item.name.substring(0, 63),
      "ITEM_ACTIVE": item.state && item.state.on ? 1 : 0,
      "ITEM_TYPE": (item.type || "").substring(0, 23),
      "ITEM_REACHABLE": item.reachable === false ? 0 : 1
    };
    if (kind === ITEM_KIND_SENSOR) {
      payload.ITEM_VALUE = (item.displayValue || "Unknown").substring(0, 31);
    }
    index += 1;
    send(payload, sendNext);
  }
  sendNext();
}

function loadList(path, kind) {
  apiGet(path, function(error, items) {
    if (error) {
      sendError(error);
      return;
    }
    if (!Array.isArray(items)) {
      sendError(new Error("Unexpected Itsyhome list"));
      return;
    }
    sendItems(items, kind);
  });
}

function runScene(name) {
  apiGet("/scene/" + encodeURIComponent(name), function(error, response) {
    if (error) {
      sendError(error);
      return;
    }
    if (response && response.status === "error") {
      sendError(new Error(response.message || "Scene failed"));
      return;
    }
    send({ "STATUS": "Scene complete" });
  });
}

function loadDevices(room) {
  apiGet("/info/" + encodeURIComponent(room), function(error, items) {
    if (error) {
      sendError(error);
      return;
    }
    if (!Array.isArray(items)) {
      sendError(new Error("Unexpected Itsyhome list"));
      return;
    }

    apiGet("/list/scenes", function(sceneError, allScenes) {
      var roomNameComparator = compareByRoomName(room);
      var sensors = configuredSections().sensors ?
        items.filter(isSensor).sort(roomNameComparator).slice(0, MAX_ITEMS) : [];
      var devices = items.filter(function(item) { return !isSensor(item); })
        .sort(roomNameComparator).slice(0, MAX_ITEMS);
      var roomScenes = sceneError || !Array.isArray(allScenes) ? [] : allScenes.filter(
        function(scene) { return sceneBelongsToRoom(scene, room); }
      ).sort(compareByName).slice(0, MAX_ITEMS);

      sensors.forEach(function(sensor) {
        sensor.displayValue = sensorValue(sensor, sensor);
      });

      function sendRoomContents() {
        sendItems(sensors, ITEM_KIND_SENSOR, function() {
          sendItems(roomScenes, ITEM_KIND_ROOM_SCENE, function() {
            sendItems(devices, ITEM_KIND_DEVICE);
          });
        });
      }

      sendRoomContents();
    });
  });
}

function toggleDevice(room, name, type) {
  if (type === "light-group") {
    controlRoomLights(room, "toggle");
    return;
  }
  if (!TOGGLE_SAFE_TYPES[type]) {
    sendError(new Error("Device is read only"));
    return;
  }
  apiGet("/toggle/" + encodeURIComponent(room) + "/" + encodeURIComponent(name),
    function(error, response) {
      if (error) {
        sendError(error);
        return;
      }
      if (response && response.status === "error") {
        sendError(new Error(response.message || "Toggle failed"));
        return;
      }
      send({ "STATUS": "Device toggled" });
    });
}

function roomLights(room, callback) {
  apiGet("/info/" + encodeURIComponent(room), function(error, items) {
    if (error) {
      callback(error);
      return;
    }
    if (!Array.isArray(items)) {
      callback(new Error("Unexpected Itsyhome list"));
      return;
    }
    var lights = items.filter(function(item) {
      return item && item.type === "light" && item.reachable !== false &&
        typeof item.name === "string";
    });
    if (lights.length === 0) {
      callback(new Error("No reachable lights"));
      return;
    }
    callback(null, lights);
  });
}

function runLightCommands(lights, pathForLight, successStatus) {
  var index = 0;
  var failures = 0;

  function finish() {
    if (failures > 0) {
      sendError(new Error("Updated " + (lights.length - failures) + " of " +
        lights.length + " lights"));
    } else {
      send({"STATUS": successStatus});
    }
  }

  function runNext() {
    if (index >= lights.length) {
      finish();
      return;
    }
    var path = pathForLight(lights[index]);
    var attempts = 0;
    function attempt() {
      attempts += 1;
      apiGet(path, function(error, response) {
        var failed = error || (response && response.status === "error");
        if (failed && attempts < ROOM_LIGHT_MAX_ATTEMPTS) {
          setTimeout(attempt, ROOM_LIGHT_COMMAND_DELAY_MS);
          return;
        }
        if (failed) failures += 1;
        index += 1;
        setTimeout(runNext, ROOM_LIGHT_COMMAND_DELAY_MS);
      });
    }
    attempt();
  }
  runNext();
}

function controlRoomLights(room, action, value, saturation) {
  roomLights(room, function(error, lights) {
    if (error) {
      sendError(error);
      return;
    }
    var encodedRoom = encodeURIComponent(room);
    if (action === "toggle") {
      var anyOn = lights.some(function(light) {
        return light.state && light.state.on === true;
      });
      var powerAction = anyOn ? "off" : "on";
      runLightCommands(lights, function(light) {
        return "/" + powerAction + "/" + encodedRoom + "/" +
          encodeURIComponent(light.name);
      }, anyOn ? "All lights off" : "All lights on");
    } else if (action === "brightness") {
      runLightCommands(lights, function(light) {
        return "/brightness/" + value + "/" + encodedRoom + "/" +
          encodeURIComponent(light.name);
      }, "Room brightness set");
    } else if (action === "color") {
      runLightCommands(lights, function(light) {
        return "/color/" + value + "/" + saturation + "/" + encodedRoom + "/" +
          encodeURIComponent(light.name);
      }, "Room color set");
    }
  });
}

function setBrightness(room, name, value, type) {
  if (type === "light-group") {
    controlRoomLights(room, "brightness", value);
    return;
  }
  apiGet("/brightness/" + value + "/" + encodeURIComponent(room) + "/" +
    encodeURIComponent(name), function(error, response) {
      if (error) {
        sendError(error);
        return;
      }
      if (response && response.status === "error") {
        sendError(new Error(response.message || "Brightness failed"));
        return;
      }
      send({"STATUS": "Brightness set"});
    });
}

function setColor(room, name, hue, saturation, type) {
  if (type === "light-group") {
    controlRoomLights(room, "color", hue, saturation);
    return;
  }
  apiGet("/color/" + hue + "/" + saturation + "/" + encodeURIComponent(room) +
    "/" + encodeURIComponent(name), function(error, response) {
      if (error) {
        sendError(error);
        return;
      }
      if (response && response.status === "error") {
        sendError(new Error(response.message || "Color failed"));
        return;
      }
      send({"STATUS": "Color set"});
    });
}

function configurationPage() {
  var current = baseUrl().replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
  var selectedColors = configuredColors();
  var selectedSections = configuredSections();
  var namedColors = {};
  COLOR_PALETTE.forEach(function(color) {
    namedColors[hsvToHex(color.hue, color.saturation)] = color.name;
  });
  var colorFields = "";
  for (var slot = 0; slot < 6; slot += 1) {
    colorFields += '<label>Color ' + (slot + 1) +
      ' <span>' + selectedColors[slot].name + '</span></label><input type="color" id="c' +
      slot + '" value="' + hsvToHex(selectedColors[slot].hue, selectedColors[slot].saturation) +
      '">';
  }
  function checked(value) { return value ? " checked" : ""; }
  var sectionFields = '<div class="toggle"><label><input type="checkbox" id="favorites"' +
    checked(selectedSections.favorites) + '>Favorites</label></div>' +
    '<div class="toggle"><label><input type="checkbox" id="scenes"' +
    checked(selectedSections.scenes) + '>Scenes</label></div>' +
    '<div class="toggle"><label><input type="checkbox" id="rooms"' +
    checked(selectedSections.rooms) + '>Rooms</label></div>' +
    '<div class="toggle"><label><input type="checkbox" id="sensors"' +
    checked(selectedSections.sensors) + '>Sensors inside rooms</label></div>';
  var html = '<!doctype html><html><meta name="viewport" content="width=device-width">' +
    '<style>body{font:17px -apple-system;margin:24px;background:#f2f2f7;color:#111}' +
    'h1{font-size:28px}h2{font-size:20px;margin-top:28px}label{display:block;font-weight:600}' +
    'label span{float:right;color:#777;font-weight:400}input{box-sizing:border-box;width:100%;' +
    'padding:14px;margin:8px 0 18px;' +
    'border:1px solid #bbb;border-radius:10px;background:white;font-size:16px}' +
    'input[type=color]{height:58px;padding:5px}' +
    '.toggle{background:white;border:1px solid #bbb;border-radius:10px;padding:14px;' +
    'margin:8px 0}.toggle label{font-weight:500}.toggle input{width:auto;margin:0 12px 0 0}' +
    'button{width:100%;padding:14px;border:0;border-radius:10px;background:#34a853;color:white;' +
    'font-size:18px;font-weight:600}p{color:#666;font-size:14px}a{color:#0878d1}</style>' +
    '<h1>Pome</h1><label>Itsyhome server URL</label><input id="url" ' +
    'placeholder="https://your-mac.tailnet.ts.net:10443" value="' + current + '">' +
    '<p>Enter your Itsyhome webhook URL. Use a private Tailscale HTTPS URL for home and ' +
    'away access, or a local HTTP URL for LAN-only use.</p>' +
    '<p><a href="https://github.com/GeezusChrotch/pome#setup">Setup instructions</a></p>' +
    '<h2>Show in Pome</h2><p>With one main section enabled, Pome opens it directly.</p>' +
    sectionFields + '<h2>Light colors</h2>' +
    '<p>Tap a swatch to open the iPhone color wheel.</p>' + colorFields +
    '<button onclick="save()">Save</button><script>var names=' + JSON.stringify(namedColors) +
    ';function color(hex,index){var r=parseInt(hex.slice(1,3),16)/255;' +
    'var g=parseInt(hex.slice(3,5),16)/255;var b=parseInt(hex.slice(5,7),16)/255;' +
    'var max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0;' +
    'if(d){if(max===r){h=60*(((g-b)/d)%6);}else if(max===g){h=60*((b-r)/d+2);}' +
    'else{h=60*((r-g)/d+4);}}if(h<0)h+=360;var s=max===0?0:d/max;' +
    'var key=hex.toLowerCase();return{name:names[key]||("Custom "+(index+1)),' +
    'hue:Math.round(h),saturation:Math.round(s*100)};}function save(){' +
    'var value=document.getElementById(\'url\').value.replace(/\\/+$/,\'\');' +
    'if(!/^https?:\\/\\//i.test(value)){alert(\'Enter a complete http:// or https:// URL.\');' +
    'return;}' +
    'var sections={favorites:document.getElementById(\'favorites\').checked,' +
    'scenes:document.getElementById(\'scenes\').checked,' +
    'rooms:document.getElementById(\'rooms\').checked,' +
    'sensors:document.getElementById(\'sensors\').checked};' +
    'if(!sections.favorites&&!sections.scenes&&!sections.rooms){' +
    'alert(\'Choose at least one of Favorites, Scenes, or Rooms.\');return;}var colors=[];' +
    'for(var i=0;i<6;i++){colors.push(color(document.getElementById(\'c\'+i).value,i));}' +
    'location.href=\'pebblejs://close#\'+' +
    'encodeURIComponent(JSON.stringify({baseUrl:value,colors:colors,sections:sections}));}' +
    '</script></html>';
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}

Pebble.addEventListener("ready", function() {
  console.log("Pome ready" + (baseUrl() ? ": server configured" : ": setup required"));
  sendDisplaySettings(function() {
    sendColorChoices(function() {
      if (!baseUrl()) {
        sendError(new Error("Set up in phone app"));
        return;
      }
      loadList("/list/favourites", ITEM_KIND_FAVORITE);
    });
  });
});

Pebble.addEventListener("appmessage", function(event) {
  var payload = event.payload || {};
  switch (payload.COMMAND) {
    case COMMAND_LOAD_FAVORITES:
      loadList("/list/favourites", ITEM_KIND_FAVORITE);
      break;
    case COMMAND_LOAD_SCENES:
      loadList("/list/scenes", ITEM_KIND_SCENE);
      break;
    case COMMAND_RUN_SCENE:
      runScene(payload.ITEM_NAME);
      break;
    case COMMAND_LOAD_ROOMS:
      loadList("/list/rooms", ITEM_KIND_ROOM);
      break;
    case COMMAND_LOAD_DEVICES:
      loadDevices(payload.ITEM_ROOM);
      break;
    case COMMAND_TOGGLE_DEVICE:
      toggleDevice(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_TYPE);
      break;
    case COMMAND_SET_BRIGHTNESS:
      setBrightness(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_VALUE,
        payload.ITEM_TYPE);
      break;
    case COMMAND_SET_COLOR:
      setColor(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_HUE,
        payload.ITEM_SATURATION, payload.ITEM_TYPE);
      break;
    case COMMAND_LOAD_COLORS:
      sendColorChoices();
      break;
    default:
      sendError(new Error("Unknown command"));
  }
});

Pebble.addEventListener("showConfiguration", function() {
  Pebble.openURL(configurationPage());
});

Pebble.addEventListener("webviewclosed", function(event) {
  if (!event.response) return;
  try {
    var config = JSON.parse(decodeURIComponent(event.response));
    if (config.baseUrl) {
      localStorage.setItem("itsyhomeBaseUrl", config.baseUrl);
    }
    if (Array.isArray(config.colors) && config.colors.length === 6) {
      localStorage.setItem("itsyhomeColors", JSON.stringify(config.colors));
    }
    if (config.sections) {
      localStorage.setItem("pomeSections", JSON.stringify(config.sections));
    }
    sendDisplaySettings(function() {
      sendColorChoices(function() { send({ "STATUS": "Settings saved" }); });
    });
  } catch (error) {
    console.log("Configuration error: " + error.message);
  }
});
