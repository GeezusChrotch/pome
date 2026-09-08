#pragma once
#include <stdbool.h>
#include <stdint.h>
static bool root_order_valid(const char *order) {
  uint8_t seen=0;
  for(int i=0;i<6;i++) { if(order[i]<'0'||order[i]>'5')return false;uint8_t bit=1<<(order[i]-'0');if(seen&bit)return false;seen|=bit; }
  return order[6]==0;
}
// Map displayed section position to the original logical action, skipping hidden sections.
static int root_order_row(const char *order,int position,bool favorites,bool scenes,bool rooms,bool cameras) {
  int logical[]={0,favorites?1:-1,scenes?1+favorites:-1,rooms?1+favorites+scenes:-1,cameras?1+favorites+scenes+rooms:-1,1+favorites+scenes+rooms+cameras};
  for(int i=0;i<6;i++){int row=logical[order[i]-'0'];if(row>=0&&position--==0)return row;}
  return -1;
}
