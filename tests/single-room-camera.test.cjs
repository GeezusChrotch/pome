const fs=require('fs'),assert=require('assert'),os=require('os'),path=require('path'),cp=require('child_process');
const src=fs.readFileSync('src/c/cameras.c','utf8');
const back=src.slice(src.indexOf('static void camera_back('),src.indexOf('static void camera_up('));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-single-camera-'));
try{
 fs.writeFileSync(path.join(dir,'test.c'),`
#include <stdbool.h>
#include <stddef.h>
#include <assert.h>
typedef void *ClickRecognizerRef;
static bool history_mode,single_room_camera,loading;
static int count,requests,pops,last;
static void request(int n,void*p){requests++;last=n;}
static void cancel_timer(void){}static void reload(void){}
static void window_stack_pop(bool b){pops++;}
${back}
int main(void){
 history_mode=true;single_room_camera=true;camera_back(0,0);assert(pops==1&&last==3);
 pops=0;history_mode=true;single_room_camera=false;camera_back(0,0);assert(pops==0&&last==1&&!history_mode);
 camera_back(0,0);assert(pops==1&&last==3);
}
`);
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);cp.execFileSync(path.join(dir,'test'));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
assert(src.includes('!history_mode&&room_filter[0]&&count==1&&pages==1&&page==0'));
assert(src.includes('single_room_camera=false;history_mode=false;loading=true'));
assert(src.includes('single_room_camera=true;MenuIndex first=MenuIndex(0,0);select_row(menu,&first,NULL);return;'));
console.log('PASS: single-room camera auto-opens existing history, Back exits to room; multi-camera/global navigation unchanged');
