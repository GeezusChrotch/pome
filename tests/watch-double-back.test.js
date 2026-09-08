const {test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
function check(source,setup,main){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'organik-buttons-'));try{fs.writeFileSync(path.join(dir,'test.c'),'#include <stdbool.h>\n#include <stdint.h>\n#include <stddef.h>\n#include <string.h>\n#include <assert.h>\n'+setup+'\n'+source+'\nint main(void){'+main+'}');execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);execFileSync(path.join(dir,'test'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}

test('Camera Double Back honors pin assignment and ignores loading, history and pagination rows',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/cameras.c'),'utf8');
 const body=src.slice(src.indexOf('static void camera_pin('),src.indexOf('static int val('));
 check(body,`typedef int ClickRecognizerRef;typedef struct{int row;}MenuIndex;typedef void(*Handler)(ClickRecognizerRef,void*);typedef Handler ClickHandler;typedef int ButtonId;
 enum{BUTTON_ID_BACK,BUTTON_ID_UP,BUTTON_ID_SELECT,BUTTON_ID_DOWN};static void *menu,*main_window;
 static int assigned;static bool loading,history_mode,pinned;static int row,count=2,changes;static Handler single,multi,holds[4],singles[4];static bool repeats[4];
 static char ids[2][40]={"camera-1","camera-2"},names[2][64]={"Catio","Lounge"};
 static MenuIndex menu_layer_get_selected_index(void*m){return(MenuIndex){row};}
 static bool pome_camera_toggle_pin(const char*id,const char*name){assert(!strcmp(id,"camera-1"));changes++;pinned=!pinned;return true;}
 static bool pome_pin_button(int b){return (assigned&(1<<b))!=0;}
 static void vibes_short_pulse(void){}static void vibes_double_pulse(void){}static void reload(void){}
 static void camera_back(ClickRecognizerRef r,void*c){}static void camera_up(ClickRecognizerRef r,void*c){}static void camera_down(ClickRecognizerRef r,void*c){}static void camera_select(ClickRecognizerRef r,void*c){}
 static void window_single_click_subscribe(int b,Handler h){singles[b]=h;repeats[b]=false;if(b==BUTTON_ID_BACK)single=h;}
 static void window_multi_click_subscribe(int b,int min,int max,int timeout,bool last,Handler h){assert(b==BUTTON_ID_BACK&&min==2&&max==2&&timeout==300&&last);multi=h;}
 static void window_single_repeating_click_subscribe(int b,int t,Handler h){singles[b]=h;repeats[b]=true;}static void window_long_click_subscribe(int b,int t,Handler h,Handler up){assert(t==700);holds[b]=h;}
 static void window_set_click_config_provider(void*w,void(*h)(void*)){multi=NULL;memset(holds,0,sizeof(holds));h(NULL);}`,
 `camera_clicks(NULL);assert(single==camera_back&&!multi&&!holds[BUTTON_ID_SELECT]);assigned=1;main_window=(void*)1;cameras_update_shortcuts();assert(multi==camera_pin);multi(0,0);assert(pinned&&changes==1);multi(0,0);assert(!pinned&&changes==2);loading=true;multi(0,0);loading=false;history_mode=true;multi(0,0);history_mode=false;row=count;multi(0,0);assert(changes==2);row=0;
 for(assigned=0;assigned<16;assigned++){cameras_update_shortcuts();assert((multi!=NULL)==!!(assigned&1));for(int b=1;b<4;b++){assert((holds[b]!=NULL)==!!(assigned&(1<<b)));if(holds[b]){int before=changes;holds[b](0,0);assert(changes==before+1);if(b!=BUTTON_ID_SELECT)assert(!repeats[b]);}else if(b!=BUTTON_ID_SELECT)assert(repeats[b]);}assert(singles[BUTTON_ID_UP]==camera_up&&singles[BUTTON_ID_DOWN]==camera_down&&singles[BUTTON_ID_SELECT]==camera_select);}
 assigned=0;cameras_update_shortcuts();assert(!multi&&single==camera_back&&!holds[BUTTON_ID_SELECT]);`);
});

test('Double Back dispatches Pome shortcuts while obsolete theme shortcuts remain inert',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const run=src.slice(src.indexOf('static void run_shortcut('),src.indexOf('static void root_long_click('));
 const back=src.slice(src.indexOf('static void root_double_back('),src.indexOf('static void root_shortcut_click_config_provider(void *context) {'));
 check(run+back,`typedef int ClickRecognizerRef;static char*s_shortcut_double_back="off";enum{ITEM_KIND_FAVORITE=1,ITEM_KIND_SCENE,ITEM_KIND_ROOM};static int opened,voice,scenes,pins;static void toggle_highlighted_scene_pin(void){pins++;}static void vibes_short_pulse(void){}static void start_voice(void){voice++;}static void push_list(int kind){opened=kind;}static void run_scene(const char*name){assert(!strcmp(name,"Lights"));scenes++;}`,
 `root_double_back(0,0);assert(!opened&&!voice&&!scenes);s_shortcut_double_back="scenes";root_double_back(0,0);assert(opened==ITEM_KIND_SCENE);s_shortcut_double_back="scene:Lights";root_double_back(0,0);assert(scenes==1);s_shortcut_double_back="themes";opened=0;root_double_back(0,0);assert(!opened&&scenes==1);s_shortcut_double_back="pin_toggle";root_double_back(0,0);assert(pins==1);`);
});

test('Pin shortcut targets scenes, rooms and pinned root rows, never action rows',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const body=src.slice(src.indexOf('static void toggle_highlighted_scene_pin('),src.indexOf('static void run_shortcut('));
 check(body,`#include <stdio.h>
 static int home_pin_at_row(int row){return row==0?0:-1;}
#define MAX_NAME_LENGTH 64
 typedef struct{char room[64],id[40],type[24];uint8_t sensor;}PinAccessory;static PinAccessory last_accessory;
 typedef void Window;typedef struct{int section,row;}MenuIndex;
#define MenuIndex(s,r) ((MenuIndex){s,r})
 enum{ITEM_KIND_SCENE,ITEM_KIND_ROOM,MenuRowAlignNone};static void*s_root_window=(void*)1,*s_list_window=(void*)2,*s_room_scene_window=(void*)3,*top;static void*s_root_menu=(void*)1,*s_list_menu=(void*)2,*s_room_scene_menu=(void*)3;static int row,s_pin_count=1,s_room_scene_count=1,s_current_kind,changes;static char last[64];static bool fail;
 static void *s_device_window=(void*)4,*s_sensor_window=(void*)5,*s_device_menu=(void*)4,*s_sensor_menu=(void*)5;static bool s_device_loading;static char s_device_error[1],s_selected_room[64]="Office",s_device_ids[1][40]={"service-1"};static int s_device_count=1,s_sensor_count=1;static struct{char name[64],type[24];}s_devices[]={{"Lamp","light"}},s_sensors[]={{"Temperature","temperature"}};static int sensors_visible(void){return 0;}static int light_count(void){return 1;}static bool pin_accessory(int row,PinAccessory*a){return false;}
 static struct Scene{char name[64];}items[]={{"Favorite"},{"Scene"}},s_room_scenes[]={{"Room scene"}};
 static int list_count(void){return 2;}static struct Scene*list_items(void){return items;}static void*window_stack_get_top_window(void){return top;}static MenuIndex menu_layer_get_selected_index(void*m){return(MenuIndex){0,row};}static void pin_name(int r,char*n){strcpy(n,"Old pinned scene");}static bool toggle_pin_record(const char*n,const PinAccessory*a){if(a)last_accessory=*a;strcpy(last,n);changes++;return !fail;}static void show_voice_info(const char*t){}static void marquee_reset(void){}static int root_get_num_rows(void*m,int section,void*c){return 3;}static void menu_layer_reload_data(void*m){}static void menu_layer_set_selected_index(void*m,MenuIndex i,int align,bool animated){row=i.row;}`,
 `top=s_list_window;row=1;toggle_highlighted_scene_pin();assert(!strcmp(last,"Scene")&&changes==1);s_current_kind=ITEM_KIND_ROOM;toggle_highlighted_scene_pin();assert(changes==2&&last_accessory.sensor==3&&!strcmp(last_accessory.room,"Scene"));top=s_room_scene_window;row=0;toggle_highlighted_scene_pin();assert(!strcmp(last,"Room scene")&&changes==3);top=s_root_window;row=0;toggle_highlighted_scene_pin();assert(!strcmp(last,"Old pinned scene")&&changes==4);row=1;toggle_highlighted_scene_pin();assert(changes==4);top=s_list_window;s_current_kind=ITEM_KIND_SCENE;row=9;toggle_highlighted_scene_pin();assert(changes==4);top=s_device_window;row=1;toggle_highlighted_scene_pin();assert(changes==4);row=2;toggle_highlighted_scene_pin();assert(changes==5&&!strcmp(last,"Lamp")&&!strcmp(last_accessory.id,"service-1")&&!strcmp(last_accessory.room,"Office"));top=s_sensor_window;row=0;toggle_highlighted_scene_pin();assert(changes==6&&last_accessory.sensor==1);`);
});
test('device pins open controls only for a unique reachable match without actuating it',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/c/itsyhome-pebble.c'),'utf8');
 const body=src.slice(src.indexOf('static void focus_open_pin('),src.indexOf('static void inbox_received('));
 check(body,`#include <stdio.h>
 typedef struct{int section,row;}MenuIndex;
#define MenuIndex(s,r) ((MenuIndex){s,r})
 enum{MenuRowAlignCenter};static struct{char room[64],id[40],type[24];uint8_t sensor;}s_open_pin;static char s_open_pin_name[64],s_selected_device[64],s_selected_device_type[24],s_selected_device_id[40];static int s_sensor_count=1,s_device_count=2,selected=-1,errors,pushes;static void*s_sensor_window=(void*)1,*s_sensor_menu=(void*)1,*s_action_window=(void*)2,*last_window;
 typedef struct{char name[64],type[24];bool reachable;}HomeItem;static HomeItem s_devices[]={{"Renamed lamp","light",true},{"Lamp","light",true}},s_sensors[]={{"Temp","temperature",true}};static char s_device_ids[2][40]={"id1","id2"};static bool type_is_toggle_safe(const char*t){return !strcmp(t,"light")||!strcmp(t,"switch");}static void show_voice_info(const char*t){errors++;}static void window_stack_push(void*w,bool animated){pushes++;last_window=w;}static void menu_layer_set_selected_index(void*m,MenuIndex i,int align,bool animated){selected=i.row;}`,
 `strcpy(s_open_pin_name,"Old lamp");strcpy(s_open_pin.id,"id1");focus_open_pin();assert(pushes==1&&last_window==s_action_window&&!strcmp(s_selected_device,"Renamed lamp")&&!strcmp(s_selected_device_id,"id1")&&!errors);strcpy(s_open_pin_name,"Old lamp");strcpy(s_device_ids[1],"id1");focus_open_pin();assert(errors==1&&pushes==1);strcpy(s_device_ids[1],"id2");s_devices[0].reachable=false;strcpy(s_open_pin_name,"Old lamp");focus_open_pin();assert(errors==2&&pushes==1);s_devices[0].reachable=true;strcpy(s_devices[0].type,"switch");strcpy(s_open_pin_name,"Old lamp");focus_open_pin();assert(pushes==2&&!strcmp(s_selected_device_type,"switch"));s_open_pin.sensor=1;s_open_pin.id[0]=0;strcpy(s_open_pin.type,"temperature");strcpy(s_open_pin_name,"Temp");focus_open_pin();assert(pushes==3&&selected==0&&last_window==s_sensor_window);`);
});
