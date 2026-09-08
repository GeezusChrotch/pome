#include <pebble.h>
#include "touch_menu.h"
#include "camera_pan.h"
#include "cameras.h"
#if defined(PBL_PLATFORM_EMERY) && POME_EXPERIMENTAL_CAMERAS
enum {CMD=100,RID,KIND,INDEX,NAME,ID,W,H,DATA,OFFSET,TOTAL,AGE,ERROR,PAGE,PAGES,COUNT,AUTO_PAN};
static Window *main_window,*image_window;
static MenuLayer *menu;
static Layer *image_layer;
static uint8_t *pixels;
static AppTimer *timeout;
static AppTimer *age_timer;
static int image_age;
static time_t image_received_at;
static char names[10][64],ids[10][40],message[100]="Connecting to phone…";
static int ages[10],count,page,pages=1,rid=1,received,total,width,height;
static char image_timestamp[32]="Timestamp unavailable";
static bool loading=true,viewing=false,complete=false;
static bool history_mode;
static void age_tick(void *context){
  age_timer=NULL;if(!viewing||!complete)return;
  layer_mark_dirty(image_layer);age_timer=app_timer_register(1000,age_tick,NULL);
}
static char selected_camera[40],selected_photo[40];
static int pan_x;
static AppTimer *pan_timer;
static int auto_seconds=3;
static uint32_t pan_start;
static uint32_t milliseconds(void){time_t sec;uint16_t ms;time_ms(&sec,&ms);return (uint32_t)sec*1000+ms;}
static void stop_pan(void){if(pan_timer){app_timer_cancel(pan_timer);pan_timer=NULL;}}
static int image_pan_limit(void){return pan_limit(width,layer_get_bounds(image_layer).size.w);}
static void auto_tick(void *context){
  pan_timer=NULL;if(!viewing||!complete||auto_seconds<=0)return;
  uint32_t elapsed=milliseconds()-pan_start;
  pan_x=auto_position(image_pan_limit(),elapsed,auto_seconds*1000);layer_mark_dirty(image_layer);
  if(elapsed<(uint32_t)auto_seconds*1000)pan_timer=app_timer_register(50,auto_tick,NULL);
}
static void pan_to(int x){stop_pan();if(!complete)return;pan_x=pan_clamp(x,image_pan_limit());layer_mark_dirty(image_layer);}
static void pan_middle(ClickRecognizerRef r,void *c){if(complete)pan_to(pan_next(pan_x,image_pan_limit(),layer_get_bounds(image_layer).size.w/2));}
static void pan_left(ClickRecognizerRef r,void *c){pan_to(pan_x-40);}
static void pan_right(ClickRecognizerRef r,void *c){pan_to(pan_x+40);}
static void image_clicks(void *c){
  window_single_click_subscribe(BUTTON_ID_SELECT,pan_middle);
  window_single_repeating_click_subscribe(BUTTON_ID_UP,100,pan_right);
  window_single_repeating_click_subscribe(BUTTON_ID_DOWN,100,pan_left);
}
#if defined(PBL_TOUCH)
static bool touch_tracking;
static int touch_x,touch_y,touch_base;
static void image_touch(const TouchEvent *event,void *context){
  if(event->non_navigational||!complete||window_stack_get_top_window()!=image_window){touch_tracking=false;return;}
  if(event->type==TouchEvent_Touchdown){stop_pan();touch_tracking=true;touch_x=event->x;touch_y=event->y;touch_base=pan_x;return;}
  if(!touch_tracking)return;
  int dx=event->x-touch_x,dy=event->y-touch_y;
  if(abs(dx)>8&&abs(dx)>abs(dy)){pan_to(touch_base-dx);}
  if(event->type==TouchEvent_Liftoff){touch_tracking=false;}
}
#endif
static void image_appear(Window *window){
#if defined(PBL_TOUCH)
  touch_tracking=false;app_touch_navigation_enable(false);touch_service_subscribe(image_touch,NULL);
#endif
}
static void reload(void){menu_layer_reload_data(menu);}
static void cancel_timer(void){if(timeout){app_timer_cancel(timeout);timeout=NULL;}}
static void timed_out(void *unused){timeout=NULL;snprintf(message,sizeof(message),"Connection timed out. Back to retry.");loading=false;if(viewing)layer_mark_dirty(image_layer);else reload();}
static void request(int cmd,const char *id){
  DictionaryIterator *out; rid++;cancel_timer();
  if(app_message_outbox_begin(&out)!=APP_MSG_OK){snprintf(message,sizeof(message),"Phone busy. Back to retry.");return;}
  dict_write_int32(out,CMD,cmd);dict_write_int32(out,RID,rid);
  dict_write_int32(out,W,layer_get_bounds(window_get_root_layer(main_window)).size.w);
  dict_write_int32(out,PAGE,page);if(id)dict_write_cstring(out,ID,id);
  if(cmd==2&&selected_photo[0])dict_write_cstring(out,117,selected_photo);
  app_message_outbox_send();
  if(cmd!=3)timeout=app_timer_register(cmd==5?55000:45000,timed_out,NULL);
}
static uint16_t rows(MenuLayer *m,uint16_t s,void *c){return loading ? 1 : history_mode ? count+1 : !count ? 1 : count+(page>0)+(page+1<pages);}
static const char *pin_gesture(void){
  if(pome_pin_button(BUTTON_ID_BACK))return "Double Back";
  if(pome_pin_button(BUTTON_ID_UP))return "Hold Up";
  if(pome_pin_button(BUTTON_ID_SELECT))return "Hold Select";
  if(pome_pin_button(BUTTON_ID_DOWN))return "Hold Down";
  return NULL;
}
static void draw_row(GContext *ctx,const Layer *cell,MenuIndex *idx,void *c){
  if(loading||(!count&&!history_mode)){menu_cell_basic_draw(ctx,cell,message,NULL,NULL);return;}
  MenuIndex adjusted=*idx;
  if(history_mode){if(idx->row==0){menu_cell_basic_draw(ctx,cell,"Capture now","Wake camera for a fresh photo",NULL);return;}adjusted.row--;idx=&adjusted;}
  if(idx->row<count){char age[48],clock[20];photo_age(clock,sizeof(clock),ages[idx->row]);if(!history_mode){bool pinned=pome_camera_pinned(ids[idx->row]);const char *gesture=pin_gesture();if(gesture)snprintf(age,sizeof(age),"%s%s to %s",pinned?"Pinned · ":"",gesture,pinned?"unpin":"pin");else snprintf(age,sizeof(age),"%sSet Pin / unpin in Shortcuts",pinned?"Pinned · ":"");}else if(ages[idx->row]<0)snprintf(age,sizeof(age),"Not cached yet");else snprintf(age,sizeof(age),"Age: %s",clock);menu_cell_basic_draw(ctx,cell,names[idx->row],age,NULL);}
  else menu_cell_basic_draw(ctx,cell,(page>0 && idx->row==count)?"Previous page":"Next page",NULL,NULL);
}
static void image_draw(Layer *layer,GContext *ctx){
  GRect bounds=layer_get_bounds(layer);graphics_context_set_fill_color(ctx,GColorBlack);graphics_fill_rect(ctx,bounds,0,GCornerNone);
  if(complete&&pixels){
    // Native-resolution pixels: cropping only, never enlarge on the watch.
    int margin=width<bounds.size.w?(bounds.size.w-width)/2:0;
    GBitmap *framebuffer=graphics_capture_frame_buffer_format(ctx,GBitmapFormat8Bit);
    for(int y=0;y<bounds.size.h;y++){
      GBitmapDataRowInfo row={0};if(framebuffer)row=gbitmap_get_data_row_info(framebuffer,y);
      for(int x=margin;x<bounds.size.w&&x<margin+width;x++){
        int sx=x-margin+pan_x;
        uint8_t color=camera_pixel(pixels,y*width+sx,total);
        if(framebuffer){if(x>=row.min_x&&x<=row.max_x)row.data[x]=color;}
        else {graphics_context_set_stroke_color(ctx,(GColor){.argb=color});graphics_draw_pixel(ctx,GPoint(x,y));}
      }
    }
    if(framebuffer)graphics_release_frame_buffer(ctx,framebuffer);
    // 21px stamp (50% larger than 14px), outlined over the full photo.
    char caption[72];int elapsed=(int)(time(NULL)-image_received_at);if(elapsed<0)elapsed=0;
    photo_caption(caption,sizeof(caption),image_timestamp,image_age<0?-1:image_age+elapsed);
    GFont font=fonts_get_system_font(FONT_KEY_ROBOTO_CONDENSED_21);
    GSize caption_size=graphics_text_layout_get_content_size(caption,font,
      GRect(0,0,bounds.size.w-4,52),GTextOverflowModeWordWrap,GTextAlignmentCenter);
    int caption_height=caption_size.h+4;if(caption_height<26)caption_height=26;
    graphics_context_set_text_color(ctx,GColorBlack);
    for(int dy=-1;dy<=1;dy++)for(int dx=-1;dx<=1;dx++)if(dx||dy)
      graphics_draw_text(ctx,caption,font,GRect(2+dx,bounds.size.h-caption_height-1+dy,bounds.size.w-4,caption_height),GTextOverflowModeWordWrap,GTextAlignmentCenter,NULL);
    graphics_context_set_text_color(ctx,GColorWhite);
    graphics_draw_text(ctx,caption,font,GRect(2,bounds.size.h-caption_height-1,bounds.size.w-4,caption_height),GTextOverflowModeWordWrap,GTextAlignmentCenter,NULL);
  }
  else {graphics_context_set_text_color(ctx,GColorWhite);graphics_draw_text(ctx,message,fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD),grect_inset(bounds,GEdgeInsets(18,8)),GTextOverflowModeWordWrap,GTextAlignmentCenter,NULL);}
}
static void image_disappear(Window *window){
  if(age_timer){app_timer_cancel(age_timer);age_timer=NULL;}
#if defined(PBL_TOUCH)
  touch_tracking=false;touch_service_unsubscribe();app_touch_navigation_enable(true);
#endif
  stop_pan();viewing=false;cancel_timer();free(pixels);pixels=NULL;complete=false;
  if(history_mode){count=0;loading=true;snprintf(message,sizeof(message),"Loading saved images…");request(4,selected_camera);reload();}
  else request(3,NULL);
}
static void select_row(MenuLayer *m,MenuIndex *idx,void *ctx){
  if(loading)return;
  if(history_mode){
    selected_photo[0]=0;
    if(idx->row>0)snprintf(selected_photo,sizeof(selected_photo),"%s",ids[idx->row-1]);
    viewing=true;complete=false;received=total=0;
    snprintf(message,sizeof(message),idx->row==0?"Capturing fresh image…":"Loading saved image…");
    window_stack_push(image_window,true);layer_mark_dirty(image_layer);
    request(idx->row==0?5:2,selected_camera);return;
  }
  if(!count){loading=true;request(1,NULL);reload();return;}
  if(idx->row>=count){page+=(page>0&&idx->row==count)?-1:1;count=0;loading=true;request(1,NULL);reload();return;}
  snprintf(selected_camera,sizeof(selected_camera),"%s",ids[idx->row]);
  history_mode=true;count=0;loading=true;snprintf(message,sizeof(message),"Loading saved images…");request(4,selected_camera);reload();
}
static void camera_back(ClickRecognizerRef r,void *ctx){
  if(history_mode){history_mode=false;count=0;loading=true;request(1,NULL);reload();}
  else{cancel_timer();request(3,NULL);window_stack_pop(true);}
}
static void camera_up(ClickRecognizerRef r,void *c){menu_layer_set_selected_next(menu,true,MenuRowAlignCenter,true);}
static void camera_down(ClickRecognizerRef r,void *c){menu_layer_set_selected_next(menu,false,MenuRowAlignCenter,true);}
static void camera_select(ClickRecognizerRef r,void *c){MenuIndex i=menu_layer_get_selected_index(menu);select_row(menu,&i,NULL);}
static void camera_pin(ClickRecognizerRef r,void *c){
  int row=menu_layer_get_selected_index(menu).row;if(loading||history_mode||row>=count)return;
  if(pome_camera_toggle_pin(ids[row],names[row])){vibes_short_pulse();reload();}else vibes_double_pulse();
}
static void camera_clicks(void *ctx){
  window_single_click_subscribe(BUTTON_ID_BACK,camera_back);
  if(pome_pin_button(BUTTON_ID_BACK))window_multi_click_subscribe(BUTTON_ID_BACK,2,2,300,true,camera_pin);
  window_single_repeating_click_subscribe(BUTTON_ID_UP,150,camera_up);
  window_single_repeating_click_subscribe(BUTTON_ID_DOWN,150,camera_down);
  window_single_click_subscribe(BUTTON_ID_SELECT,camera_select);
  const ButtonId buttons[]={BUTTON_ID_UP,BUTTON_ID_SELECT,BUTTON_ID_DOWN};
  const ClickHandler singles[]={camera_up,camera_select,camera_down};
  for(int i=0;i<3;i++)if(pome_pin_button(buttons[i])){
    window_single_click_subscribe(buttons[i],singles[i]);
    window_long_click_subscribe(buttons[i],700,camera_pin,NULL);
  }
}
void cameras_update_shortcuts(void){if(main_window){window_set_click_config_provider(main_window,camera_clicks);reload();}}
static int val(DictionaryIterator *in,int key){Tuple*t=dict_find(in,key);return t?t->value->int32:0;}
static void inbox(DictionaryIterator *in,void *ctx){
  int kind=val(in,KIND);
  if(kind==7)return;
  if(val(in,RID)!=rid)return;
  if(kind==8&&viewing){Tuple*t=dict_find(in,ERROR);if(t)snprintf(message,sizeof(message),"%s",t->value->cstring);layer_mark_dirty(image_layer);return;}
  if(kind==6){Tuple*t=dict_find(in,ERROR);snprintf(message,sizeof(message),"%s",t?t->value->cstring:"Error");loading=false;cancel_timer();if(viewing)layer_mark_dirty(image_layer);else reload();return;}
  if(!viewing){
    if(kind==1){int i=val(in,INDEX);Tuple*n=dict_find(in,NAME),*id=dict_find(in,ID);if(i>=0&&i<10&&n&&id){snprintf(names[i],64,"%s",n->value->cstring);snprintf(ids[i],40,"%s",id->value->cstring);ages[i]=val(in,AGE);}}
    if(kind==2){count=val(in,COUNT);if(count<0||count>10)count=0;page=val(in,PAGE);pages=val(in,PAGES);loading=false;cancel_timer();snprintf(message,sizeof(message),"No enabled cameras");reload();menu_layer_set_selected_index(menu,MenuIndex(0,0),MenuRowAlignTop,false);}
    return;
  }
  if(kind==3){
    cancel_timer();timeout=app_timer_register(45000,timed_out,NULL);
    width=val(in,W);height=val(in,H);total=val(in,TOTAL);received=0;complete=false;
    GRect b=layer_get_bounds(image_layer);
    int byte_limit=b.size.w==144?48000:110000;
    if(width<1||width>2048||height!=b.size.h||total!=(width*height*6+7)/8||total>byte_limit){snprintf(message,sizeof(message),"Invalid native frame");total=0;return;}
    free(pixels);pixels=malloc(total);
    if(!pixels){snprintf(message,sizeof(message),"Not enough memory");total=0;return;}
    Tuple *auto_value=dict_find(in,AUTO_PAN);auto_seconds=auto_value?auto_value->value->int32:3;
    if(auto_seconds<0||auto_seconds>30)auto_seconds=3;
    Tuple *stamp=dict_find(in,MESSAGE_KEY_CAMERA_TIMESTAMP);
    image_age=dict_find(in,AGE)?val(in,AGE):-1;image_received_at=time(NULL);
    snprintf(image_timestamp,sizeof(image_timestamp),"%s",stamp&&stamp->type==TUPLE_CSTRING?stamp->value->cstring:"Timestamp unavailable");
    snprintf(message,sizeof(message),"Receiving image…\n%s",image_timestamp);layer_mark_dirty(image_layer);
  }
  if(kind==4&&pixels&&total>0){Tuple*t=dict_find(in,DATA);int offset=val(in,OFFSET);if(!t||offset!=received||t->length>total-received){total=0;snprintf(message,sizeof(message),"Incomplete image. Back to retry.");layer_mark_dirty(image_layer);return;}
    const uint8_t *bytes=(const uint8_t *)t->value;
    memcpy(pixels+received,bytes,t->length);received+=t->length;
    if(received==total||received%9000<t->length){snprintf(message,sizeof(message),"Receiving photo…\n%d%%",received*100/total);layer_mark_dirty(image_layer);}
  }
  if(kind==5&&pixels&&total>0&&received==total){complete=true;stop_pan();pan_x=auto_seconds>0?0:image_pan_limit()/2;cancel_timer();layer_mark_dirty(image_layer);if(!age_timer)age_timer=app_timer_register(1000,age_tick,NULL);if(auto_seconds>0&&image_pan_limit()>0){pan_start=milliseconds();pan_timer=app_timer_register(50,auto_tick,NULL);}}
}
static void camera_init(void){
  main_window=window_create();image_window=window_create();window_set_background_color(image_window,GColorBlack);
  Layer *root=window_get_root_layer(main_window);menu=organik_menu_create(layer_get_bounds(root));
  menu_layer_set_callbacks(menu,NULL,(MenuLayerCallbacks){.get_num_rows=rows,.draw_row=draw_row,.select_click=select_row});menu_layer_set_click_config_onto_window(menu,main_window);layer_add_child(root,menu_layer_get_layer(menu));
  image_layer=layer_create(layer_get_bounds(window_get_root_layer(image_window)));layer_set_update_proc(image_layer,image_draw);layer_add_child(window_get_root_layer(image_window),image_layer);
  window_set_click_config_provider(image_window,image_clicks);
  window_set_window_handlers(image_window,(WindowHandlers){.appear=image_appear,.disappear=image_disappear});
  window_set_click_config_provider(main_window,camera_clicks);
}
void cameras_deinit(void){if(!main_window)return;if(age_timer){app_timer_cancel(age_timer);age_timer=NULL;}stop_pan();cancel_timer();free(pixels);layer_destroy(image_layer);menu_layer_destroy(menu);window_destroy(image_window);window_destroy(main_window);}
bool cameras_inbox(DictionaryIterator *in){if(!dict_find(in,KIND))return false;if(main_window)inbox(in,NULL);return true;}
void cameras_open(void){if(!main_window)camera_init();history_mode=false;loading=true;count=0;page=0;snprintf(message,sizeof(message),"Loading cameras…");window_stack_push(main_window,true);request(1,NULL);reload();}
void cameras_capture(const char *id){
  if(!main_window)camera_init();
  history_mode=false;selected_photo[0]=0;
  snprintf(selected_camera,sizeof(selected_camera),"%s",id);viewing=true;complete=false;received=total=0;
  snprintf(message,sizeof(message),"Capturing fresh image…");window_stack_push(image_window,true);layer_mark_dirty(image_layer);request(5,selected_camera);
}
#else
bool cameras_inbox(DictionaryIterator *in){return dict_find(in,102)!=NULL;}
void cameras_open(void){}
void cameras_capture(const char *id){}
void cameras_update_shortcuts(void){}
void cameras_deinit(void){}
#endif
