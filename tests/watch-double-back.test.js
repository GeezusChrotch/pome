const {test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
function check(source,setup,main){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'organik-buttons-'));try{fs.writeFileSync(path.join(dir,'test.c'),'#include <stdbool.h>\n#include <stdint.h>\n#include <stddef.h>\n#include <string.h>\n#include <assert.h>\n'+setup+'\n'+source+'\nint main(void){'+main+'}');execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);execFileSync(path.join(dir,'test'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}

test('Double Back dispatches Pome shortcuts while obsolete theme shortcuts remain inert',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const run=src.slice(src.indexOf('static void run_shortcut('),src.indexOf('static void root_long_click('));
 const back=src.slice(src.indexOf('static void root_double_back('),src.indexOf('static void root_shortcut_click_config_provider(void *context) {'));
 check(run+back,`typedef int ClickRecognizerRef;static char*s_shortcut_double_back="off";enum{ITEM_KIND_FAVORITE=1,ITEM_KIND_SCENE,ITEM_KIND_ROOM};static int opened,voice,scenes;static void vibes_short_pulse(void){}static void start_voice(void){voice++;}static void push_list(int kind){opened=kind;}static void run_scene(const char*name){assert(!strcmp(name,"Lights"));scenes++;}`,
 `root_double_back(0,0);assert(!opened&&!voice&&!scenes);s_shortcut_double_back="scenes";root_double_back(0,0);assert(opened==ITEM_KIND_SCENE);s_shortcut_double_back="scene:Lights";root_double_back(0,0);assert(scenes==1);s_shortcut_double_back="themes";opened=0;root_double_back(0,0);assert(!opened&&scenes==1);`);
});
test('phone pin commands are idempotent and leave other saved pins untouched',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const body=src.slice(src.indexOf('  Tuple *pin_scene ='),src.indexOf('  Tuple *item_kind_tuple',src.indexOf('  Tuple *pin_scene =')));
 check('static void receive(void*iterator){'+body+'}',`#define MAX_NAME_LENGTH 64
 enum{MESSAGE_KEY_PIN_SCENE,MESSAGE_KEY_PIN_STATE};typedef struct{const char*cstring;int int32;}Value;typedef struct{Value*value;}Tuple;static Value name={"Scene",0},state={0,1};static Tuple names={&name},states={&state};static int changes,errors;static bool pinned;static void*s_root_menu;static Tuple*dict_find(void*i,int key){return key==MESSAGE_KEY_PIN_SCENE?&names:&states;}static int pin_index(const char*n){return pinned?0:-1;}static bool toggle_pin(const char*n){changes++;pinned=!pinned;return true;}static void set_status(const char*t){errors++;}static void menu_layer_reload_data(void*m){}`,
 `receive(0);receive(0);assert(pinned&&changes==1);state.int32=0;receive(0);receive(0);assert(!pinned&&changes==2);name.cstring="";state.int32=1;receive(0);assert(changes==2&&!errors);`);
});
