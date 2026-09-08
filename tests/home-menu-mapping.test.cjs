const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const src=fs.readFileSync('src/c/itsyhome-pebble.c','utf8');
const mapping=src.slice(src.indexOf('static int home_pin_index('),src.indexOf('static uint32_t home_revision('));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-home-map-'));
try{
 fs.writeFileSync(path.join(dir,'test.c'),`#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
static uint8_t s_home_order[]={0,14,3,9,1,2,4,5},s_pin_slots[]={3,8};static int s_home_count=8,s_pin_count=2;
static bool s_show_favorites=true,s_show_scenes=true,s_show_rooms=true,show_cameras=true;
#define CAMERA_VISIBLE show_cameras
static int visible_root_count(void){return s_show_favorites+s_show_scenes+s_show_rooms;}
${mapping}
int main(void){
 assert(home_pin_at_row(0)==-1&&home_logical_row(0)==0);
 assert(home_pin_at_row(1)==1&&home_pin_at_row(3)==0);
 assert(home_logical_row(2)==3&&home_logical_row(6)==4&&home_logical_row(7)==5);
 s_show_rooms=false;show_cameras=false;
 assert(home_pin_at_row(1)==1&&home_pin_at_row(2)==0);assert(home_logical_row(3)==1&&home_logical_row(4)==2&&home_logical_row(5)==3);
 assert(home_token_at_row(6)==-1);
}`);
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);cp.execFileSync(path.join(dir,'test'));
 console.log('PASS: interleaved Home Screen pins retain their slot/action identity with hidden sections');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
