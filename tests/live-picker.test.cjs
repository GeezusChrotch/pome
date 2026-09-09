const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const src=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
const body=src.slice(src.indexOf('static void picker_adjust('),src.indexOf('static void picker_send('));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-live-picker-'));
try {
 fs.writeFileSync(path.join(dir,'test.c'),`
#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
enum {BUTTON_ID_UP, BUTTON_ID_DOWN};
typedef int ClickRecognizerRef;
static bool repeating,s_picker_pending;
static uint16_t s_custom_hue;
static uint8_t s_custom_saturation,s_color_picker_field;
static void *s_color_picker_layer;
static int schedules;
static bool click_recognizer_is_repeating(int r){return repeating;}
static int click_recognizer_get_button_id(int r){return r;}
static void layer_mark_dirty(void *p){}
static void picker_schedule(void){schedules++;}
${body}
int main(void){
 for(int hue=0;hue<360;hue++){
  s_custom_hue=hue;picker_adjust(BUTTON_ID_UP,0);assert(s_custom_hue==(hue+1)%360);
  picker_adjust(BUTTON_ID_DOWN,0);assert(s_custom_hue==hue);
 }
 assert(s_picker_pending&&schedules==720);
 int before=schedules;picker_select(0,0);assert(s_color_picker_field==1&&schedules==before);
 for(int sat=0;sat<=100;sat++){
  s_custom_saturation=sat;picker_adjust(BUTTON_ID_UP,0);assert(s_custom_saturation==(sat==100?100:sat+1));
 }
 repeating=true;s_custom_saturation=98;picker_adjust(BUTTON_ID_UP,0);assert(s_custom_saturation==100);
 s_custom_saturation=2;picker_adjust(BUTTON_ID_DOWN,0);assert(s_custom_saturation==0);
 picker_select(0,0);assert(s_color_picker_field==0);
 s_custom_hue=358;picker_adjust(BUTTON_ID_UP,0);assert(s_custom_hue==3);
}
`);
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);
 cp.execFileSync(path.join(dir,'test'));
} finally {fs.rmSync(dir,{recursive:true,force:true});}
assert(src.includes('"Toggle", "25%", "50%", "75%", "100%"'));
const picker=src.slice(src.indexOf('static GColor picker_color('),src.indexOf('static void theme_window_load('));
assert(!picker.includes('Apply Color'));
assert(picker.includes('!s_picker_busy && !s_picker_timer'));
assert(picker.includes('app_timer_register(200, picker_send, NULL)'));
assert(picker.includes('touch_service_subscribe(picker_touch, NULL)'));
assert(picker.includes('touch_service_unsubscribe()'));
assert(picker.includes('app_timer_cancel(s_picker_timer)'));
console.log('PASS: live visual picker full-range adjustments, held acceleration, Select changes field only, one throttled in-flight write, touch lifecycle and cancellation');
