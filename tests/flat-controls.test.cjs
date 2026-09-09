const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const src = fs.readFileSync('src/c/itsyhome-pebble.c', 'utf8');
const start = src.indexOf('  if (s_preset_kind == PRESET_CUSTOM_COLOR && cell_index->row != 0)');
const end = src.indexOf('  if (s_preset_kind == PRESET_COLOR ||', start);
assert(start > 0 && end > start);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pome-custom-color-'));
try {
  fs.writeFileSync(path.join(dir, 'test.c'), `
#include <stdint.h>
#include <assert.h>
enum {PRESET_CUSTOM_COLOR};
static int s_preset_kind = PRESET_CUSTOM_COLOR;
static uint16_t s_custom_hue;
static uint8_t s_custom_saturation;
static void *s_preset_menu;
static int redraws;
static void menu_layer_reload_data(void *m) {redraws++;}
typedef struct {int row;} MenuIndex;
static void adjust(int row) { MenuIndex index = {row}; MenuIndex *cell_index = &index;
${src.slice(start, end)}
}
int main(void) {
 s_custom_hue=359; adjust(1); assert(s_custom_hue==0);
 adjust(2); assert(s_custom_hue==359);
 adjust(3); assert(s_custom_hue==14);
 adjust(4); assert(s_custom_hue==359);
 for(int h=0;h<360;h++) {s_custom_hue=h; adjust(1); assert(s_custom_hue==(h+1)%360);}
 for(int s=0;s<=100;s++) {
  s_custom_saturation=s; adjust(5); assert(s_custom_saturation==(s==100?100:s+1));
  s_custom_saturation=s; adjust(6); assert(s_custom_saturation==(s==0?0:s-1));
 }
 s_custom_saturation=95; adjust(7); assert(s_custom_saturation==100);
 s_custom_saturation=5; adjust(8); assert(s_custom_saturation==0);
 int before=redraws; adjust(0); assert(redraws==before);
}
`);
  cp.execFileSync('cc', [path.join(dir, 'test.c'), '-o', path.join(dir, 'test')]);
  cp.execFileSync(path.join(dir, 'test'));
} finally { fs.rmSync(dir, {recursive: true, force: true}); }
assert(src.includes('type_supports_light_controls(s_selected_device_type) ? 6 + COLOR_COUNT : 1'));
assert(src.includes('if (strcmp(s_selected_device_type, "fan") == 0) return 5;'));
assert(src.includes('cell_index->row - 5 : cell_index->row - 1'));
assert(src.includes('MESSAGE_KEY_ITEM_HUE, s_custom_hue'));
assert(src.includes('MESSAGE_KEY_ITEM_SATURATION, s_custom_saturation'));
const action = src.slice(src.indexOf('static void action_select_click('), src.indexOf('static void confirm_click_handler('));
assert.equal((action.match(/window_stack_push/g) || []).length, 1, 'Only custom color opens another menu');
assert(!action.includes('window_stack_pop'));
console.log('PASS: flat light/group/fan controls, custom hue wrapping and full range, saturation clamping, draft-only adjustment and explicit apply');
