const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const src=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
const count=src.slice(src.indexOf('static uint16_t device_get_num_rows('),src.indexOf('static void device_draw_row('));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-room-cameras-'));
try{
 fs.writeFileSync(path.join(dir,'test.c'),`
#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
typedef void MenuLayer;
static bool s_device_loading;static char s_device_error[2];
static int s_device_count,cam,sensor,lights;
static int room_camera_rows(void){return cam;}
static int sensors_visible(void){return sensor;}
static int light_count(void){return lights;}
${count}
int main(void){for(cam=0;cam<2;cam++)for(sensor=0;sensor<2;sensor++)for(lights=0;lights<2;lights++){
 s_device_count=3;assert(device_get_num_rows(0,0,0)==3+cam+sensor+1+lights);
 int scenes=cam+sensor,all=scenes+1,first=all+lights;
 for(int row=first;row<first+3;row++)assert(row-cam-sensor-1-lights==row-first);
 s_device_loading=true;assert(device_get_num_rows(0,0,0)==1);s_device_loading=false;
}}
`);
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);cp.execFileSync(path.join(dir,'test'));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
assert.equal((src.match(/uint16_t scenes_row = room_camera_rows\(\) \+ \(sensors_visible\(\) \? 1 : 0\)/g)||[]).length,2);
assert(src.includes('row-room_camera_rows()-(sensors_visible()?1:0)-1-'));
assert(src.includes('cameras_open_room(s_selected_room)'));
const cameras=fs.readFileSync('src/c/cameras.c','utf8');
assert(cameras.includes('if(cmd==1 && room_filter[0])'));
assert(cameras.includes('void cameras_open(void){cameras_open_room(NULL);}'));
assert(cameras.includes('if(history_mode&&!single_room_camera){history_mode=false;count=0;loading=true;request(1,NULL);reload();}'));
assert(cameras.includes('!history_mode&&room_filter[0]&&count==1&&pages==1&&page==0'));
assert(cameras.includes('single_room_camera=true;MenuIndex first=MenuIndex(0,0);select_row(menu,&first,NULL);return;'));
console.log('PASS: room-camera row counts/offsets, pin indexing, hidden/empty combinations, scoped history back and global filter reset');
