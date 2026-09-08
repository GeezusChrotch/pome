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
assert.ok(watchSource.indexOf('theme_cell_draw(ctx, cell_layer, "Settings"') === -1);
assert.ok(watchSource.indexOf("return visible_root_count() + 2") !== -1);
assert.ok(watchSource.indexOf("settings_select_click") !== -1);
assert.ok(watchSource.indexOf("shortcut_target_select_click") !== -1);
assert.ok(watchSource.indexOf("COMMAND_SET_SHORTCUT = 16") !== -1);

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
  {up: "off", select: "off", down: "off", doubleBack:"off"});
assert.strictEqual(context.validShortcut("themes"), "off");

context.cacheShortcutScenes([{name: "Good Night"}, {name: "Movie Time"}]);

var builtIns = context.configuredThemes();
assert.strictEqual(builtIns.length, 10);
assert.deepStrictEqual(Array.prototype.map.call(builtIns, function(theme) { return theme.name; }),
  ["Classic", "Night Reader", "Large Print", "Soft Paper", "Solar Flare", "Mint Condition", "Deep Sea", "Berry Pop", "Arcade", "Blue Note"]);
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
assert.ok(configurationHtml.indexOf('<option value="themes">Themes</option>') === -1);
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

var normalizedCustomTheme = Object.assign({}, customTheme, {builtIn: false, subtitleSize: 20});
assert.deepStrictEqual(JSON.parse(stored.pomeTheme), normalizedCustomTheme);
assert.deepStrictEqual(JSON.parse(stored.pomeThemes), [normalizedCustomTheme]);
assert.deepStrictEqual(JSON.parse(stored.pomeShortcuts),
  {up: "favorites", select: "voice", down: "scene:Good Night", doubleBack:"off"});
assert.strictEqual(context.configuredTheme().icons, false);
assert.strictEqual(context.configuredThemes().length, 11);

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
assert.strictEqual(sent.length, 12);
assert.strictEqual(sent[0].ITEM_KIND, 8);
assert.strictEqual(sent[0].ITEM_NAME, "Classic");
assert.strictEqual(sent[10].ITEM_NAME, "Amber Night");
assert.strictEqual(sent[10].ITEM_ACTIVE, 1);
assert.strictEqual(sent[11].LIST_DONE, 8);

sent = [];
context.applyThemeAtIndex(2);
assert.strictEqual(JSON.parse(stored.pomeTheme).name, "Large Print");
assert.strictEqual(sent.length, 1);
assert.strictEqual(sent[0].STATUS, "Theme applied");
assert.strictEqual(sent[0].THEME_FONT, 7);

sent = [];
context.setShortcutAtIndex(0, "rooms");
assert.strictEqual(JSON.parse(stored.pomeShortcuts).up, "rooms");
assert.strictEqual(sent.length, 1);
assert.strictEqual(sent[0].SHORTCUT_UP, "rooms");
assert.strictEqual(sent[0].STATUS, "Shortcut saved");

handlers.showConfiguration();
assert.ok(/^data:text\/html/.test(openedUrl));

console.log("Theme control tests passed");

var originalCameraController=context.cameraController,originalHomeController=context.homeController;
var cameraReads=0,finishCamera,finishHome;
context.cameraController={settings:function(cb){cameraReads++;finishCamera=cb;}};
context.homeController={read:function(cameras,cb){finishHome=cb;}};
handlers.showConfiguration();handlers.showConfiguration();assert.strictEqual(cameraReads,1);
finishCamera({cameras:[]});handlers.showConfiguration();assert.strictEqual(cameraReads,1);
finishHome({items:[],revision:1});assert.strictEqual(context.configurationOpening,false);
context.cameraController=originalCameraController;context.homeController=originalHomeController;

// Every shipped palette must keep both title and subtitle text legible in both states.
function luminance(hex) {
  var rgb=[1,3,5].map(function(i){var c=parseInt(hex.slice(i,i+2),16)/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);});
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
function contrastRatio(a,b){var x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
var displayPalette=vm.runInNewContext(time2Html.match(/var watchColors=(\[[^;]+\]);/)[1]);
context.TIME2_BUILT_IN_THEMES.forEach(function(theme){
  [false,true].forEach(function(display){
    function color(hex){return display?displayPalette[context.pebbleColor(hex)-192]:hex;}
    assert.ok(contrastRatio(color(theme.text),color(theme.background))>=7,theme.name+' normal contrast');
    assert.ok(contrastRatio(color(context.contrastingColor(theme.selection)),color(theme.selection))>=7,theme.name+' selection contrast');
  });
});
[16,18,20,22,24].forEach(function(size){
  var theme=Object.assign({},context.TIME2_BUILT_IN_THEMES[0],{name:'Subtitle '+size,subtitleSize:size});
  handlers.webviewclosed({response:encodeURIComponent(JSON.stringify({theme:theme,themes:[theme]}))});
  assert.strictEqual(context.configuredTheme().subtitleSize,size);
  assert.strictEqual(context.themeMessage(context.configuredTheme()).THEME_SUBTITLE_SIZE,size);
});
stored.pomeThemes=JSON.stringify(Array.from({length:20},function(_,i){return Object.assign({},customTheme,{name:'Custom '+i});}));
assert.strictEqual(context.watchThemeChoices().length,31,'ten presets plus twenty customs and a current unsaved theme fit');
console.log('PASS: ten palettes exceed 7:1 in raw and simulated palettes; subtitle sizes persist and transmit; full theme library fits');

stored.pomeShortcuts=JSON.stringify({up:"themes",select:"voice",down:"off",doubleBack:"scenes"});
assert.strictEqual(context.configuredShortcuts().up,"off");
sent=[];context.sendDisplaySettings();assert.strictEqual(sent[0].SHORTCUT_DOUBLE_BACK,"scenes");
stored.pomeScenePins=JSON.stringify({"Living room":true});
stored.pomeShortcuts=JSON.stringify({up:"pin_toggle",doubleBack:"pin_toggle"});
sent=[];context.sendDisplaySettings();
assert.strictEqual(sent.length,1,'old phone pin choices must not override watch pins');
assert.strictEqual(sent[0].SHORTCUT_UP,'pin_toggle');assert.strictEqual(sent[0].SHORTCUT_DOUBLE_BACK,'pin_toggle');
configurationHtml=decodeURIComponent(context.configurationPage().split(',')[1]);
assert.ok(configurationHtml.includes('Pin / unpin'));assert.ok(!configurationHtml.includes('Keep current'));
assert.doesNotThrow(()=>new vm.Script(configurationHtml.match(/<script>([\s\S]*)<\/script>/)[1]));

stored.pomeSections=JSON.stringify({favorites:true,scenes:true,rooms:true});
assert.strictEqual(context.configuredSections().cameras,true,'existing users retain Cameras by default');
stored.pomeSections=JSON.stringify({favorites:true,scenes:false,rooms:false,cameras:false});
sent=[];context.sendDisplaySettings();assert.strictEqual(sent[0].SHOW_CAMERAS,0);
configurationHtml=decodeURIComponent(context.configurationPage().split(',')[1]);
assert.ok(configurationHtml.includes('id="cameras">Cameras'));
stored.pomeSections=JSON.stringify({favorites:false,scenes:false,rooms:false,cameras:true});
assert.strictEqual(context.configuredSections().favorites,false,'camera-only section selection is valid');
sent=[];context.sendDisplaySettings();assert.strictEqual(sent[0].SHOW_CAMERAS,1);
configurationHtml=decodeURIComponent(context.configurationPage().split(',')[1]);
assert.ok(configurationHtml.includes('id="cameras" checked>Cameras'));
assert.ok(watchSource.includes('visible_root_count() + CAMERA_VISIBLE == 1'));
assert.ok(watchSource.includes('persist_write_bool(SHOW_CAMERAS_KEY,s_show_cameras)'));
assert.ok(watchSource.includes('persist_read_bool(SHOW_CAMERAS_KEY)'));
console.log('Camera section visibility, migration default, phone payload, checkbox and camera-only settings tests passed');
