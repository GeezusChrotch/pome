const {test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
function check(source,setup,main){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'organik-buttons-'));try{fs.writeFileSync(path.join(dir,'test.c'),'#include <stdbool.h>\n#include <stdint.h>\n#include <stddef.h>\n#include <string.h>\n#include <assert.h>\n'+setup+'\n'+source+'\nint main(void){'+main+'}');execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);execFileSync(path.join(dir,'test'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}

test('Double Back dispatches Pome shortcuts while obsolete theme shortcuts remain inert',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const run=src.slice(src.indexOf('static void run_shortcut('),src.indexOf('static void root_long_click('));
 const back=src.slice(src.indexOf('static void root_double_back('),src.indexOf('static void root_shortcut_click_config_provider(void *context) {'));
 check(run+back,`typedef int ClickRecognizerRef;static char*s_shortcut_double_back="off";enum{ITEM_KIND_FAVORITE=1,ITEM_KIND_SCENE,ITEM_KIND_ROOM};static int opened,voice,scenes,pins;static void toggle_highlighted_scene_pin(void){pins++;}static void vibes_short_pulse(void){}static void start_voice(void){voice++;}static void push_list(int kind){opened=kind;}static void run_scene(const char*name){assert(!strcmp(name,"Lights"));scenes++;}`,
 `root_double_back(0,0);assert(!opened&&!voice&&!scenes);s_shortcut_double_back="scenes";root_double_back(0,0);assert(opened==ITEM_KIND_SCENE);s_shortcut_double_back="scene:Lights";root_double_back(0,0);assert(scenes==1);s_shortcut_double_back="themes";opened=0;root_double_back(0,0);assert(!opened&&scenes==1);s_shortcut_double_back="pin_toggle";root_double_back(0,0);assert(pins==1);`);
});

test('Pin shortcut targets highlighted scenes and pinned root rows, never rooms or action rows',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const body=src.slice(src.indexOf('static void toggle_highlighted_scene_pin('),src.indexOf('static void run_shortcut('));
 check(body,`#include <stdio.h>
#define MAX_NAME_LENGTH 64
 typedef void Window;typedef struct{int section,row;}MenuIndex;
#define MenuIndex(s,r) ((MenuIndex){s,r})
 enum{ITEM_KIND_SCENE,ITEM_KIND_ROOM,MenuRowAlignNone};static void*s_root_window=(void*)1,*s_list_window=(void*)2,*s_room_scene_window=(void*)3,*top;static void*s_root_menu=(void*)1,*s_list_menu=(void*)2,*s_room_scene_menu=(void*)3;static int row,s_pin_count=1,s_room_scene_count=1,s_current_kind,changes;static char last[64];static bool fail;
 static struct Scene{char name[64];}items[]={{"Favorite"},{"Scene"}},s_room_scenes[]={{"Room scene"}};
 static int list_count(void){return 2;}static struct Scene*list_items(void){return items;}static void*window_stack_get_top_window(void){return top;}static MenuIndex menu_layer_get_selected_index(void*m){return(MenuIndex){0,row};}static void pin_name(int r,char*n){strcpy(n,"Old pinned scene");}static bool toggle_pin(const char*n){strcpy(last,n);changes++;return !fail;}static void show_voice_info(const char*t){}static void marquee_reset(void){}static int root_get_num_rows(void*m,int section,void*c){return 3;}static void menu_layer_reload_data(void*m){}static void menu_layer_set_selected_index(void*m,MenuIndex i,int align,bool animated){row=i.row;}`,
 `top=s_list_window;row=1;toggle_highlighted_scene_pin();assert(!strcmp(last,"Scene")&&changes==1);s_current_kind=ITEM_KIND_ROOM;toggle_highlighted_scene_pin();assert(changes==1);top=s_room_scene_window;row=0;toggle_highlighted_scene_pin();assert(!strcmp(last,"Room scene")&&changes==2);top=s_root_window;row=0;toggle_highlighted_scene_pin();assert(!strcmp(last,"Old pinned scene")&&changes==3);row=1;toggle_highlighted_scene_pin();assert(changes==3);top=s_list_window;s_current_kind=ITEM_KIND_SCENE;row=9;toggle_highlighted_scene_pin();assert(changes==3);`);
});
