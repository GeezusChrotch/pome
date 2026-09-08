#pragma once
#include <stdint.h>
#include <stdbool.h>
#define HOME_CAPACITY 66
static bool home_parse_order(uint8_t *out,const char *text,const uint8_t *current,int current_count){
  bool allowed[HOME_CAPACITY]={0},seen[HOME_CAPACITY]={0};int count=0;
  for(int i=0;i<current_count;i++)if(current[i]<HOME_CAPACITY)allowed[current[i]]=true;
  while(*text){int token=0,digits=0;while(*text>='0'&&*text<='9'){token=token*10+(*text++-'0');if(++digits>2)return false;}
    if(!digits||token>=HOME_CAPACITY||!allowed[token]||seen[token]||count>=current_count)return false;
    out[count++]=token;seen[token]=true;if(*text==','&&text[1])text++;else if(*text)return false;
  }
  return count==current_count;
}
// Section tokens 0..5; persistent pin-slot tokens 6..65.
static int home_merge(uint8_t *out,const uint8_t *saved,int saved_count,const uint8_t *pins,int pin_count,const char *sections) {
  bool live[HOME_CAPACITY]={0},seen[HOME_CAPACITY]={0};int count=0;
  for(int i=0;i<6;i++)live[i]=true;
  for(int i=0;i<pin_count;i++)if(pins[i]<60)live[6+pins[i]]=true;
  // Newly pinned items start at the top; existing positions are preserved.
  for(int i=0;i<pin_count;i++){int token=6+pins[i];bool found=false;for(int j=0;j<saved_count;j++)if(saved[j]==token)found=true;if(!found&&token<HOME_CAPACITY&&!seen[token]){out[count++]=token;seen[token]=true;}}
  for(int i=0;i<saved_count;i++){int token=saved[i];if(token<HOME_CAPACITY&&live[token]&&!seen[token]){out[count++]=token;seen[token]=true;}}
  for(int i=0;i<6;i++){int token=sections[i]-'0';if(token>=0&&token<6&&!seen[token]){out[count++]=token;seen[token]=true;}}
  return count;
}
