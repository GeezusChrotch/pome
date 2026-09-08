const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const src=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
const height=src.slice(src.indexOf('static int16_t theme_cell_height('),src.indexOf('static GFont theme_subtitle_font('));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-subtitle-layout-'));
try{
 fs.writeFileSync(path.join(dir,'test.c'),'#include <stdint.h>\n#include <assert.h>\ntypedef void MenuLayer;typedef void MenuIndex;static int s_theme_size,s_subtitle_size;\n'+height+'\nint main(void){for(s_subtitle_size=14;s_subtitle_size<=24;s_subtitle_size++)for(s_theme_size=14;s_theme_size<=30;s_theme_size++){int y=s_theme_size<=14?14:s_theme_size<=18?18:s_theme_size<=24?24:30;assert(theme_cell_height(0,0,0)>=y+s_subtitle_size+6);}}');
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);cp.execFileSync(path.join(dir,'test'));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
assert(src.includes('RESOURCE_ID_SUBTITLE_20'));assert(src.includes('GRect(text_x, subtitle_y, bounds.size.w - text_x - 3, s_subtitle_size + 6)'));
assert(!src.includes('"Section"'));
assert(src.includes('release_subtitle_font();cameras_capture'));
assert.equal((src.match(/release_subtitle_font\(\);cameras_open/g)||[]).length,2);
const font=JSON.parse(fs.readFileSync('package.json')).pebble.resources.media.find(r=>r.name==='SUBTITLE_20');assert(font&&font.targetPlatforms.includes('emery'));assert(new RegExp(font.characterRegex).test('°'));
const html=require('../src/pkjs/camera-settings').augment('<h2>Light colors</h2><script></script>',{home:{revision:1,items:[{token:0,name:'Voice',type:'Section'},{token:6,name:'Lounge',type:'Camera'}]}});
assert(!html.includes('>Section</small>'));assert(html.includes('>Camera</small>'));
console.log('PASS: enlarged subtitle bounds across all title sizes, Section labels removed, degree glyph and camera font release');
