#pragma once
#include <pebble.h>
#include "pome_features.h"
void cameras_open(void);
void cameras_capture(const char *id);
bool pome_camera_pinned(const char *id);
bool pome_camera_toggle_pin(const char *id,const char *name);
bool pome_pin_button(int button);
void cameras_update_shortcuts(void);
void cameras_deinit(void);
bool cameras_inbox(DictionaryIterator *in);
