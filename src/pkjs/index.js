var DEFAULT_BASE_URL = "";
var MAX_ITEMS = 64;
var ROOM_LIGHT_COMMAND_DELAY_MS = 700;
var ROOM_LIGHT_MAX_ATTEMPTS = 2;
var BLIND_POSITION_CACHE_TTL_MS = 30000;
var BLIND_POSITION_CACHE = {};
var BLIND_ACTION_QUEUES = {};
var VOICE_CATALOG_CACHE_TTL_MS = 120000;
var VOICE_CATALOG = null;
var PENDING_VOICE_INTENT = null;

var COMMAND_LOAD_FAVORITES = 1;
var COMMAND_LOAD_SCENES = 2;
var COMMAND_RUN_SCENE = 3;
var COMMAND_LOAD_ROOMS = 4;
var COMMAND_LOAD_DEVICES = 5;
var COMMAND_TOGGLE_DEVICE = 6;
var COMMAND_SET_BRIGHTNESS = 7;
var COMMAND_SET_COLOR = 8;
var COMMAND_LOAD_COLORS = 9;
var COMMAND_SET_SPEED = 10;
var COMMAND_SET_POSITION = 11;
var COMMAND_PARSE_VOICE = 12;
var COMMAND_EXECUTE_VOICE = 13;

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

var DEFAULT_THEME = {
  name: "Classic",
  text: "#000000",
  background: "#ffffff",
  selection: "#000000",
  font: "gothic",
  size: "medium",
  icons: true
};

var THEME_FONTS = {gothic: 0, "gothic-bold": 1, serif: 2};
var THEME_SIZES = {small: 0, medium: 1, large: 2};

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

var DEVICE_TYPE_ORDER = {
  "light": 0,
  "fan": 1,
  "switch": 2,
  "outlet": 3,
  "plug": 3
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

function compareByDeviceTypeAndRoomName(room) {
  var nameComparator = compareByRoomName(room);
  return function(left, right) {
    var leftRank = Object.prototype.hasOwnProperty.call(DEVICE_TYPE_ORDER, left.type) ?
      DEVICE_TYPE_ORDER[left.type] : 4;
    var rightRank = Object.prototype.hasOwnProperty.call(DEVICE_TYPE_ORDER, right.type) ?
      DEVICE_TYPE_ORDER[right.type] : 4;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (leftRank === 4) {
      var leftType = left.type || "";
      var rightType = right.type || "";
      if (leftType < rightType) return -1;
      if (leftType > rightType) return 1;
    }
    return nameComparator(left, right);
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

function validHexColor(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ?
    value.toLowerCase() : fallback;
}

function normalizeTheme(theme) {
  var value = theme && typeof theme === "object" ? theme : {};
  return {
    name: typeof value.name === "string" && value.name.trim() ?
      value.name.trim().substring(0, 32) : DEFAULT_THEME.name,
    text: validHexColor(value.text, DEFAULT_THEME.text),
    background: validHexColor(value.background, DEFAULT_THEME.background),
    selection: validHexColor(value.selection, DEFAULT_THEME.selection),
    font: Object.prototype.hasOwnProperty.call(THEME_FONTS, value.font) ?
      value.font : DEFAULT_THEME.font,
    size: Object.prototype.hasOwnProperty.call(THEME_SIZES, value.size) ?
      value.size : DEFAULT_THEME.size,
    icons: value.icons !== false
  };
}

function configuredTheme() {
  try {
    return normalizeTheme(JSON.parse(localStorage.getItem("pomeTheme") || "null"));
  } catch (error) {
    console.log("Invalid saved theme: " + error.message);
    return normalizeTheme(DEFAULT_THEME);
  }
}

function configuredThemes() {
  try {
    var saved = JSON.parse(localStorage.getItem("pomeThemes") || "[]");
    if (Array.isArray(saved)) return saved.slice(0, 20).map(normalizeTheme);
  } catch (error) {
    console.log("Invalid saved themes: " + error.message);
  }
  return [];
}

function pebbleColor(hex) {
  var color = validHexColor(hex, "#000000");
  var red = Math.round(parseInt(color.slice(1, 3), 16) * 3 / 255);
  var green = Math.round(parseInt(color.slice(3, 5), 16) * 3 / 255);
  var blue = Math.round(parseInt(color.slice(5, 7), 16) * 3 / 255);
  return 0xc0 | (red << 4) | (green << 2) | blue;
}

function contrastingColor(hex) {
  var color = validHexColor(hex, "#000000");
  var red = parseInt(color.slice(1, 3), 16);
  var green = parseInt(color.slice(3, 5), 16);
  var blue = parseInt(color.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150 ? "#000000" : "#ffffff";
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
  var theme = configuredTheme();
  send({
    "SHOW_FAVORITES": sections.favorites ? 1 : 0,
    "SHOW_SCENES": sections.scenes ? 1 : 0,
    "SHOW_ROOMS": sections.rooms ? 1 : 0,
    "SHOW_SENSORS": sections.sensors ? 1 : 0,
    "THEME_BACKGROUND": pebbleColor(theme.background),
    "THEME_TEXT": pebbleColor(theme.text),
    "THEME_SELECTION": pebbleColor(theme.selection),
    "THEME_SELECTION_TEXT": pebbleColor(contrastingColor(theme.selection)),
    "THEME_FONT": THEME_FONTS[theme.font],
    "THEME_SIZE": THEME_SIZES[theme.size],
    "THEME_ICONS": theme.icons ? 1 : 0
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
    if (item.serviceId) payload.ITEM_ID = item.serviceId.substring(0, 39);
    if (item.pomeDisplayName) {
      payload.ITEM_DISPLAY_NAME = item.pomeDisplayName.substring(0, 63);
    }
    if (kind === ITEM_KIND_SENSOR) {
      payload.ITEM_VALUE = (item.displayValue || "Unknown").substring(0, 31);
    }
    index += 1;
    send(payload, sendNext);
  }
  sendNext();
}

function duplicateTypeLabel(type) {
  return String(type || "Device").split("-").map(function(part) {
    return part ? part.charAt(0).toUpperCase() + part.slice(1) : part;
  }).join(" ");
}

function enrichDuplicateServices(items, room, done) {
  var groups = {};
  items.forEach(function(item) {
    if (!item || typeof item.name !== "string") return;
    var key = item.name.toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  var duplicates = Object.keys(groups).map(function(key) { return groups[key]; })
    .filter(function(group) { return group.length > 1; });
  var groupIndex = 0;

  function nextGroup() {
    if (groupIndex >= duplicates.length) {
      done();
      return;
    }
    var group = duplicates[groupIndex++];
    var typeCounts = {};
    group.forEach(function(item) {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });
    var typeIndexes = {};
    group.forEach(function(item) {
      typeIndexes[item.type] = (typeIndexes[item.type] || 0) + 1;
      var suffix = duplicateTypeLabel(item.type);
      if (typeCounts[item.type] > 1) suffix += " " + typeIndexes[item.type];
      item.pomeDisplayName = item.name + " (" + suffix + ")";
    });

    apiGet("/debug/" + encodeURIComponent(group[0].name), function(error, response) {
      var details = error ? [] : (Array.isArray(response) ? response : [response]);
      var used = {};
      group.forEach(function(item) {
        for (var index = 0; index < details.length; index += 1) {
          var detail = details[index] || {};
          if (used[index] || detail.serviceTypeLabel !== item.type ||
              (detail.room && room && detail.room.toLowerCase() !== room.toLowerCase())) {
            continue;
          }
          if (typeof detail.serviceId === "string") item.serviceId = detail.serviceId;
          used[index] = true;
          break;
        }
      });
      nextGroup();
    });
  }
  nextGroup();
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

    enrichDuplicateServices(items, room, function() {
      apiGet("/list/scenes", function(sceneError, allScenes) {
        var roomNameComparator = compareByRoomName(room);
        var sensors = configuredSections().sensors ?
          items.filter(isSensor).sort(roomNameComparator).slice(0, MAX_ITEMS) : [];
        var devices = items.filter(function(item) { return !isSensor(item); })
          .sort(compareByDeviceTypeAndRoomName(room)).slice(0, MAX_ITEMS);
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
  });
}

function encodedDeviceTarget(room, name, serviceId) {
  return serviceId ? encodeURIComponent(serviceId) :
    encodeURIComponent(room) + "/" + encodeURIComponent(name);
}

function toggleDevice(room, name, type, serviceId) {
  if (type === "light-group") {
    controlRoomLights(room, "toggle");
    return;
  }
  if (!TOGGLE_SAFE_TYPES[type]) {
    sendError(new Error("Device is read only"));
    return;
  }
  apiGet("/toggle/" + encodedDeviceTarget(room, name, serviceId),
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

function setDevicePower(room, name, type, turnOn, serviceId) {
  if (type === "light-group") {
    controlRoomLights(room, turnOn ? "on" : "off");
    return;
  }
  if (!TOGGLE_SAFE_TYPES[type]) {
    sendError(new Error("Device cannot be controlled by voice"));
    return;
  }
  var action = turnOn ? "on" : "off";
  apiGet("/" + action + "/" + encodedDeviceTarget(room, name, serviceId),
    function(error, response) {
      if (error) {
        sendError(error);
        return;
      }
      if (response && response.status === "error") {
        sendError(new Error(response.message || "Power command failed"));
        return;
      }
      send({"STATUS": turnOn ? "Turned on" : "Turned off"});
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
    enrichDuplicateServices(items, room, function() {
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
    if (action === "toggle") {
      var anyOn = lights.some(function(light) {
        return light.state && light.state.on === true;
      });
      var powerAction = anyOn ? "off" : "on";
      runLightCommands(lights, function(light) {
        return "/" + powerAction + "/" +
          encodedDeviceTarget(room, light.name, light.serviceId);
      }, anyOn ? "All lights off" : "All lights on");
    } else if (action === "on" || action === "off") {
      runLightCommands(lights, function(light) {
        return "/" + action + "/" +
          encodedDeviceTarget(room, light.name, light.serviceId);
      }, action === "on" ? "All lights on" : "All lights off");
    } else if (action === "brightness") {
      runLightCommands(lights, function(light) {
        return "/brightness/" + value + "/" +
          encodedDeviceTarget(room, light.name, light.serviceId);
      }, "Room brightness set");
    } else if (action === "color") {
      runLightCommands(lights, function(light) {
        return "/color/" + value + "/" + saturation + "/" +
          encodedDeviceTarget(room, light.name, light.serviceId);
      }, "Room color set");
    }
  });
}

function setBrightness(room, name, value, type, serviceId) {
  if (type === "light-group") {
    controlRoomLights(room, "brightness", value);
    return;
  }
  if (type !== "light") {
    sendError(new Error("Brightness is only available for lights"));
    return;
  }
  apiGet("/brightness/" + value + "/" + encodedDeviceTarget(room, name, serviceId),
    function(error, response) {
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

function setColor(room, name, hue, saturation, type, serviceId) {
  if (type === "light-group") {
    controlRoomLights(room, "color", hue, saturation);
    return;
  }
  if (type !== "light") {
    sendError(new Error("Color is only available for lights"));
    return;
  }
  apiGet("/color/" + hue + "/" + saturation + "/" +
    encodedDeviceTarget(room, name, serviceId), function(error, response) {
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

function setSpeed(room, name, value, type, serviceId) {
  if (type !== "fan") {
    sendError(new Error("Speed is only available for fans"));
    return;
  }
  apiGet("/speed/" + value + "/" + encodedDeviceTarget(room, name, serviceId),
    function(error, response) {
      if (error) {
        sendError(error);
        return;
      }
      if (response && response.status === "error") {
        sendError(new Error(response.message || "Speed failed"));
        return;
      }
      send({"STATUS": "Speed set"});
    });
}

function blindPosition(response) {
  var items = Array.isArray(response) ? response : [response];
  for (var i = 0; i < items.length; i += 1) {
    var item = items[i];
    if (!item || !item.state) continue;
    var rawPosition = item.state.position;
    if (rawPosition === null || rawPosition === undefined || rawPosition === "") continue;
    var position = Number(rawPosition);
    if (isFinite(position)) return position;
  }
  return null;
}

function cachedBlindPosition(target) {
  var cached = BLIND_POSITION_CACHE[target];
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > BLIND_POSITION_CACHE_TTL_MS) {
    delete BLIND_POSITION_CACHE[target];
    return null;
  }
  return cached.position;
}

function rememberBlindPosition(target, position) {
  BLIND_POSITION_CACHE[target] = {position: position, updatedAt: Date.now()};
}

function enqueueBlindAction(target, operation) {
  var queue = BLIND_ACTION_QUEUES[target] || [];
  BLIND_ACTION_QUEUES[target] = queue;
  queue.push(operation);
  if (queue.length > 1) return;

  function runNext() {
    if (!queue.length) {
      delete BLIND_ACTION_QUEUES[target];
      return;
    }
    queue[0](function() {
      queue.shift();
      runNext();
    });
  }
  runNext();
}

function setBlindAbsolutePosition(room, name, position, type, serviceId) {
  if (type !== "blinds") {
    sendError(new Error("Position is only available for blinds"));
    return;
  }
  var target = encodedDeviceTarget(room, name, serviceId);
  var clamped = Math.max(0, Math.min(100, Math.round(Number(position))));
  rememberBlindPosition(target, clamped);
  apiGet("/position/" + clamped + "/" + target, function(error, response) {
    if (error) {
      delete BLIND_POSITION_CACHE[target];
      sendError(error);
      return;
    }
    if (response && response.status === "error") {
      delete BLIND_POSITION_CACHE[target];
      sendError(new Error(response.message || "Position failed"));
      return;
    }
    send({"STATUS": "Position set to " + clamped + "%"});
  });
}

function setBlindPosition(room, name, action, type, serviceId) {
  if (type !== "blinds") {
    sendError(new Error("Position is only available for blinds"));
    return;
  }

  var actions = [
    {position: 100},
    {position: 0},
    {delta: 5},
    {delta: -5},
    {delta: 1},
    {delta: -1},
    {delta: 10},
    {delta: -10}
  ];
  var selected = actions[Number(action)];
  if (!selected) {
    sendError(new Error("Unknown blind action"));
    return;
  }

  var target = encodedDeviceTarget(room, name, serviceId);
  enqueueBlindAction(target, function(done) {
    function fail(error) {
      delete BLIND_POSITION_CACHE[target];
      sendError(error);
      done();
    }

    function applyPosition(position) {
      var clamped = Math.max(0, Math.min(100, Math.round(position)));
      rememberBlindPosition(target, clamped);
      apiGet("/position/" + clamped + "/" + target, function(error, response) {
        if (error) {
          fail(error);
          return;
        }
        if (response && response.status === "error") {
          fail(new Error(response.message || "Position failed"));
          return;
        }
        send({"STATUS": "Position set to " + clamped + "%"});
        done();
      });
    }

    if (selected.position !== undefined) {
      applyPosition(selected.position);
      return;
    }

    var cachedPosition = cachedBlindPosition(target);
    if (cachedPosition !== null) {
      applyPosition(cachedPosition + selected.delta);
      return;
    }

    apiGet("/info/" + target, function(error, response) {
      if (error) {
        fail(error);
        return;
      }
      if (response && response.status === "error") {
        fail(new Error(response.message || "Position unavailable"));
        return;
      }
      var position = blindPosition(response);
      if (position === null) {
        fail(new Error("Blind position unavailable"));
        return;
      }
      applyPosition(position + selected.delta);
    });
  });
}

function normalizeVoice(text) {
  return String(text || "").toLowerCase().replace(/[\u2018\u2019']/g, "")
    .replace(/[^a-z0-9%]+/g, " ").replace(/\s+/g, " ").replace(/^ | $/g, "");
}

function voicePhraseContains(text, phrase) {
  var normalizedText = " " + normalizeVoice(text) + " ";
  var normalizedPhrase = normalizeVoice(phrase);
  return normalizedPhrase && normalizedText.indexOf(" " + normalizedPhrase + " ") !== -1;
}

function pushUnique(list, value) {
  if (value && list.indexOf(value) === -1) list.push(value);
}

function voiceTypeAliases(type) {
  var aliases = {
    "light": ["light", "lights", "lamp", "lamps"],
    "light-group": ["light", "lights", "all lights"],
    "fan": ["fan", "fans"],
    "switch": ["switch", "switches"],
    "outlet": ["outlet", "outlets", "plug", "plugs"],
    "blinds": ["blind", "blinds", "shade", "shades"],
    "air-purifier": ["air", "air purifier", "purifier"],
    "humidifier": ["humidifier"],
    "dehumidifier": ["dehumidifier"],
    "humidifier-dehumidifier": ["humidifier", "dehumidifier"],
    "heater-cooler": ["air", "air conditioner", "ac", "heater", "heat"],
    "thermostat": ["thermostat", "temperature"],
    "temperature-sensor": ["temperature", "temperature sensor"],
    "humidity-sensor": ["humidity", "humidity sensor"],
    "motion-sensor": ["motion", "motion sensor"],
    "occupancy-sensor": ["occupancy", "occupancy sensor"],
    "contact-sensor": ["contact", "contact sensor", "door sensor", "window sensor"],
    "leak-sensor": ["leak", "leak sensor", "water sensor"]
  };
  return aliases[type] || [String(type || "").replace(/-/g, " ")];
}

function buildVoiceCatalog(devices, scenes, rooms) {
  var roomNames = [];
  (rooms || []).forEach(function(room) {
    pushUnique(roomNames, typeof room === "string" ? room : room && room.name);
  });
  var usableDevices = (devices || []).filter(function(device) {
    return device && typeof device.name === "string" && typeof device.room === "string";
  });
  usableDevices.forEach(function(device) { pushUnique(roomNames, device.room); });
  var entities = usableDevices.slice();
  roomNames.forEach(function(room) {
    var hasLights = usableDevices.some(function(device) {
      return device.room.toLowerCase() === room.toLowerCase() && device.type === "light" &&
        device.reachable !== false;
    });
    if (hasLights) {
      entities.push({name: "All Lights", room: room, type: "light-group", reachable: true});
    }
  });
  return {
    devices: usableDevices,
    entities: entities,
    scenes: (scenes || []).filter(function(scene) {
      return scene && typeof scene.name === "string";
    }),
    rooms: roomNames,
    fetchedAt: Date.now()
  };
}

function loadVoiceCatalog(done) {
  if (VOICE_CATALOG && Date.now() - VOICE_CATALOG.fetchedAt < VOICE_CATALOG_CACHE_TTL_MS) {
    done(null, VOICE_CATALOG);
    return;
  }
  var results = {};
  var remaining = 3;
  var finished = false;
  function loaded(key) {
    return function(error, value) {
      if (finished) return;
      if (error) {
        finished = true;
        done(error);
        return;
      }
      if (!Array.isArray(value)) {
        finished = true;
        done(new Error("Unexpected Itsyhome voice list"));
        return;
      }
      results[key] = value;
      remaining -= 1;
      if (remaining === 0) {
        VOICE_CATALOG = buildVoiceCatalog(results.devices, results.scenes, results.rooms);
        done(null, VOICE_CATALOG);
      }
    };
  }
  apiGet("/list/devices", loaded("devices"));
  apiGet("/list/scenes", loaded("scenes"));
  apiGet("/list/rooms", loaded("rooms"));
}

function voiceEntityAliases(entity) {
  var aliases = [];
  var fullName = normalizeVoice(entity.name);
  var room = normalizeVoice(entity.room);
  pushUnique(aliases, fullName);
  if (entity.type === "light-group") {
    pushUnique(aliases, room + " lights");
    pushUnique(aliases, "all " + room + " lights");
    pushUnique(aliases, room + " all lights");
    pushUnique(aliases, "all lights in " + room);
    pushUnique(aliases, "the lights in " + room);
  } else {
    var shortName = normalizeVoice(displayNameInRoom(entity.name, entity.room));
    pushUnique(aliases, shortName);
    pushUnique(aliases, room + " " + shortName);
  }
  return aliases;
}

function findVoiceRoom(text, catalog) {
  var matches = catalog.rooms.filter(function(room) {
    return voicePhraseContains(text, room) || voicePhraseContains(text, room.replace(/ room$/i, ""));
  }).sort(function(left, right) { return right.length - left.length; });
  return matches.length ? matches[0] : null;
}

function spokenVoiceTypes(text) {
  var types = [];
  var knownTypes = ["light", "fan", "switch", "outlet", "blinds", "air-purifier",
    "humidifier", "dehumidifier", "humidifier-dehumidifier", "heater-cooler", "thermostat",
    "temperature-sensor", "humidity-sensor", "motion-sensor", "occupancy-sensor",
    "contact-sensor", "leak-sensor"];
  knownTypes.forEach(function(type) {
    if (voiceTypeAliases(type).some(function(alias) { return voicePhraseContains(text, alias); })) {
      types.push(type);
    }
  });
  return types;
}

function findVoiceEntity(text, catalog) {
  var candidates = [];
  catalog.entities.forEach(function(entity) {
    if (entity.reachable === false) return;
    var best = 0;
    voiceEntityAliases(entity).forEach(function(alias) {
      if (voicePhraseContains(text, alias)) best = Math.max(best, normalizeVoice(alias).length);
    });
    if (best && entity.type === "light-group") best += 100;
    if (best) candidates.push({entity: entity, score: best});
  });
  if (candidates.length) {
    var topScore = Math.max.apply(Math, candidates.map(function(item) { return item.score; }));
    var top = candidates.filter(function(item) { return item.score === topScore; });
    if (top.length === 1) return {entity: top[0].entity};
    var spoken = spokenVoiceTypes(text);
    var typed = top.filter(function(item) { return spoken.indexOf(item.entity.type) !== -1; });
    if (typed.length === 1) return {entity: typed[0].entity};
    var matchedRoom = findVoiceRoom(text, catalog);
    if (matchedRoom && spoken.length) {
      var typedRoomDevices = catalog.devices.filter(function(device) {
        return device.reachable !== false &&
          normalizeVoice(device.room) === normalizeVoice(matchedRoom) &&
          spoken.indexOf(device.type) !== -1;
      });
      if (typedRoomDevices.length === 1) return {entity: typedRoomDevices[0]};
    }
    return {error: "Which device? " + top.slice(0, 2).map(function(item) {
      return item.entity.name;
    }).join(" or ")};
  }

  var room = findVoiceRoom(text, catalog);
  var types = spokenVoiceTypes(text);
  if (room && types.length) {
    var roomDevices = catalog.devices.filter(function(device) {
      return device.reachable !== false && device.room.toLowerCase() === room.toLowerCase() &&
        types.indexOf(device.type) !== -1;
    });
    if (roomDevices.length === 1) return {entity: roomDevices[0]};
    if (roomDevices.length > 1) return {error: "Which " + voiceTypeAliases(types[0])[0] + " in " + room + "?"};
  }
  return {error: "I couldn't match that device"};
}

function exactVoiceScene(text, scenes) {
  var normalized = normalizeVoice(text).replace(/^please /, "");
  var match = normalized.match(/^(?:set|run|activate|start)(?: the)? (.+)$/);
  if (!match) return null;
  var sceneNames = [match[1]];
  pushUnique(sceneNames, match[1].replace(/^scene /, ""));
  pushUnique(sceneNames, match[1].replace(/ scene$/, ""));
  pushUnique(sceneNames, match[1].replace(/ on$/, ""));
  for (var index = 0; index < sceneNames.length; index += 1) {
    var candidate = sceneNames[index];
    var matches = scenes.filter(function(scene) {
      return normalizeVoice(scene.name) === candidate;
    });
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function voiceSceneIsSensitive(name) {
  return ["unlock", "garage", "door", "alarm", "security", "disarm", "gate"].some(
    function(keyword) { return voicePhraseContains(name, keyword); }
  );
}

function voiceNumber(text) {
  var normalized = normalizeVoice(text);
  var numeric = normalized.match(/\b(100|[1-9]?[0-9])\s*(?:%|percent)?\b/);
  if (numeric) return Number(numeric[1]);
  var numbers = {
    "zero": 0, "ten": 10, "twenty": 20, "twenty five": 25, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "seventy five": 75,
    "eighty": 80, "ninety": 90, "one hundred": 100
  };
  var names = Object.keys(numbers).sort(function(left, right) { return right.length - left.length; });
  for (var index = 0; index < names.length; index += 1) {
    if (voicePhraseContains(normalized, names[index])) return numbers[names[index]];
  }
  return null;
}

function voiceColor(text) {
  var colors = configuredColors().concat(COLOR_PALETTE);
  var seen = {};
  var matches = colors.filter(function(color) {
    var name = normalizeVoice(color.name);
    if (!name || seen[name]) return false;
    seen[name] = true;
    return voicePhraseContains(text, name);
  }).sort(function(left, right) { return right.name.length - left.name.length; });
  return matches.length ? matches[0] : null;
}

function voiceEntityLabel(entity) {
  return entity.type === "light-group" ? "All Lights" :
    displayNameInRoom(entity.name, entity.room);
}

function voicePrompt(entity, detail) {
  return entity.room + " / " + voiceEntityLabel(entity) + "\n" + detail;
}

function parseVoiceCommand(transcription, catalog) {
  var text = normalizeVoice(transcription);
  if (!text) return {error: "I didn't hear a command"};

  var scene = exactVoiceScene(text, catalog.scenes);
  if (scene) {
    return {intent: {action: "scene", scene: scene.name}, prompt: "Scene\n" + scene.name};
  }

  var query = /^(?:what is|whats|show|check|read|is)\b/.test(text);
  var found = findVoiceEntity(text, catalog);
  if (found.error) return found;
  var entity = found.entity;
  if (query) {
    return {intent: {action: "query", entity: entity}};
  }

  if (entity.type === "blinds") {
    var number = voiceNumber(text);
    if (number !== null && (voicePhraseContains(text, "percent") || text.indexOf("%") !== -1 ||
        voicePhraseContains(text, "position"))) {
      return {intent: {action: "position", entity: entity, value: number},
        prompt: voicePrompt(entity, number + "% open")};
    }
    var blindAction = null;
    var blindLabel = "";
    if (voicePhraseContains(text, "open")) { blindAction = 0; blindLabel = "Open"; }
    else if (voicePhraseContains(text, "close")) { blindAction = 1; blindLabel = "Close"; }
    else if (voicePhraseContains(text, "slow up") || voicePhraseContains(text, "slow raise")) {
      blindAction = 4; blindLabel = "Slow up 1%";
    } else if (voicePhraseContains(text, "slow down") || voicePhraseContains(text, "slow lower")) {
      blindAction = 5; blindLabel = "Slow down 1%";
    } else if (voicePhraseContains(text, "fast up") || voicePhraseContains(text, "fast raise")) {
      blindAction = 6; blindLabel = "Fast up 10%";
    } else if (voicePhraseContains(text, "fast down") || voicePhraseContains(text, "fast lower")) {
      blindAction = 7; blindLabel = "Fast down 10%";
    } else if (voicePhraseContains(text, "up") || voicePhraseContains(text, "raise")) {
      blindAction = 2; blindLabel = "Up 5%";
    } else if (voicePhraseContains(text, "down") || voicePhraseContains(text, "lower")) {
      blindAction = 3; blindLabel = "Down 5%";
    }
    if (blindAction !== null) {
      return {intent: {action: "blind", entity: entity, value: blindAction},
        prompt: voicePrompt(entity, blindLabel)};
    }
    return {error: "Say open, close, up, down, or a position"};
  }

  var turnOn = voicePhraseContains(text, "on") || voicePhraseContains(text, "power on");
  var turnOff = voicePhraseContains(text, "off") || voicePhraseContains(text, "shut off") ||
    voicePhraseContains(text, "power off");
  if (turnOn || turnOff) {
    if (!TOGGLE_SAFE_TYPES[entity.type] && entity.type !== "light-group") {
      return {error: "That device isn't safe for voice power control"};
    }
    return {intent: {action: "power", entity: entity, value: turnOn},
      prompt: voicePrompt(entity, turnOn ? "Turn on" : "Turn off")};
  }
  if (voicePhraseContains(text, "toggle")) {
    if (!TOGGLE_SAFE_TYPES[entity.type] && entity.type !== "light-group") {
      return {error: "That device isn't safe for voice control"};
    }
    return {intent: {action: "toggle", entity: entity}, prompt: voicePrompt(entity, "Toggle")};
  }

  var color = voiceColor(text);
  if (color && (entity.type === "light" || entity.type === "light-group")) {
    return {intent: {action: "color", entity: entity, hue: color.hue,
      saturation: color.saturation}, prompt: voicePrompt(entity, color.name)};
  }

  var level = voiceNumber(text);
  if (entity.type === "fan" && level !== null) {
    return {intent: {action: "speed", entity: entity, value: level},
      prompt: voicePrompt(entity, "Speed " + level + "%")};
  }
  if ((entity.type === "light" || entity.type === "light-group") && level !== null) {
    return {intent: {action: "brightness", entity: entity, value: level},
      prompt: voicePrompt(entity, "Brightness " + level + "%")};
  }
  if (voicePhraseContains(text, "low") || voicePhraseContains(text, "medium") ||
      voicePhraseContains(text, "high")) {
    var preset = voicePhraseContains(text, "low") ? 25 :
      voicePhraseContains(text, "medium") ? 50 : 100;
    if (entity.type === "fan") {
      return {intent: {action: "speed", entity: entity, value: preset},
        prompt: voicePrompt(entity, "Speed " + preset + "%")};
    }
    if (entity.type === "light" || entity.type === "light-group") {
      return {intent: {action: "brightness", entity: entity, value: preset},
        prompt: voicePrompt(entity, "Brightness " + preset + "%")};
    }
  }
  return {error: "Try on, off, a color, percentage, speed, or scene"};
}

function voiceStatusValue(item) {
  if (!item || item.reachable === false) return "Unavailable";
  if (isSensor(item)) return sensorValue(item, item);
  var state = item.state || {};
  if (typeof state.on === "boolean") return state.on ? "On" : "Off";
  if (state.speed !== undefined) return state.speed + "% speed";
  if (state.position !== undefined) return state.position + "% open";
  var value = sensorValue(item, item);
  return value === "Unknown" ? "Status unavailable" : value;
}

function executeVoiceQuery(intent) {
  var entity = intent.entity;
  apiGet("/info/" + encodeURIComponent(entity.room), function(error, items) {
    if (error) { sendError(error); return; }
    if (!Array.isArray(items)) { sendError(new Error("Status unavailable")); return; }
    var matches = items.filter(function(item) {
      return item && normalizeVoice(item.name) === normalizeVoice(entity.name) &&
        item.type === entity.type;
    });
    if (matches.length !== 1) { sendError(new Error("Status target is ambiguous")); return; }
    send({"VOICE_RESULT": voiceEntityLabel(entity) + "\n" + voiceStatusValue(matches[0])});
  });
}

function resolveVoiceServiceId(intent, done) {
  var entity = intent.entity;
  if (!entity || entity.type === "light-group" || entity.serviceId || !VOICE_CATALOG) {
    done(null);
    return;
  }
  var duplicates = VOICE_CATALOG.devices.filter(function(device) {
    return normalizeVoice(device.room) === normalizeVoice(entity.room) &&
      normalizeVoice(device.name) === normalizeVoice(entity.name);
  });
  if (duplicates.length <= 1) { done(null); return; }
  apiGet("/debug/" + encodeURIComponent(entity.name), function(error, response) {
    if (error) { done(error); return; }
    var details = Array.isArray(response) ? response : [response];
    var matches = details.filter(function(detail) {
      return detail && detail.serviceTypeLabel === entity.type &&
        (!detail.room || normalizeVoice(detail.room) === normalizeVoice(entity.room)) &&
        typeof detail.serviceId === "string";
    });
    if (matches.length !== 1) {
      done(new Error("That device name is ambiguous"));
      return;
    }
    entity.serviceId = matches[0].serviceId;
    done(null);
  });
}

function executeVoiceIntent(intent) {
  if (intent.action === "scene") { runScene(intent.scene); return; }
  var entity = intent.entity;
  if (intent.action === "power") {
    setDevicePower(entity.room, entity.name, entity.type, intent.value, entity.serviceId);
  } else if (intent.action === "toggle") {
    toggleDevice(entity.room, entity.name, entity.type, entity.serviceId);
  } else if (intent.action === "brightness") {
    setBrightness(entity.room, entity.name, intent.value, entity.type, entity.serviceId);
  } else if (intent.action === "color") {
    setColor(entity.room, entity.name, intent.hue, intent.saturation, entity.type,
      entity.serviceId);
  } else if (intent.action === "speed") {
    setSpeed(entity.room, entity.name, intent.value, entity.type, entity.serviceId);
  } else if (intent.action === "blind") {
    setBlindPosition(entity.room, entity.name, intent.value, entity.type, entity.serviceId);
  } else if (intent.action === "position") {
    setBlindAbsolutePosition(entity.room, entity.name, intent.value, entity.type,
      entity.serviceId);
  } else {
    sendError(new Error("Unknown voice action"));
  }
}

function handleVoiceTranscript(transcription) {
  PENDING_VOICE_INTENT = null;
  loadVoiceCatalog(function(error, catalog) {
    if (error) { sendError(error); return; }
    var parsed = parseVoiceCommand(transcription, catalog);
    if (parsed.error) { sendError(new Error(parsed.error)); return; }
    if (parsed.intent.action === "query") {
      executeVoiceQuery(parsed.intent);
      return;
    }
    if (parsed.intent.action === "scene" && voiceSceneIsSensitive(parsed.intent.scene)) {
      PENDING_VOICE_INTENT = parsed.intent;
      send({"VOICE_PROMPT": parsed.prompt});
      return;
    }
    resolveVoiceServiceId(parsed.intent, function(resolveError) {
      if (resolveError) { sendError(resolveError); return; }
      executeVoiceIntent(parsed.intent);
    });
  });
}

function executePendingVoiceIntent() {
  if (!PENDING_VOICE_INTENT) {
    sendError(new Error("Voice command expired"));
    return;
  }
  var intent = PENDING_VOICE_INTENT;
  PENDING_VOICE_INTENT = null;
  resolveVoiceServiceId(intent, function(error) {
    if (error) { sendError(error); return; }
    executeVoiceIntent(intent);
  });
}

function configurationPage() {
  var current = baseUrl().replace(/&/g, "&amp;").replace(/\"/g, "&quot;");
  var selectedColors = configuredColors();
  var selectedSections = configuredSections();
  var selectedTheme = configuredTheme();
  var savedThemes = configuredThemes();
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
  var themeJson = JSON.stringify(selectedTheme).replace(/<\//g, "<\\/");
  var themesJson = JSON.stringify(savedThemes).replace(/<\//g, "<\\/");
  var html = '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
    '<style>*{box-sizing:border-box}body{font:17px -apple-system;margin:0;background:#f2f2f7;color:#111}' +
    '.wrap{padding:20px 20px 32px;max-width:620px;margin:auto}h1{font-size:28px;margin:4px 0 16px}' +
    'h2{font-size:20px;margin-top:28px}label{display:block;font-weight:600}' +
    'label span{float:right;color:#777;font-weight:400}input{box-sizing:border-box;width:100%;' +
    'padding:14px;margin:8px 0 18px;' +
    'border:1px solid #bbb;border-radius:10px;background:white;font-size:16px}' +
    'input[type=color]{height:58px;padding:5px}select{width:100%;padding:13px;margin:8px 0 18px;' +
    'border:1px solid #bbb;border-radius:10px;background:white;font-size:16px}' +
    '.toggle{background:white;border:1px solid #bbb;border-radius:10px;padding:14px;' +
    'margin:8px 0}.toggle label{font-weight:500}.toggle input{width:auto;margin:0 12px 0 0}' +
    'button{width:100%;padding:14px;border:0;border-radius:10px;background:#34a853;color:white;' +
    'font-size:17px;font-weight:600}.secondary{background:#e5e5ea;color:#111}.danger{background:#fff;color:#c5221f;' +
    'border:1px solid #d7d7dc}.button-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 20px}' +
    'p{color:#666;font-size:14px}a{color:#0878d1}.tabs{display:grid;grid-template-columns:1fr 1fr;' +
    'background:#dedee3;border-radius:11px;padding:3px;margin-bottom:22px}.tabs button{padding:9px;background:transparent;' +
    'color:#555;font-size:15px}.tabs button.active{background:white;color:#111;box-shadow:0 1px 3px #aaa}' +
    '.panel{display:none}.panel.active{display:block}.preview-shell{width:200px;height:228px;margin:4px auto 24px;' +
    'padding:22px 12px;border:8px solid #252525;border-radius:24px;background:#fff;overflow:hidden;' +
    'box-shadow:0 8px 22px #bbb}.preview-title{font-weight:bold;font-size:14px;margin-bottom:8px;opacity:.75}' +
    '.preview-row{height:47px;padding:5px 7px;display:flex;align-items:center;border-radius:2px;overflow:hidden}' +
    '.preview-row.selected{font-weight:600}.preview-icon{width:25px;margin-right:7px;text-align:center;font-size:19px}' +
    '.preview-text{min-width:0}.preview-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.preview-sub{font-size:12px;opacity:.72}.theme-card{background:#fff;border:1px solid #bbb;border-radius:12px;' +
    'padding:14px;margin:10px 0 20px}.save-main{margin-top:28px}</style>' +
    '<div class="wrap"><h1>Pome</h1><div class="tabs"><button type="button" id="setupTab" class="active" ' +
    'onclick="tab(\'setup\')">Setup</button><button type="button" id="themesTab" ' +
    'onclick="tab(\'themes\')">Themes</button></div><section id="setupPanel" class="panel active">' +
    '<label>Itsyhome server URL</label><input id="url" ' +
    'placeholder="https://your-mac.tailnet.ts.net:10443" value="' + current + '">' +
    '<p>Enter your Itsyhome webhook URL. Use a private Tailscale HTTPS URL for home and ' +
    'away access, or a local HTTP URL for LAN-only use.</p>' +
    '<p><a href="https://github.com/GeezusChrotch/pome#setup">Setup instructions</a></p>' +
    '<h2>Show in Pome</h2><p>With one main section enabled, Pome opens it directly.</p>' +
    sectionFields + '<h2>Light colors</h2>' +
    '<p>Tap a swatch to open the iPhone color wheel.</p>' + colorFields + '</section>' +
    '<section id="themesPanel" class="panel"><div id="preview" class="preview-shell">' +
    '<div class="preview-title">Living Room</div><div class="preview-row selected">' +
    '<span class="preview-icon">●</span><div class="preview-text"><div class="preview-name">Ceiling Light</div>' +
    '<div class="preview-sub">Toggle, level, color</div></div></div><div class="preview-row">' +
    '<span class="preview-icon">◉</span><div class="preview-text"><div class="preview-name">Floor Lamp</div>' +
    '<div class="preview-sub">Toggle, level, color</div></div></div><div class="preview-row">' +
    '<span class="preview-icon">✦</span><div class="preview-text"><div class="preview-name">Scenes</div>' +
    '<div class="preview-sub">4 scenes</div></div></div></div>' +
    '<div class="theme-card"><label>Saved themes</label><select id="savedTheme"></select>' +
    '<div class="button-row"><button type="button" class="secondary" onclick="loadTheme()">Load</button>' +
    '<button type="button" class="danger" onclick="deleteTheme()">Delete</button></div>' +
    '<label>Theme name</label><input id="themeName" maxlength="32" placeholder="My theme">' +
    '<button type="button" onclick="saveTheme()">Save this theme</button></div>' +
    '<label>Font color</label><input type="color" id="themeText">' +
    '<label>Background color</label><input type="color" id="themeBackground">' +
    '<label>Selection color</label><input type="color" id="themeSelection">' +
    '<label>Font</label><select id="themeFont"><option value="gothic">Gothic</option>' +
    '<option value="gothic-bold">Gothic Bold</option><option value="serif">Serif</option></select>' +
    '<label>Font size</label><select id="themeSize"><option value="small">Small</option>' +
    '<option value="medium">Medium</option><option value="large">Large</option></select>' +
    '<div class="toggle"><label><input type="checkbox" id="themeIcons">Show device icons</label></div>' +
    '</section><button class="save-main" onclick="save()">Save settings</button></div>' +
    '<script>var names=' + JSON.stringify(namedColors) + ';var currentTheme=' + themeJson +
    ';var savedThemes=' + themesJson +
    ';function byId(id){return document.getElementById(id);}function tab(name){' +
    'byId(\'setupTab\').className=name===\'setup\'?\'active\':\'\';' +
    'byId(\'themesTab\').className=name===\'themes\'?\'active\':\'\';' +
    'byId(\'setupPanel\').className=name===\'setup\'?\'panel active\':\'panel\';' +
    'byId(\'themesPanel\').className=name===\'themes\'?\'panel active\':\'panel\';}' +
    'function contrast(hex){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),' +
    'b=parseInt(hex.slice(5,7),16);return(r*299+g*587+b*114)/1000>=150?\'#000000\':\'#ffffff\';}' +
    'function readTheme(){return{name:byId(\'themeName\').value.trim()||\'Custom\',' +
    'text:byId(\'themeText\').value,background:byId(\'themeBackground\').value,' +
    'selection:byId(\'themeSelection\').value,font:byId(\'themeFont\').value,' +
    'size:byId(\'themeSize\').value,icons:byId(\'themeIcons\').checked};}' +
    'function applyTheme(theme){currentTheme=theme;byId(\'themeName\').value=theme.name||\'\';' +
    'byId(\'themeText\').value=theme.text;byId(\'themeBackground\').value=theme.background;' +
    'byId(\'themeSelection\').value=theme.selection;byId(\'themeFont\').value=theme.font;' +
    'byId(\'themeSize\').value=theme.size;byId(\'themeIcons\').checked=theme.icons!==false;preview();}' +
    'function preview(){var theme=readTheme(),shell=byId(\'preview\'),rows=shell.querySelectorAll(\'.preview-row\');' +
    'shell.style.background=theme.background;shell.style.color=theme.text;' +
    'shell.style.fontFamily=theme.font===\'serif\'?\'Georgia,serif\':\'Arial,sans-serif\';' +
    'shell.style.fontWeight=theme.font===\'gothic-bold\'?\'700\':\'400\';' +
    'shell.style.fontSize=theme.size===\'small\'?\'16px\':theme.size===\'large\'?\'22px\':\'19px\';' +
    'rows[0].style.background=theme.selection;rows[0].style.color=contrast(theme.selection);' +
    'var icons=shell.querySelectorAll(\'.preview-icon\');for(var i=0;i<icons.length;i++)' +
    'icons[i].style.display=theme.icons?\'inline-block\':\'none\';}' +
    'function refreshThemes(selected){var menu=byId(\'savedTheme\');menu.innerHTML=\'<option value="">Choose a saved theme</option>\';' +
    'for(var i=0;i<savedThemes.length;i++){var option=document.createElement(\'option\');option.value=String(i);' +
    'option.textContent=savedThemes[i].name;menu.appendChild(option);if(savedThemes[i].name===selected)menu.value=String(i);}}' +
    'function loadTheme(){var index=parseInt(byId(\'savedTheme\').value,10);if(!isNaN(index)&&savedThemes[index])' +
    'applyTheme(savedThemes[index]);}' +
    'function saveTheme(){var theme=readTheme();if(!theme.name){alert(\'Name your theme first.\');return;}' +
    'var found=-1;for(var i=0;i<savedThemes.length;i++)if(savedThemes[i].name.toLowerCase()===theme.name.toLowerCase())found=i;' +
    'if(found>=0)savedThemes[found]=theme;else{if(savedThemes.length>=20){alert(\'Pome can save up to 20 themes.\');return;}' +
    'savedThemes.push(theme);}currentTheme=theme;refreshThemes(theme.name);preview();}' +
    'function deleteTheme(){var index=parseInt(byId(\'savedTheme\').value,10);if(isNaN(index)||!savedThemes[index])return;' +
    'savedThemes.splice(index,1);refreshThemes(\'\');}' +
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
    'encodeURIComponent(JSON.stringify({baseUrl:value,colors:colors,sections:sections,' +
    'theme:readTheme(),themes:savedThemes}));}' +
    'var controls=[\'themeText\',\'themeBackground\',\'themeSelection\',\'themeFont\',' +
    '\'themeSize\',\'themeIcons\'];for(var j=0;j<controls.length;j++){' +
    'byId(controls[j]).addEventListener(\'change\',preview);byId(controls[j]).addEventListener(\'input\',preview);}' +
    'refreshThemes(\'\');applyTheme(currentTheme);</script></html>';
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
      toggleDevice(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_TYPE, payload.ITEM_ID);
      break;
    case COMMAND_SET_BRIGHTNESS:
      setBrightness(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_VALUE,
        payload.ITEM_TYPE, payload.ITEM_ID);
      break;
    case COMMAND_SET_COLOR:
      setColor(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_HUE,
        payload.ITEM_SATURATION, payload.ITEM_TYPE, payload.ITEM_ID);
      break;
    case COMMAND_SET_SPEED:
      setSpeed(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_VALUE,
        payload.ITEM_TYPE, payload.ITEM_ID);
      break;
    case COMMAND_SET_POSITION:
      setBlindPosition(payload.ITEM_ROOM, payload.ITEM_NAME, payload.ITEM_VALUE,
        payload.ITEM_TYPE, payload.ITEM_ID);
      break;
    case COMMAND_LOAD_COLORS:
      sendColorChoices();
      break;
    case COMMAND_PARSE_VOICE:
      handleVoiceTranscript(payload.VOICE_TEXT);
      break;
    case COMMAND_EXECUTE_VOICE:
      executePendingVoiceIntent();
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
    if (config.theme) {
      localStorage.setItem("pomeTheme", JSON.stringify(normalizeTheme(config.theme)));
    }
    if (Array.isArray(config.themes)) {
      localStorage.setItem("pomeThemes", JSON.stringify(config.themes.slice(0, 20).map(normalizeTheme)));
    }
    VOICE_CATALOG = null;
    sendDisplaySettings(function() {
      sendColorChoices(function() { send({ "STATUS": "Settings saved" }); });
    });
  } catch (error) {
    console.log("Configuration error: " + error.message);
  }
});
