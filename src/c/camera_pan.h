#pragma once
#include <stdio.h>
#include <stdint.h>
static uint8_t camera_pixel(const uint8_t *data,int n,int length){int bit=n*6,byte=bit/8,shift=bit%8;unsigned pair=(unsigned)data[byte]<<8;if(byte+1<length)pair|=data[byte+1];return 0xc0|((pair>>(10-shift))&63);}
static void photo_age(char *out,int size,int seconds){if(seconds<0)seconds=0;snprintf(out,size,"%02d:%02d:%02d",seconds/3600,(seconds/60)%60,seconds%60);}
static void photo_caption(char *out,int size,const char *stamp,int seconds){
  if(seconds<0){snprintf(out,size,"%s - age unknown",stamp);return;}
  if(seconds>=86400)snprintf(out,size,"%s - %dd %dh %dm %ds",stamp,seconds/86400,(seconds/3600)%24,(seconds/60)%60,seconds%60);
  else if(seconds>=3600)snprintf(out,size,"%s - %dh %dm %ds",stamp,seconds/3600,(seconds/60)%60,seconds%60);
  else snprintf(out,size,"%s - %dmins %dsecs",stamp,seconds/60,seconds%60);
}
static int auto_position(int limit,int elapsed,int duration){return duration<=0||elapsed>=duration ? limit : limit*elapsed/duration;}
static int pan_width(int w,int h,int screen_h){return h>0 ? w*screen_h/h : 0;}
static int pan_limit(int scaled_w,int screen_w){return scaled_w>screen_w ? scaled_w-screen_w : 0;}
static int pan_clamp(int x,int limit){return x<0 ? 0 : (x>limit ? limit : x);}
static int pan_next(int x,int limit,int step){return x>=limit ? 0 : pan_clamp(x+step,limit);}
