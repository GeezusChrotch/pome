"use strict";

// Execute the watch's actual persistence/picker code against a fake Pebble store.
const fs = require("fs");
const os = require("os");
const path = require("path");
const cp = require("child_process");
const source = fs.readFileSync("src/c/itsyhome-pebble.c", "utf8");
const functions = source.slice(source.indexOf("static void pin_name("),
  source.indexOf("static uint16_t pin_get_num_rows("));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pome-pin-test-"));
const harness = `
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#define MAX_ITEMS 60
#define MAX_NAME_LENGTH 64
#define PIN_ORDER_KEY 1999
#define PIN_NAME_KEY 2000
static unsigned char store[61][64];
static int sizes[61];
static int fail_key = -1;
static uint8_t s_pin_slots[MAX_ITEMS];
static uint16_t s_pin_count, s_scene_count;
static struct { char name[MAX_NAME_LENGTH]; bool active; } s_scenes[MAX_ITEMS];
static int persist_get_size(int key) { return sizes[key - 1999]; }
static int persist_write_data(int key, const void *data, int size) {
  if (key == fail_key) return -1;
  memcpy(store[key - 1999], data, size); sizes[key - 1999] = size; return size;
}
static int persist_read_data(int key, void *data, int size) {
  int count = sizes[key - 1999]; if (count > size) count = size;
  memcpy(data, store[key - 1999], count); return count;
}
static int persist_write_string(int key, const char *value) {
  return persist_write_data(key, value, strlen(value) + 1);
}
static int persist_read_string(int key, char *value, int size) {
  return persist_read_data(key, value, size);
}
static int persist_delete(int key) {
  if (key == fail_key) return -1;
  sizes[key - 1999] = 0; return 0;
}
${functions}
static void reboot(void) { s_pin_count = 0; memset(s_pin_slots, 0, sizeof(s_pin_slots)); load_pins(); }
static void expect_pin(int index, const char *expected) {
  char name[MAX_NAME_LENGTH]; pin_name(index, name); assert(strcmp(name, expected) == 0);
}
int main(void) {
  reboot(); assert(s_pin_count == 0);
  assert(toggle_pin("Lounge TV")); assert(toggle_pin("Good Night"));
  reboot(); assert(s_pin_count == 2); expect_pin(0, "Lounge TV"); expect_pin(1, "Good Night");
  assert(toggle_pin("Lounge TV")); assert(toggle_pin("Morning"));
  assert(toggle_pin("Lounge TV")); reboot();
  expect_pin(0, "Good Night"); expect_pin(1, "Morning"); expect_pin(2, "Lounge TV");
  strcpy(s_scenes[0].name, "Morning"); strcpy(s_scenes[1].name, "New Scene"); s_scene_count = 2;
  assert(pin_picker_count() == 4);
  char name[MAX_NAME_LENGTH]; pin_picker_name(2, name); assert(strcmp(name, "Good Night") == 0);
  pin_picker_name(3, name); assert(strcmp(name, "Lounge TV") == 0);
  fail_key = PIN_ORDER_KEY; assert(!toggle_pin("New Scene")); assert(!toggle_pin("Morning"));
  reboot(); assert(s_pin_count == 3); expect_pin(1, "Morning"); fail_key = -1;
  assert(toggle_pin("Good Night")); assert(toggle_pin("Morning"));
  fail_key = PIN_ORDER_KEY; assert(!toggle_pin("Lounge TV")); reboot(); assert(s_pin_count == 1);
  fail_key = -1; assert(toggle_pin("Lounge TV")); reboot(); assert(s_pin_count == 0);
  fail_key = PIN_NAME_KEY; assert(!toggle_pin("Failure")); assert(s_pin_count == 0); fail_key = -1;
  for (int i = 0; i < MAX_ITEMS; i++) { snprintf(name, sizeof(name), "Scene %d", i); assert(toggle_pin(name)); }
  reboot(); assert(s_pin_count == MAX_ITEMS); assert(!toggle_pin("Too many"));
  assert(toggle_pin("Scene 25")); assert(toggle_pin("Replacement")); reboot();
  expect_pin(25, "Scene 26"); expect_pin(59, "Replacement");
  // A corrupt order/absent name must not generate empty root menu pins.
  sizes[0] = 3; store[0][0] = 255; store[0][1] = 0; store[0][2] = 0;
  reboot(); assert(s_pin_count == 1); expect_pin(0, "Scene 0");
  puts("Pinned scene persistence, ordering, missing scenes, capacity, and failure tests passed");
}
`;
try {
  const file = path.join(dir, "pins.c");
  const binary = path.join(dir, "pins");
  fs.writeFileSync(file, harness);
  cp.execFileSync("cc", ["-std=c99", "-Wall", "-Werror", file, "-o", binary]);
  process.stdout.write(cp.execFileSync(binary));
} finally {
  fs.rmSync(dir, {recursive: true, force: true});
}
