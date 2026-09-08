const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pome-root-order-'));
try {
 const source=`#include <assert.h>
#include <stddef.h>
#include "${path.resolve('src/c/root_order.h')}"
#include "${path.resolve('src/c/home_order.h')}"
int main(void){
 assert(root_order_valid("012345"));assert(root_order_valid("432105"));
 assert(!root_order_valid("012344"));assert(!root_order_valid(""));assert(!root_order_valid("01234x"));
 for(int flags=0;flags<16;flags++){
   bool f=flags&1,s=flags&2,r=flags&4,c=flags&8;int count=2+f+s+r+c;
   for(int i=0;i<count;i++)assert(root_order_row("012345",i,f,s,r,c)==i);
   unsigned seen=0;
   for(int i=0;i<count;i++){int row=root_order_row("543210",i,f,s,r,c);assert(row==count-i-1);assert(!(seen&(1<<row)));seen|=1<<row;}
   assert(root_order_row("543210",count,f,s,r,c)==-1);
 }
 assert(root_order_row("432105",0,true,true,true,true)==4);
 assert(root_order_row("432105",0,true,true,true,false)==3);
 uint8_t out[66],pins[]={3,8},saved[]={0,14,1,9,2,3,4,5};
 assert(home_parse_order(out,"9,0,1,2,3,4,5,14",saved,8));assert(out[0]==9&&out[7]==14);
 assert(!home_parse_order(out,"0,14,1,9,2,3,4,4",saved,8));assert(!home_parse_order(out,"0,14,1,9,2,3,4",saved,8));assert(!home_parse_order(out,"0,14,1,9,2,3,4,5,",saved,8));assert(!home_parse_order(out,"0,14,1,9,2,3,4,99",saved,8));
 assert(home_merge(out,NULL,0,pins,2,"432105")==8);assert(out[0]==9&&out[1]==14&&out[2]==4);
 assert(home_merge(out,saved,8,pins,2,"012345")==8);for(int i=0;i<8;i++)assert(out[i]==saved[i]);
 uint8_t changed[]={3,9};assert(home_merge(out,saved,8,changed,2,"012345")==8);assert(out[0]==15&&out[1]==0&&out[3]==9);
 uint8_t corrupt[]={255,0,0,14};assert(home_merge(out,corrupt,4,pins,2,"012345")==8);unsigned seen[66]={0};for(int i=0;i<8;i++){assert(out[i]<66&&!seen[out[i]]);seen[out[i]]=1;}
 uint8_t all[60];for(int i=0;i<60;i++)all[i]=i;assert(home_merge(out,NULL,0,all,60,"012345")==66);
}`;
 fs.writeFileSync(path.join(dir,'test.c'),source);
 cp.execFileSync('cc',['-std=c99','-Wall','-Werror',path.join(dir,'test.c'),'-o',path.join(dir,'test')]);cp.execFileSync(path.join(dir,'test'));
 console.log('PASS: section order validation, default/reordered action mapping and hidden/platform section filtering');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
