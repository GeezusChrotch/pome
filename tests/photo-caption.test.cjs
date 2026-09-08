const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-caption-test-'));
try{
 const header=path.resolve('src/c/camera_pan.h');
 fs.writeFileSync(path.join(dir,'test.c'),`#include <assert.h>\n#include <string.h>\n#include "${header}"\nint main(void){char b[72];photo_caption(b,sizeof(b),"12:35 AM",733);assert(!strcmp(b,"12:35 AM - 12mins 13secs"));photo_caption(b,sizeof(b),"12:00 PM",0);assert(!strcmp(b,"12:00 PM - 0mins 0secs"));photo_caption(b,sizeof(b),"1:02 PM",3661);assert(!strcmp(b,"1:02 PM - 1h 1m 1s"));photo_caption(b,sizeof(b),"1:02 PM",90061);assert(!strcmp(b,"1:02 PM - 1d 1h 1m 1s"));photo_caption(b,sizeof(b),"1:02 PM",-1);assert(!strcmp(b,"1:02 PM - age unknown"));}`);
 cp.execFileSync('cc',[path.join(dir,'test.c'),'-o',path.join(dir,'test')]);cp.execFileSync(path.join(dir,'test'));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS: exact time/age caption, minutes, hours, days, and missing age');
