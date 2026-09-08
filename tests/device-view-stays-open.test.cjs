const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const source=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
const start=source.indexOf('  Tuple *status = dict_find(iterator, MESSAGE_KEY_STATUS);');
const end=source.indexOf('  Tuple *kind_tuple =',start);
assert(start>=0&&end>start);
const body=source.slice(start,end);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-device-view-'));
try{
 fs.writeFileSync(path.join(dir,'test.c'),`
#include <assert.h>
#include <stdbool.h>
#include <string.h>
typedef struct {const char *cstring;} Value;
typedef struct {Value *value;} Tuple;
static Value value;static Tuple tuple={&value};
enum {MESSAGE_KEY_STATUS,CONFIRM_VOICE_WORKING=1,COMMAND_LOAD_SCENES};
static int s_confirm_mode,pops,pulses,scenes,voice;static bool s_voice_pending;
static void *s_action_menu,*s_preset_menu;
static Tuple *dict_find(void *iterator,int key){return &tuple;}
static void set_status(const char *text){}
static void show_voice_result(const char *text){voice++;}
static void vibes_double_pulse(void){pulses++;}
static void window_stack_pop(bool animated){pops++;}
static void send_command(int command,void*a,void*b,void*c){assert(command==COMMAND_LOAD_SCENES);scenes++;}
static void receive(void *iterator){${body}}
int main(void){
 const char *statuses[]={"Device toggled","All lights on","All lights off","Brightness set","Color set","Room brightness set","Room color set","Speed set","Position set to 50%"};
 // Room device, pinned device, picker and delayed replies after the user navigated away.
 for(int view=0;view<4;view++){
  s_action_menu=view<3?(void*)1:0;s_preset_menu=view==2?(void*)2:0;
  for(int repeat=0;repeat<3;repeat++)for(unsigned i=0;i<sizeof(statuses)/sizeof(statuses[0]);i++){
   value.cstring=statuses[i];receive(0);assert(pops==0&&scenes==0&&voice==0);
  }
 }
 assert(pulses==4*3*7);
 value.cstring="Scene complete";receive(0);assert(scenes==1&&pops==0);
 s_voice_pending=true;value.cstring="Device toggled";receive(0);assert(voice==1&&pops==0);
}
`);
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);
 cp.execFileSync(path.join(dir,'test'));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
assert(source.includes('if(button==BUTTON_ID_BACK){window_stack_pop(true);return;}'));
console.log('PASS: repeated device/group adjustments and delayed acknowledgements never pop views; scene/voice handling and explicit Back preserved');
