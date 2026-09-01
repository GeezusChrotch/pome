"use strict";

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");

var watchSource = fs.readFileSync("src/c/itsyhome-pebble.c", "utf8");
assert.ok(watchSource.indexOf("marquee_selection_changed") !== -1);
assert.ok(watchSource.indexOf("graphics_text_layout_get_content_size") !== -1);
assert.ok(watchSource.indexOf("s_marquee_offset") !== -1);
assert.ok(watchSource.indexOf("requested_font <= 9") !== -1);
assert.ok(watchSource.indexOf("root_shortcut_click_config_provider") !== -1);
assert.ok(watchSource.indexOf("window_long_click_subscribe(BUTTON_ID_UP") !== -1);
assert.ok(watchSource.indexOf("window_long_click_subscribe(BUTTON_ID_SELECT") !== -1);
assert.ok(watchSource.indexOf("window_long_click_subscribe(BUTTON_ID_DOWN") !== -1);
assert.ok(watchSource.indexOf('strncmp(target, "scene:", 6)') !== -1);
assert.ok(watchSource.indexOf('strcmp(target, "themes")') !== -1);
assert.ok(watchSource.indexOf("theme_select_click") !== -1);
assert.ok(watchSource.indexOf('theme->active ? "Current"') !== -1);
assert.ok(watchSource.indexOf("title_height") !== -1);
assert.ok(watchSource.indexOf("GRect(text_x, title_y, title_width, title_height)") !== -1);

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
  XMLHttpRequest: function() {
    this.open = function() {};
    this.send = function() {};
  },
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
assert.strictEqual(defaults.size, 24);
assert.strictEqual(defaults.icons, true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.configuredShortcuts())),
  {up: "off", select: "off", down: "off"});
assert.strictEqual(context.validShortcut("themes"), "themes");

context.cacheShortcutScenes([{name: "Good Night"}, {name: "Movie Time"}]);

var builtIns = context.configuredThemes();
assert.strictEqual(builtIns.length, 5);
assert.deepStrictEqual(Array.prototype.map.call(builtIns, function(theme) { return theme.name; }),
  ["Classic", "Pome Amber", "Midnight", "Forest", "Berry"]);
assert.ok(Array.prototype.every.call(builtIns, function(theme) { return theme.builtIn; }));

var configurationHtml = decodeURIComponent(context.configurationPage().split(",")[1]);
var embeddedScript = configurationHtml.match(/<script>([\s\S]*)<\/script>/);
assert.ok(embeddedScript);
assert.doesNotThrow(function() { new vm.Script(embeddedScript[1]); });
assert.ok(configurationHtml.indexOf('<meta charset="utf-8">') !== -1);
assert.ok(configurationHtml.indexOf("id=\"setupTab\"") !== -1);
assert.ok(configurationHtml.indexOf("id=\"themesTab\"") !== -1);
assert.ok(configurationHtml.indexOf("id=\"shortcutsTab\"") !== -1);
assert.ok(configurationHtml.indexOf("Long press Up") !== -1);
assert.ok(configurationHtml.indexOf("Long press Select") !== -1);
assert.ok(configurationHtml.indexOf("Long press Down") !== -1);
assert.ok(configurationHtml.indexOf('<option value="themes">Themes</option>') !== -1);
assert.ok(configurationHtml.indexOf("scene:Good Night") !== -1);
assert.ok(configurationHtml.indexOf("id=\"preview\"") !== -1);
assert.ok(configurationHtml.indexOf("Font color") !== -1);
assert.ok(configurationHtml.indexOf("Background color") !== -1);
assert.ok(configurationHtml.indexOf("Selection color") !== -1);
assert.ok(configurationHtml.indexOf('class="palette-grid"') !== -1);
assert.ok(configurationHtml.indexOf("grid-template-columns:repeat(8") !== -1);
assert.ok(configurationHtml.indexOf("for(var i=0;i<64;i++)") !== -1);
assert.ok(configurationHtml.indexOf('type="color" id="themeText"') === -1);
assert.ok(configurationHtml.indexOf("function canonicalHex") !== -1);
assert.ok(configurationHtml.indexOf("Show device icons") !== -1);
assert.ok(configurationHtml.indexOf("Save Theme &amp; Apply to Watch") !== -1);
assert.ok(configurationHtml.indexOf("Apply Current Preview") !== -1);
assert.ok(configurationHtml.indexOf("function applyCurrent(){save();}") !== -1);
assert.ok(configurationHtml.indexOf("function applySaved(){loadTheme()") === -1);
assert.ok(configurationHtml.indexOf("Roboto Condensed") !== -1);
assert.ok(configurationHtml.indexOf("Droid Serif Bold") !== -1);
assert.ok(configurationHtml.indexOf("Bitham Black") !== -1);
assert.ok(configurationHtml.indexOf('"gothic":[14,18,24,28]') !== -1);
assert.ok(configurationHtml.indexOf('<option value="14">14 pt</option>') !== -1);
assert.ok(configurationHtml.indexOf('<option value="30">30 pt</option>') !== -1);
assert.ok(configurationHtml.indexOf("Pome Amber • Built-in") === -1);
assert.ok(configurationHtml.indexOf("builtIn?' • Built-in'") !== -1);
assert.ok(configurationHtml.indexOf("Built-in themes can’t be deleted") !== -1);
assert.ok(configurationHtml.indexOf("function watchHex") !== -1);
assert.ok(configurationHtml.indexOf("width:216px;height:244px") !== -1);
assert.ok(configurationHtml.indexOf("shell.style.fontSize=theme.size+'px'") !== -1);
assert.ok(configurationHtml.indexOf("levels[0]*16+levels[1]*4+levels[2]") !== -1);
assert.ok(configurationHtml.indexOf("return_to=([^&]*)") !== -1);
assert.ok(configurationHtml.indexOf("if(value&&!/^https?") !== -1);

var customTheme = {
  name: "Amber Night",
  text: "#fdf0d5",
  background: "#14213d",
  selection: "#fca311",
  font: "gothic-bold",
  size: 28,
  icons: false
};
handlers.webviewclosed({
  response: encodeURIComponent(JSON.stringify({
    baseUrl: "https://example.invalid:10443",
    colors: context.DEFAULT_COLORS,
    sections: {favorites: true, scenes: true, rooms: true, sensors: true},
    shortcuts: {up: "favorites", select: "voice", down: "scene:Good Night"},
    theme: customTheme,
    themes: [customTheme]
  }))
});

var normalizedCustomTheme = Object.assign({}, customTheme, {builtIn: false});
assert.deepStrictEqual(JSON.parse(stored.pomeTheme), normalizedCustomTheme);
assert.deepStrictEqual(JSON.parse(stored.pomeThemes), [normalizedCustomTheme]);
assert.deepStrictEqual(JSON.parse(stored.pomeShortcuts),
  {up: "favorites", select: "voice", down: "scene:Good Night"});
assert.strictEqual(context.configuredTheme().icons, false);
assert.strictEqual(context.configuredThemes().length, 6);

sent = [];
context.sendDisplaySettings();
assert.strictEqual(sent.length, 1);
assert.strictEqual(sent[0].THEME_BACKGROUND, context.pebbleColor(customTheme.background));
assert.strictEqual(sent[0].THEME_TEXT, context.pebbleColor(customTheme.text));
assert.strictEqual(sent[0].THEME_SELECTION, context.pebbleColor(customTheme.selection));
assert.strictEqual(sent[0].THEME_FONT, 1);
assert.strictEqual(sent[0].THEME_SIZE, 28);
assert.strictEqual(sent[0].THEME_ICONS, 0);
assert.strictEqual(sent[0].SHORTCUT_UP, "favorites");
assert.strictEqual(sent[0].SHORTCUT_SELECT, "voice");
assert.strictEqual(sent[0].SHORTCUT_DOWN, "scene:Good Night");

context.Pebble.getActiveWatchInfo = function() { return {platform: "emery"}; };
var time2Theme = context.configuredTheme();
assert.strictEqual(time2Theme.font, "montserrat");
assert.strictEqual(time2Theme.size, 26);
var time2Html = decodeURIComponent(context.configurationPage().split(",")[1]);
assert.ok(time2Html.indexOf("Time 2 enhanced fonts") !== -1);
assert.ok(time2Html.indexOf('<option value="inter">Inter</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="roboto">Roboto</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="open-sans">Open Sans</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="montserrat">Montserrat</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="poppins">Poppins</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="22">22 pt</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="26">26 pt</option>') !== -1);
assert.ok(time2Html.indexOf('<option value="21">21 pt</option>') === -1);
sent = [];
context.sendDisplaySettings();
assert.strictEqual(sent[0].THEME_FONT, 8);
assert.strictEqual(sent[0].THEME_SIZE, 26);

sent = [];
context.sendThemeChoices();
assert.strictEqual(sent.length, 7);
assert.strictEqual(sent[0].ITEM_KIND, 8);
assert.strictEqual(sent[0].ITEM_NAME, "Classic");
assert.strictEqual(sent[5].ITEM_NAME, "Amber Night");
assert.strictEqual(sent[5].ITEM_ACTIVE, 1);
assert.strictEqual(sent[6].LIST_DONE, 8);

sent = [];
context.applyThemeAtIndex(2);
assert.strictEqual(JSON.parse(stored.pomeTheme).name, "Midnight");
assert.strictEqual(sent.length, 1);
assert.strictEqual(sent[0].STATUS, "Theme applied");
assert.strictEqual(sent[0].THEME_FONT, 6);

handlers.showConfiguration();
assert.ok(/^data:text\/html/.test(openedUrl));

console.log("Theme control tests passed");
