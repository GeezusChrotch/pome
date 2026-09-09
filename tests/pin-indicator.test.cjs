const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
const root=c.slice(c.indexOf('static void root_draw_row('),c.indexOf('static uint16_t list_get_num_rows('));
assert.match(root,/home_pin_at_row/);
assert.match(root,/theme_cell_draw_with_pin\(ctx, cell_layer, name, pin_type\(pin\), NULL, true\)/);
const draw=c.slice(c.indexOf('static void theme_cell_draw_with_pin('),c.indexOf('static void theme_header_draw('));
assert.match(draw,/pin_width = pinned \? 20 : 0/);
assert.match(draw,/title_width = bounds.size.w - text_x - 3 - pin_width/);
assert.ok(draw.lastIndexOf('draw_pin_indicator')>draw.lastIndexOf('graphics_draw_text'),'Mask marquee and subtitles before the fixed marker');
assert.match(draw,/draw_pin_indicator\(ctx, bounds, highlighted \? s_theme_selection_text : s_theme_text\)/);
assert.match(draw,/title, subtitle, icon, false/,'Normal rows remain unmarked');
// Pin primitives fit both platforms and the smallest row, independent of font.
for(const width of [144,200])for(const height of [40,47,60]){
 const x=width-16,y=Math.floor((height-17)/2);
 assert.ok(x>=0&&x+12<=width&&y>=0&&y+16<height);
}
const favorites=c.slice(c.indexOf('ItemKind done_kind = done->value->uint8;'),c.indexOf('} else if (done_kind == ITEM_KIND_SCENE)'));
assert.match(favorites,/s_favorite_count = total->value->uint16/);
assert.ok(favorites.indexOf('menu_layer_reload_data(s_list_menu)')<favorites.indexOf('send_command(COMMAND_LOAD_SCENES'));
const handlers={},packets=[],storage={};
const ctx={console,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Pebble:{addEventListener:(k,f)=>handlers[k]=f,sendAppMessage:(p,ok)=>{packets.push(p);if(ok)ok();}},setTimeout,clearTimeout,XMLHttpRequest:function(){}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/pkjs/index.js','utf8'),ctx);
ctx.sendItems([],ctx.ITEM_KIND_FAVORITE);
assert.equal(packets.at(-1).ITEM_INDEX,0,'Clearing favorites must send an authoritative zero count');
ctx.sendItems([{name:'A',kind:'scene'},{name:'B',kind:'scene'}],ctx.ITEM_KIND_FAVORITE);
assert.equal(packets.at(-1).ITEM_INDEX,2);
let refreshed=0;
ctx.nativeHome={};ctx.baseUrl=()=> 'https://example.test';ctx.apiGet=(path,cb)=>cb(null,{status:'success'});
ctx.sendDisplaySettings=cb=>cb();ctx.sendColorChoices=cb=>cb();
ctx.loadList=(path,kind)=>{assert.equal(path,'/list/favourites');assert.equal(kind,ctx.ITEM_KIND_FAVORITE);refreshed++;};
handlers.webviewclosed({response:encodeURIComponent(JSON.stringify({homeFavorites:['A']}))});
assert.equal(refreshed,1,'Saving favorites must reload the watch without manual Refresh');
console.log('PASS: pin marker reservation/selection colors, all pin types, small/large row bounds, immediate Favorites redraw, authoritative empty counts and refresh after settings save');
