#include <pebble.h>
#include <ctype.h>

#define MAX_ITEMS 64
#define MAX_NAME_LENGTH 64
#define MAX_TYPE_LENGTH 24
#define MAX_VALUE_LENGTH 32
#define MAX_ID_LENGTH 40
#define MAX_VOICE_LENGTH 128
#define COLOR_COUNT 6

typedef enum {
  COMMAND_LOAD_FAVORITES = 1,
  COMMAND_LOAD_SCENES = 2,
  COMMAND_RUN_SCENE = 3,
  COMMAND_LOAD_ROOMS = 4,
  COMMAND_LOAD_DEVICES = 5,
  COMMAND_TOGGLE_DEVICE = 6,
  COMMAND_SET_BRIGHTNESS = 7,
  COMMAND_SET_COLOR = 8,
  COMMAND_LOAD_COLORS = 9,
  COMMAND_SET_SPEED = 10,
  COMMAND_SET_POSITION = 11,
  COMMAND_PARSE_VOICE = 12,
  COMMAND_EXECUTE_VOICE = 13,
} Command;

typedef enum {
  ITEM_KIND_FAVORITE = 1,
  ITEM_KIND_SCENE = 2,
  ITEM_KIND_ROOM = 3,
  ITEM_KIND_DEVICE = 4,
  ITEM_KIND_COLOR = 5,
  ITEM_KIND_SENSOR = 6,
  ITEM_KIND_ROOM_SCENE = 7,
} ItemKind;

typedef struct {
  char name[MAX_NAME_LENGTH];
  char type[MAX_TYPE_LENGTH];
  bool active;
  bool reachable;
} HomeItem;

typedef struct {
  char name[16];
  uint16_t hue;
  uint8_t saturation;
} ColorChoice;

typedef struct {
  char name[MAX_NAME_LENGTH];
  char type[MAX_TYPE_LENGTH];
  char value[MAX_VALUE_LENGTH];
  bool reachable;
} SensorItem;

typedef enum {
  PRESET_BRIGHTNESS,
  PRESET_COLOR,
  PRESET_SPEED,
} PresetKind;

typedef enum {
  CONFIRM_NONE,
  CONFIRM_SCENE,
  CONFIRM_VOICE,
  CONFIRM_VOICE_WORKING,
  CONFIRM_VOICE_RESULT,
} ConfirmMode;

static Window *s_root_window;
static Window *s_list_window;
static Window *s_device_window;
static Window *s_sensor_window;
static Window *s_room_scene_window;
static Window *s_action_window;
static Window *s_preset_window;
static Window *s_confirm_window;
static MenuLayer *s_root_menu;
static MenuLayer *s_list_menu;
static MenuLayer *s_device_menu;
static MenuLayer *s_sensor_menu;
static MenuLayer *s_room_scene_menu;
static MenuLayer *s_action_menu;
static MenuLayer *s_preset_menu;
static TextLayer *s_confirm_title;
static TextLayer *s_confirm_hint;
static DictationSession *s_dictation_session;
static GBitmap *s_icon_light;
static GBitmap *s_icon_fan;
static GBitmap *s_icon_switch;
static GBitmap *s_icon_outlet;
static GBitmap *s_icon_blinds;
static GBitmap *s_icon_lock;
static GBitmap *s_icon_climate;
static GBitmap *s_icon_garage;
static GBitmap *s_icon_generic;
static GBitmap *s_icon_light_selected;
static GBitmap *s_icon_fan_selected;
static GBitmap *s_icon_switch_selected;
static GBitmap *s_icon_outlet_selected;
static GBitmap *s_icon_blinds_selected;
static GBitmap *s_icon_lock_selected;
static GBitmap *s_icon_climate_selected;
static GBitmap *s_icon_garage_selected;
static GBitmap *s_icon_generic_selected;

static HomeItem s_favorites[MAX_ITEMS];
static HomeItem s_scenes[MAX_ITEMS];
static HomeItem s_rooms[MAX_ITEMS];
static HomeItem s_devices[MAX_ITEMS];
static char s_device_display_names[MAX_ITEMS][MAX_NAME_LENGTH];
static char s_device_ids[MAX_ITEMS][MAX_ID_LENGTH];
static HomeItem s_room_scenes[MAX_ITEMS];
static SensorItem s_sensors[MAX_ITEMS];
static ColorChoice s_colors[COLOR_COUNT] = {
  {"Amber", 35, 100},
  {"Red", 0, 100},
  {"Green", 120, 100},
  {"Blue", 240, 100},
  {"Pink", 330, 100},
  {"White", 0, 0},
};
static uint16_t s_favorite_count;
static uint16_t s_scene_count;
static uint16_t s_room_count;
static uint16_t s_device_count;
static uint16_t s_sensor_count;
static uint16_t s_room_scene_count;
static ItemKind s_current_kind = ITEM_KIND_FAVORITE;
static char s_selected_room[MAX_NAME_LENGTH];
static char s_selected_device[MAX_NAME_LENGTH];
static char s_selected_device_id[MAX_ID_LENGTH];
static char s_selected_device_type[MAX_TYPE_LENGTH];
static char s_pending_scene[MAX_NAME_LENGTH];
static char s_confirm_text[MAX_VOICE_LENGTH];
static ConfirmMode s_confirm_mode;
static PresetKind s_preset_kind;
static bool s_loading;
static bool s_device_loading;
static bool s_show_favorites = true;
static bool s_show_scenes = true;
static bool s_show_rooms = true;
static bool s_show_sensors = true;
static bool s_auto_opened;
static bool s_voice_pending;
static char s_device_error[40];
static char s_status[48] = "Connecting...";

static void show_scene_confirmation(const char *name);
static void start_voice(void);

static void set_status(const char *text) {
  snprintf(s_status, sizeof(s_status), "%s", text ? text : "");
  if (s_root_menu) menu_layer_reload_data(s_root_menu);
}

static bool contains_case_insensitive(const char *haystack, const char *needle) {
  if (!haystack || !needle) return false;
  const size_t needle_len = strlen(needle);
  if (needle_len == 0) return true;
  for (const char *start = haystack; *start; start++) {
    size_t i = 0;
    while (i < needle_len && start[i] &&
           tolower((unsigned char)start[i]) == tolower((unsigned char)needle[i])) {
      i++;
    }
    if (i == needle_len) return true;
  }
  return false;
}

static bool scene_is_sensitive(const char *name) {
  static const char *keywords[] = {
    "unlock", "garage", "door", "alarm", "security", "disarm", "gate"
  };
  for (size_t i = 0; i < ARRAY_LENGTH(keywords); i++) {
    if (contains_case_insensitive(name, keywords[i])) return true;
  }
  return false;
}

static bool type_is_toggle_safe(const char *type) {
  static const char *types[] = {
    "light", "switch", "outlet", "fan", "humidifier", "dehumidifier", "air-purifier"
  };
  for (size_t i = 0; i < ARRAY_LENGTH(types); i++) {
    if (strcmp(type, types[i]) == 0) return true;
  }
  return false;
}

static bool type_supports_light_controls(const char *type) {
  return strcmp(type, "light") == 0 || strcmp(type, "light-group") == 0;
}

static GBitmap *icon_for_device_type(const char *type, bool highlighted) {
  if (strcmp(type, "light") == 0 || strcmp(type, "light-group") == 0) {
    return highlighted ? s_icon_light_selected : s_icon_light;
  }
  if (strcmp(type, "fan") == 0) return highlighted ? s_icon_fan_selected : s_icon_fan;
  if (strcmp(type, "switch") == 0) {
    return highlighted ? s_icon_switch_selected : s_icon_switch;
  }
  if (strcmp(type, "outlet") == 0) {
    return highlighted ? s_icon_outlet_selected : s_icon_outlet;
  }
  if (strcmp(type, "blinds") == 0) {
    return highlighted ? s_icon_blinds_selected : s_icon_blinds;
  }
  if (strcmp(type, "lock") == 0) return highlighted ? s_icon_lock_selected : s_icon_lock;
  if (strcmp(type, "garage-door") == 0) {
    return highlighted ? s_icon_garage_selected : s_icon_garage;
  }
  if (strcmp(type, "thermostat") == 0 || strcmp(type, "heater-cooler") == 0 ||
      strcmp(type, "humidifier") == 0 || strcmp(type, "dehumidifier") == 0 ||
      strcmp(type, "humidifier-dehumidifier") == 0 ||
      strcmp(type, "air-purifier") == 0) {
    return highlighted ? s_icon_climate_selected : s_icon_climate;
  }
  return highlighted ? s_icon_generic_selected : s_icon_generic;
}

static uint16_t light_count(void) {
  uint16_t count = 0;
  for (uint16_t i = 0; i < s_device_count; i++) {
    if (strcmp(s_devices[i].type, "light") == 0) count++;
  }
  return count;
}

static const char *display_name_in_room(const char *name, char *buffer, size_t size) {
  if (!name || !s_selected_room[0]) return name;
  size_t room_length = strlen(s_selected_room);
  size_t name_length = strlen(name);
  if (name_length <= room_length) return name;

  for (size_t i = 0; i < room_length; i++) {
    if (tolower((unsigned char)name[i]) !=
        tolower((unsigned char)s_selected_room[i])) return name;
  }

  size_t start = room_length;
  unsigned char boundary = (unsigned char)name[start];
  if (!isspace(boundary) && boundary != '-' && boundary != ':' &&
      boundary != '/' && boundary != '.' && boundary != '_') return name;
  while (name[start]) {
    unsigned char character = (unsigned char)name[start];
    if (!isspace(character) && character != '-' && character != ':' &&
        character != '/' && character != '.' && character != '_') break;
    start++;
  }
  if (!name[start]) return name;
  snprintf(buffer, size, "%s", name + start);
  return buffer;
}

static void send_command_with_id(Command command, const char *name, const char *room,
                                 const char *type, const char *id) {
  DictionaryIterator *out = NULL;
  AppMessageResult result = app_message_outbox_begin(&out);
  if (result != APP_MSG_OK || !out) {
    set_status("Phone unavailable");
    vibes_short_pulse();
    return;
  }

  dict_write_uint8(out, MESSAGE_KEY_COMMAND, command);
  if (name) dict_write_cstring(out, MESSAGE_KEY_ITEM_NAME, name);
  if (room) dict_write_cstring(out, MESSAGE_KEY_ITEM_ROOM, room);
  if (type) dict_write_cstring(out, MESSAGE_KEY_ITEM_TYPE, type);
  if (id && id[0]) dict_write_cstring(out, MESSAGE_KEY_ITEM_ID, id);
  dict_write_end(out);
  app_message_outbox_send();
}

static void send_command(Command command, const char *name, const char *room,
                         const char *type) {
  send_command_with_id(command, name, room, type, NULL);
}

static void send_voice_transcript(const char *transcription) {
  DictionaryIterator *out = NULL;
  if (app_message_outbox_begin(&out) != APP_MSG_OK || !out) {
    set_status("Phone unavailable");
    vibes_short_pulse();
    return;
  }
  dict_write_uint8(out, MESSAGE_KEY_COMMAND, COMMAND_PARSE_VOICE);
  dict_write_cstring(out, MESSAGE_KEY_VOICE_TEXT, transcription);
  dict_write_end(out);
  app_message_outbox_send();
  s_voice_pending = true;
  set_status("Understanding...");
}

static void dictation_callback(DictationSession *session, DictationSessionStatus status,
                               char *transcription, void *context) {
  if (status == DictationSessionStatusSuccess && transcription && transcription[0]) {
    send_voice_transcript(transcription);
    return;
  }
  if (status == DictationSessionStatusFailureTranscriptionRejected) {
    set_status("Voice canceled");
    return;
  }
  if (status == DictationSessionStatusFailureNoSpeechDetected) {
    set_status("No speech heard");
  } else if (status == DictationSessionStatusFailureConnectivityError) {
    set_status("Voice needs phone");
  } else if (status == DictationSessionStatusFailureDisabled) {
    set_status("Voice disabled");
  } else {
    set_status("Voice unavailable");
  }
  vibes_short_pulse();
}

static void start_voice(void) {
  if (!s_dictation_session) {
    s_dictation_session = dictation_session_create(MAX_VOICE_LENGTH, dictation_callback, NULL);
  }
  if (!s_dictation_session) {
    set_status("Voice unavailable");
    vibes_short_pulse();
    return;
  }
  set_status("Listening...");
  DictationSessionStatus status = dictation_session_start(s_dictation_session);
  if (status != DictationSessionStatusSuccess) {
    set_status("Voice busy");
    vibes_short_pulse();
  }
}

static void run_scene(const char *name) {
  set_status("Running scene...");
  send_command(COMMAND_RUN_SCENE, name, NULL, NULL);
}

static void load_devices(const char *room) {
  snprintf(s_selected_room, sizeof(s_selected_room), "%s", room);
  s_device_count = 0;
  s_sensor_count = 0;
  s_room_scene_count = 0;
  s_device_loading = true;
  s_device_error[0] = '\0';
  window_stack_push(s_device_window, true);
  send_command(COMMAND_LOAD_DEVICES, NULL, s_selected_room, NULL);
}

static uint16_t list_count(void) {
  switch (s_current_kind) {
    case ITEM_KIND_FAVORITE: return s_favorite_count;
    case ITEM_KIND_SCENE: return s_scene_count;
    case ITEM_KIND_ROOM: return s_room_count;
    default: return 0;
  }
}

static HomeItem *list_items(void) {
  switch (s_current_kind) {
    case ITEM_KIND_FAVORITE: return s_favorites;
    case ITEM_KIND_SCENE: return s_scenes;
    case ITEM_KIND_ROOM: return s_rooms;
    default: return s_favorites;
  }
}

static const char *list_title(void) {
  switch (s_current_kind) {
    case ITEM_KIND_FAVORITE: return "Favorites";
    case ITEM_KIND_SCENE: return "Scenes";
    case ITEM_KIND_ROOM: return "Rooms";
    default: return "Pome";
  }
}

static uint16_t visible_root_count(void) {
  return (s_show_favorites ? 1 : 0) + (s_show_scenes ? 1 : 0) +
         (s_show_rooms ? 1 : 0);
}

static ItemKind root_kind_at(uint16_t row) {
  if (s_show_favorites) {
    if (row == 0) return ITEM_KIND_FAVORITE;
    row--;
  }
  if (s_show_scenes) {
    if (row == 0) return ITEM_KIND_SCENE;
    row--;
  }
  return ITEM_KIND_ROOM;
}

static const char *root_kind_label(ItemKind kind) {
  if (kind == ITEM_KIND_FAVORITE) return "Favorites";
  if (kind == ITEM_KIND_SCENE) return "Scenes";
  return "Rooms";
}

static bool sensors_visible(void) {
  return s_show_sensors && s_sensor_count > 0;
}

static uint16_t root_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                  void *context) {
  return visible_root_count() + 2;
}

static void root_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                          void *context) {
  uint16_t visible_count = visible_root_count();
  if (cell_index->row == 0) {
    menu_cell_basic_draw(ctx, cell_layer, "Voice", "Speak a command", NULL);
  } else if (cell_index->row <= visible_count) {
    ItemKind kind = root_kind_at(cell_index->row - 1);
    menu_cell_basic_draw(ctx, cell_layer, root_kind_label(kind),
                         s_loading ? "Loading..." : NULL, NULL);
  } else {
    menu_cell_basic_draw(ctx, cell_layer, "Refresh", s_status, NULL);
  }
}

static uint16_t list_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                  void *context) {
  return list_count();
}

static void list_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                          void *context) {
  HomeItem *item = &list_items()[cell_index->row];
  const char *subtitle = NULL;
  if (s_current_kind != ITEM_KIND_ROOM && item->active) subtitle = "Active";
  menu_cell_basic_draw(ctx, cell_layer, item->name, subtitle, NULL);
}

static void list_draw_header(GContext *ctx, const Layer *cell_layer,
                             uint16_t section_index, void *context) {
  menu_cell_basic_header_draw(ctx, cell_layer, list_title());
}

static int16_t list_get_header_height(MenuLayer *menu_layer, uint16_t section_index,
                                      void *context) {
  return MENU_CELL_BASIC_HEADER_HEIGHT;
}

static uint16_t device_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                    void *context) {
  if (s_device_loading || s_device_error[0]) return 1;
  uint16_t count = s_device_count + (sensors_visible() ? 1 : 0) + 1 +
                   (light_count() > 0 ? 1 : 0);
  return count == 0 ? 1 : count;
}

static void device_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                            void *context) {
  if (s_device_loading) {
    menu_cell_basic_draw(ctx, cell_layer, "Loading...", NULL, NULL);
    return;
  }
  if (s_device_error[0]) {
    menu_cell_basic_draw(ctx, cell_layer, s_device_error, NULL, NULL);
    return;
  }

  if (sensors_visible() && cell_index->row == 0) {
    static char subtitle[24];
    snprintf(subtitle, sizeof(subtitle), "%u reading%s", s_sensor_count,
             s_sensor_count == 1 ? "" : "s");
    menu_cell_basic_draw(ctx, cell_layer, "Sensors", subtitle, NULL);
    return;
  }

  uint16_t scenes_row = sensors_visible() ? 1 : 0;
  if (cell_index->row == scenes_row) {
    static char subtitle[24];
    snprintf(subtitle, sizeof(subtitle), "%u scene%s", s_room_scene_count,
             s_room_scene_count == 1 ? "" : "s");
    menu_cell_basic_draw(ctx, cell_layer, "Scenes", subtitle, NULL);
    return;
  }

  uint16_t all_lights_row = scenes_row + 1;
  uint16_t lights = light_count();
  if (lights > 0 && cell_index->row == all_lights_row) {
    static char subtitle[24];
    snprintf(subtitle, sizeof(subtitle), "%u light%s", lights, lights == 1 ? "" : "s");
    menu_cell_basic_draw(ctx, cell_layer, "All Lights", subtitle,
                         icon_for_device_type("light-group",
                                              menu_cell_layer_is_highlighted(cell_layer)));
    return;
  }

  uint16_t device_index = cell_index->row - all_lights_row - (lights > 0 ? 1 : 0);
  HomeItem *item = &s_devices[device_index];
  static char display_name[MAX_NAME_LENGTH];
  const char *subtitle;
  if (!item->reachable) {
    subtitle = "Unavailable";
  } else if (strcmp(item->type, "light") == 0) {
    subtitle = "Toggle, level, color";
  } else if (strcmp(item->type, "fan") == 0) {
    subtitle = "Toggle and speed";
  } else if (strcmp(item->type, "blinds") == 0) {
    subtitle = NULL;
  } else if (type_is_toggle_safe(item->type)) {
    subtitle = NULL;
  } else {
    subtitle = item->type[0] ? item->type : "Read only";
  }
  menu_cell_basic_draw(ctx, cell_layer,
                       display_name_in_room(s_device_display_names[device_index], display_name,
                                            sizeof(display_name)),
                       subtitle, icon_for_device_type(
                         item->type, menu_cell_layer_is_highlighted(cell_layer)));
}

static uint16_t sensor_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                    void *context) {
  return s_sensor_count;
}

static void sensor_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                            void *context) {
  SensorItem *sensor = &s_sensors[cell_index->row];
  static char display_name[MAX_NAME_LENGTH];
  const char *value = sensor->reachable ? sensor->value : "Unavailable";
  menu_cell_basic_draw(ctx, cell_layer,
                       display_name_in_room(sensor->name, display_name, sizeof(display_name)),
                       value[0] ? value : "Unknown", NULL);
}

static void sensor_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  menu_cell_basic_header_draw(ctx, cell_layer, "Sensors");
}

static uint16_t room_scene_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                        void *context) {
  return s_room_scene_count == 0 ? 1 : s_room_scene_count;
}

static void room_scene_draw_row(GContext *ctx, const Layer *cell_layer,
                                MenuIndex *cell_index, void *context) {
  if (s_room_scene_count == 0) {
    menu_cell_basic_draw(ctx, cell_layer, "No scenes", NULL, NULL);
    return;
  }
  HomeItem *scene = &s_room_scenes[cell_index->row];
  menu_cell_basic_draw(ctx, cell_layer, scene->name, scene->active ? "Active" : NULL, NULL);
}

static void room_scene_draw_header(GContext *ctx, const Layer *cell_layer,
                                   uint16_t section_index, void *context) {
  menu_cell_basic_header_draw(ctx, cell_layer, "Scenes");
}

static void room_scene_select_click(MenuLayer *menu_layer, MenuIndex *cell_index,
                                    void *context) {
  if (s_room_scene_count == 0) return;
  HomeItem *scene = &s_room_scenes[cell_index->row];
  if (scene_is_sensitive(scene->name)) {
    show_scene_confirmation(scene->name);
  } else {
    run_scene(scene->name);
  }
}

static void device_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  menu_cell_basic_header_draw(ctx, cell_layer, s_selected_room);
}

static uint16_t action_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                    void *context) {
  if (strcmp(s_selected_device_type, "blinds") == 0) return 8;
  if (strcmp(s_selected_device_type, "fan") == 0) return 2;
  return type_supports_light_controls(s_selected_device_type) ? 3 : 1;
}

static void action_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                            void *context) {
  static const char *light_labels[] = {"Toggle", "Brightness", "Color"};
  static const char *fan_labels[] = {"Toggle", "Speed"};
  static const char *blind_labels[] = {
    "Open", "Close", "Up", "Down", "Slow Up", "Slow Down", "Fast Up", "Fast Down"
  };
  const char **labels = strcmp(s_selected_device_type, "blinds") == 0
                         ? blind_labels
                         : strcmp(s_selected_device_type, "fan") == 0
                           ? fan_labels : light_labels;
  menu_cell_basic_draw(ctx, cell_layer, labels[cell_index->row], NULL, NULL);
}

static void action_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  menu_cell_basic_header_draw(ctx, cell_layer, s_selected_device);
}

static uint16_t preset_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                    void *context) {
  return s_preset_kind == PRESET_COLOR ? COLOR_COUNT : 4;
}

static void preset_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                            void *context) {
  static const char *brightness_labels[] = {"25%", "50%", "75%", "100%"};
  const char *label = s_preset_kind == PRESET_COLOR ? s_colors[cell_index->row].name
                                                    : brightness_labels[cell_index->row];
  menu_cell_basic_draw(ctx, cell_layer, label, NULL, NULL);
}

static void preset_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  const char *title = s_preset_kind == PRESET_COLOR ? "Color"
                      : s_preset_kind == PRESET_SPEED ? "Speed" : "Brightness";
  menu_cell_basic_header_draw(ctx, cell_layer, title);
}

static void preset_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  if (s_preset_kind == PRESET_COLOR) {
    ColorChoice *color = &s_colors[cell_index->row];
    DictionaryIterator *out = NULL;
    if (app_message_outbox_begin(&out) != APP_MSG_OK || !out) {
      vibes_short_pulse();
      return;
    }
    dict_write_uint8(out, MESSAGE_KEY_COMMAND, COMMAND_SET_COLOR);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_NAME, s_selected_device);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_ROOM, s_selected_room);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_TYPE, s_selected_device_type);
    if (s_selected_device_id[0]) {
      dict_write_cstring(out, MESSAGE_KEY_ITEM_ID, s_selected_device_id);
    }
    dict_write_uint16(out, MESSAGE_KEY_ITEM_HUE, color->hue);
    dict_write_uint8(out, MESSAGE_KEY_ITEM_SATURATION, color->saturation);
    dict_write_end(out);
    app_message_outbox_send();
  } else {
    static const uint8_t levels[] = {25, 50, 75, 100};
    DictionaryIterator *out = NULL;
    if (app_message_outbox_begin(&out) != APP_MSG_OK || !out) {
      vibes_short_pulse();
      return;
    }
    dict_write_uint8(out, MESSAGE_KEY_COMMAND,
                     s_preset_kind == PRESET_SPEED ? COMMAND_SET_SPEED
                                                   : COMMAND_SET_BRIGHTNESS);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_NAME, s_selected_device);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_ROOM, s_selected_room);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_TYPE, s_selected_device_type);
    if (s_selected_device_id[0]) {
      dict_write_cstring(out, MESSAGE_KEY_ITEM_ID, s_selected_device_id);
    }
    dict_write_uint8(out, MESSAGE_KEY_ITEM_VALUE, levels[cell_index->row]);
    dict_write_end(out);
    app_message_outbox_send();
  }
}

static void action_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  if (strcmp(s_selected_device_type, "blinds") == 0) {
    DictionaryIterator *out = NULL;
    if (app_message_outbox_begin(&out) != APP_MSG_OK || !out) {
      vibes_short_pulse();
      return;
    }
    dict_write_uint8(out, MESSAGE_KEY_COMMAND, COMMAND_SET_POSITION);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_NAME, s_selected_device);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_ROOM, s_selected_room);
    dict_write_cstring(out, MESSAGE_KEY_ITEM_TYPE, s_selected_device_type);
    if (s_selected_device_id[0]) {
      dict_write_cstring(out, MESSAGE_KEY_ITEM_ID, s_selected_device_id);
    }
    dict_write_uint8(out, MESSAGE_KEY_ITEM_VALUE, cell_index->row);
    dict_write_end(out);
    app_message_outbox_send();
  } else if (cell_index->row == 0) {
    send_command_with_id(COMMAND_TOGGLE_DEVICE, s_selected_device, s_selected_room,
                         s_selected_device_type, s_selected_device_id);
  } else if (type_supports_light_controls(s_selected_device_type)) {
    s_preset_kind = cell_index->row == 2 ? PRESET_COLOR : PRESET_BRIGHTNESS;
    window_stack_push(s_preset_window, true);
  } else if (strcmp(s_selected_device_type, "fan") == 0) {
    s_preset_kind = PRESET_SPEED;
    window_stack_push(s_preset_window, true);
  } else {
    vibes_short_pulse();
  }
}

static void confirm_click_handler(ClickRecognizerRef recognizer, void *context) {
  if (s_confirm_mode == CONFIRM_SCENE) {
    window_stack_pop(true);
    run_scene(s_pending_scene);
  } else if (s_confirm_mode == CONFIRM_VOICE) {
    s_confirm_mode = CONFIRM_VOICE_WORKING;
    s_voice_pending = true;
    snprintf(s_confirm_text, sizeof(s_confirm_text), "Working...");
    if (s_confirm_title) text_layer_set_text(s_confirm_title, s_confirm_text);
    if (s_confirm_hint) text_layer_set_text(s_confirm_hint, "");
    send_command(COMMAND_EXECUTE_VOICE, NULL, NULL, NULL);
  } else if (s_confirm_mode == CONFIRM_VOICE_RESULT) {
    window_stack_pop(true);
    start_voice();
  }
}

static void confirm_click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, confirm_click_handler);
}

static void show_scene_confirmation(const char *name) {
  snprintf(s_pending_scene, sizeof(s_pending_scene), "%s", name);
  snprintf(s_confirm_text, sizeof(s_confirm_text), "%s", name);
  s_confirm_mode = CONFIRM_SCENE;
  window_stack_push(s_confirm_window, true);
}

static void show_voice_confirmation(const char *text) {
  snprintf(s_confirm_text, sizeof(s_confirm_text), "%s", text);
  s_confirm_mode = CONFIRM_VOICE;
  window_stack_push(s_confirm_window, true);
}

static void show_voice_result(const char *text) {
  s_voice_pending = false;
  snprintf(s_confirm_text, sizeof(s_confirm_text), "%s", text);
  if (s_confirm_mode != CONFIRM_VOICE_WORKING) {
    window_stack_push(s_confirm_window, true);
  }
  s_confirm_mode = CONFIRM_VOICE_RESULT;
  if (s_confirm_title) text_layer_set_text(s_confirm_title, s_confirm_text);
  if (s_confirm_hint) text_layer_set_text(s_confirm_hint, "SELECT to speak again\nBACK to close");
}

static void list_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  HomeItem *item = &list_items()[cell_index->row];
  if (s_current_kind == ITEM_KIND_ROOM) {
    load_devices(item->name);
  } else if (scene_is_sensitive(item->name)) {
    show_scene_confirmation(item->name);
  } else {
    run_scene(item->name);
  }
}

static void device_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  if (s_device_loading || s_device_error[0]) return;
  if (sensors_visible() && cell_index->row == 0) {
    window_stack_push(s_sensor_window, true);
    return;
  }
  uint16_t scenes_row = sensors_visible() ? 1 : 0;
  if (cell_index->row == scenes_row) {
    window_stack_push(s_room_scene_window, true);
    return;
  }
  uint16_t all_lights_row = scenes_row + 1;
  if (light_count() > 0 && cell_index->row == all_lights_row) {
    snprintf(s_selected_device, sizeof(s_selected_device), "All Lights");
    snprintf(s_selected_device_type, sizeof(s_selected_device_type), "light-group");
    s_selected_device_id[0] = '\0';
    window_stack_push(s_action_window, true);
    return;
  }
  uint16_t device_index = cell_index->row - all_lights_row -
                          (light_count() > 0 ? 1 : 0);
  HomeItem *item = &s_devices[device_index];
  bool is_blind = strcmp(item->type, "blinds") == 0;
  if (!item->reachable || (!type_is_toggle_safe(item->type) && !is_blind)) {
    vibes_short_pulse();
    return;
  }
  if (strcmp(item->type, "light") == 0 || strcmp(item->type, "fan") == 0 || is_blind) {
    snprintf(s_selected_device, sizeof(s_selected_device), "%s", item->name);
    snprintf(s_selected_device_type, sizeof(s_selected_device_type), "%s", item->type);
    snprintf(s_selected_device_id, sizeof(s_selected_device_id), "%s",
             s_device_ids[device_index]);
    window_stack_push(s_action_window, true);
  } else {
    send_command_with_id(COMMAND_TOGGLE_DEVICE, item->name, s_selected_room,
                         item->type, s_device_ids[device_index]);
  }
}

static void push_list(ItemKind kind) {
  s_current_kind = kind;
  window_stack_push(s_list_window, true);
}

static void refresh_lists(void) {
  s_loading = true;
  s_favorite_count = 0;
  s_scene_count = 0;
  s_room_count = 0;
  set_status("Refreshing...");
  send_command(COMMAND_LOAD_FAVORITES, NULL, NULL, NULL);
}

static void root_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  uint16_t visible_count = visible_root_count();
  if (cell_index->row == 0) {
    start_voice();
  } else if (cell_index->row <= visible_count) {
    push_list(root_kind_at(cell_index->row - 1));
  } else {
    refresh_lists();
  }
}

static void maybe_auto_open(void) {
  if (!s_auto_opened && visible_root_count() == 1) {
    s_auto_opened = true;
    push_list(root_kind_at(0));
  }
}

static void inbox_received(DictionaryIterator *iterator, void *context) {
  Tuple *show_favorites = dict_find(iterator, MESSAGE_KEY_SHOW_FAVORITES);
  Tuple *show_scenes = dict_find(iterator, MESSAGE_KEY_SHOW_SCENES);
  Tuple *show_rooms = dict_find(iterator, MESSAGE_KEY_SHOW_ROOMS);
  Tuple *show_sensors = dict_find(iterator, MESSAGE_KEY_SHOW_SENSORS);
  if (show_favorites || show_scenes || show_rooms || show_sensors) {
    if (show_favorites) s_show_favorites = show_favorites->value->int8 != 0;
    if (show_scenes) s_show_scenes = show_scenes->value->int8 != 0;
    if (show_rooms) s_show_rooms = show_rooms->value->int8 != 0;
    if (show_sensors) s_show_sensors = show_sensors->value->int8 != 0;
    if (visible_root_count() == 0) s_show_favorites = true;
    if (s_root_menu) menu_layer_reload_data(s_root_menu);
    if (s_device_menu) menu_layer_reload_data(s_device_menu);
    if (!s_loading) maybe_auto_open();
  }

  Tuple *voice_prompt = dict_find(iterator, MESSAGE_KEY_VOICE_PROMPT);
  if (voice_prompt) {
    s_voice_pending = false;
    show_voice_confirmation(voice_prompt->value->cstring);
    return;
  }

  Tuple *voice_result = dict_find(iterator, MESSAGE_KEY_VOICE_RESULT);
  if (voice_result) {
    s_voice_pending = false;
    show_voice_result(voice_result->value->cstring);
    vibes_double_pulse();
    return;
  }

  Tuple *error = dict_find(iterator, MESSAGE_KEY_ERROR);
  if (error) {
    s_loading = false;
    if (s_device_loading) {
      s_device_loading = false;
      snprintf(s_device_error, sizeof(s_device_error), "%s", error->value->cstring);
      if (s_device_menu) menu_layer_reload_data(s_device_menu);
    }
    set_status(error->value->cstring);
    if (s_voice_pending || s_confirm_mode == CONFIRM_VOICE_WORKING) {
      s_voice_pending = false;
      show_voice_result(error->value->cstring);
    }
    vibes_short_pulse();
    return;
  }

  Tuple *status = dict_find(iterator, MESSAGE_KEY_STATUS);
  if (status) {
    set_status(status->value->cstring);
    if (s_voice_pending || s_confirm_mode == CONFIRM_VOICE_WORKING) {
      show_voice_result(status->value->cstring);
      vibes_double_pulse();
      return;
    }
    if (strcmp(status->value->cstring, "Scene complete") == 0) {
      vibes_double_pulse();
      send_command(COMMAND_LOAD_SCENES, NULL, NULL, NULL);
    } else if (strcmp(status->value->cstring, "Device toggled") == 0 ||
               strcmp(status->value->cstring, "All lights on") == 0 ||
               strcmp(status->value->cstring, "All lights off") == 0) {
      vibes_double_pulse();
      if (s_action_menu) window_stack_pop(true);
    } else if (strcmp(status->value->cstring, "Brightness set") == 0 ||
               strcmp(status->value->cstring, "Color set") == 0 ||
               strcmp(status->value->cstring, "Room brightness set") == 0 ||
               strcmp(status->value->cstring, "Room color set") == 0) {
      vibes_double_pulse();
      if (s_preset_menu) window_stack_pop(true);
      if (s_action_menu) window_stack_pop(true);
    }
  }

  Tuple *kind_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_KIND);
  Tuple *index_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_INDEX);
  Tuple *name_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_NAME);
  if (kind_tuple && index_tuple && name_tuple) {
    ItemKind kind = kind_tuple->value->uint8;
    uint16_t index = index_tuple->value->uint16;
    if (kind == ITEM_KIND_COLOR && index < COLOR_COUNT) {
      snprintf(s_colors[index].name, sizeof(s_colors[index].name), "%s",
               name_tuple->value->cstring);
      Tuple *hue_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_HUE);
      Tuple *saturation_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_SATURATION);
      s_colors[index].hue = hue_tuple ? hue_tuple->value->uint16 : 0;
      s_colors[index].saturation = saturation_tuple ? saturation_tuple->value->uint8 : 0;
      if (s_preset_menu && s_preset_kind == PRESET_COLOR) {
        menu_layer_reload_data(s_preset_menu);
      }
      return;
    }
    if (kind == ITEM_KIND_SENSOR && index < MAX_ITEMS) {
      SensorItem *sensor = &s_sensors[index];
      Tuple *display_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_DISPLAY_NAME);
      snprintf(sensor->name, sizeof(sensor->name), "%s",
               display_tuple ? display_tuple->value->cstring : name_tuple->value->cstring);
      Tuple *type_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_TYPE);
      snprintf(sensor->type, sizeof(sensor->type), "%s",
               type_tuple ? type_tuple->value->cstring : "");
      Tuple *value_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_VALUE);
      snprintf(sensor->value, sizeof(sensor->value), "%s",
               value_tuple && value_tuple->type == TUPLE_CSTRING
                 ? value_tuple->value->cstring : "Unknown");
      Tuple *reachable_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_REACHABLE);
      sensor->reachable = !reachable_tuple || reachable_tuple->value->int8 != 0;
      if (index >= s_sensor_count) s_sensor_count = index + 1;
      return;
    }
    if (index < MAX_ITEMS) {
      HomeItem *items;
      uint16_t *count;
      if (kind == ITEM_KIND_FAVORITE) {
        items = s_favorites;
        count = &s_favorite_count;
      } else if (kind == ITEM_KIND_SCENE) {
        items = s_scenes;
        count = &s_scene_count;
      } else if (kind == ITEM_KIND_ROOM) {
        items = s_rooms;
        count = &s_room_count;
      } else if (kind == ITEM_KIND_ROOM_SCENE) {
        items = s_room_scenes;
        count = &s_room_scene_count;
      } else {
        items = s_devices;
        count = &s_device_count;
      }

      snprintf(items[index].name, sizeof(items[index].name), "%s", name_tuple->value->cstring);
      Tuple *type_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_TYPE);
      snprintf(items[index].type, sizeof(items[index].type), "%s",
               type_tuple ? type_tuple->value->cstring : "");
      if (kind == ITEM_KIND_DEVICE) {
        Tuple *display_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_DISPLAY_NAME);
        snprintf(s_device_display_names[index], sizeof(s_device_display_names[index]), "%s",
                 display_tuple ? display_tuple->value->cstring : name_tuple->value->cstring);
        Tuple *id_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_ID);
        snprintf(s_device_ids[index], sizeof(s_device_ids[index]), "%s",
                 id_tuple ? id_tuple->value->cstring : "");
      }
      Tuple *active_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_ACTIVE);
      items[index].active = active_tuple ? active_tuple->value->int8 != 0 : false;
      Tuple *reachable_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_REACHABLE);
      items[index].reachable = !reachable_tuple || reachable_tuple->value->int8 != 0;
      if (index >= *count) *count = index + 1;
    }
  }

  Tuple *done = dict_find(iterator, MESSAGE_KEY_LIST_DONE);
  if (done) {
    ItemKind done_kind = done->value->uint8;
    if (done_kind == ITEM_KIND_FAVORITE) {
      send_command(COMMAND_LOAD_SCENES, NULL, NULL, NULL);
    } else if (done_kind == ITEM_KIND_SCENE) {
      send_command(COMMAND_LOAD_ROOMS, NULL, NULL, NULL);
    } else if (done_kind == ITEM_KIND_ROOM) {
      s_loading = false;
      snprintf(s_status, sizeof(s_status), "%u favorites, %u scenes, %u rooms",
               s_favorite_count, s_scene_count, s_room_count);
      if (s_root_menu) menu_layer_reload_data(s_root_menu);
      if (s_list_menu) menu_layer_reload_data(s_list_menu);
      maybe_auto_open();
    } else if (done_kind == ITEM_KIND_DEVICE) {
      s_device_loading = false;
      if (s_device_menu) menu_layer_reload_data(s_device_menu);
    }
  }
}

static void inbox_dropped(AppMessageResult reason, void *context) {
  set_status("Response too large");
}

static void outbox_failed(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  set_status("Phone connection failed");
}

static void root_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_root_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_root_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = root_get_num_rows,
    .draw_row = root_draw_row,
    .select_click = root_select_click,
  });
  menu_layer_set_click_config_onto_window(s_root_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_root_menu));
}

static void root_window_unload(Window *window) {
  menu_layer_destroy(s_root_menu);
  s_root_menu = NULL;
}

static void list_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_list_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_list_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = list_get_num_rows,
    .get_header_height = list_get_header_height,
    .draw_header = list_draw_header,
    .draw_row = list_draw_row,
    .select_click = list_select_click,
  });
  menu_layer_set_click_config_onto_window(s_list_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_list_menu));
}

static void list_window_unload(Window *window) {
  menu_layer_destroy(s_list_menu);
  s_list_menu = NULL;
}

static void device_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_device_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_device_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = device_get_num_rows,
    .get_header_height = list_get_header_height,
    .draw_header = device_draw_header,
    .draw_row = device_draw_row,
    .select_click = device_select_click,
  });
  menu_layer_set_click_config_onto_window(s_device_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_device_menu));
}

static void device_window_unload(Window *window) {
  menu_layer_destroy(s_device_menu);
  s_device_menu = NULL;
}

static void sensor_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_sensor_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_sensor_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = sensor_get_num_rows,
    .get_header_height = list_get_header_height,
    .draw_header = sensor_draw_header,
    .draw_row = sensor_draw_row,
  });
  menu_layer_set_click_config_onto_window(s_sensor_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_sensor_menu));
}

static void sensor_window_unload(Window *window) {
  menu_layer_destroy(s_sensor_menu);
  s_sensor_menu = NULL;
}

static void room_scene_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_room_scene_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_room_scene_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = room_scene_get_num_rows,
    .get_header_height = list_get_header_height,
    .draw_header = room_scene_draw_header,
    .draw_row = room_scene_draw_row,
    .select_click = room_scene_select_click,
  });
  menu_layer_set_click_config_onto_window(s_room_scene_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_room_scene_menu));
}

static void room_scene_window_unload(Window *window) {
  menu_layer_destroy(s_room_scene_menu);
  s_room_scene_menu = NULL;
}

static void action_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_action_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_action_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = action_get_num_rows,
    .get_header_height = list_get_header_height,
    .draw_header = action_draw_header,
    .draw_row = action_draw_row,
    .select_click = action_select_click,
  });
  menu_layer_set_click_config_onto_window(s_action_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_action_menu));
}

static void action_window_unload(Window *window) {
  menu_layer_destroy(s_action_menu);
  s_action_menu = NULL;
}

static void preset_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_preset_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_preset_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = preset_get_num_rows,
    .get_header_height = list_get_header_height,
    .draw_header = preset_draw_header,
    .draw_row = preset_draw_row,
    .select_click = preset_select_click,
  });
  menu_layer_set_click_config_onto_window(s_preset_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_preset_menu));
}

static void preset_window_unload(Window *window) {
  menu_layer_destroy(s_preset_menu);
  s_preset_menu = NULL;
}

static void confirm_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  const int16_t margin = PBL_IF_ROUND_ELSE(18, 8);

  s_confirm_title = text_layer_create(GRect(margin, 18, bounds.size.w - margin * 2, 100));
  text_layer_set_text(s_confirm_title, s_confirm_text);
  text_layer_set_font(s_confirm_title, fonts_get_system_font(
    s_confirm_mode == CONFIRM_SCENE ? FONT_KEY_GOTHIC_24_BOLD : FONT_KEY_GOTHIC_18_BOLD));
  text_layer_set_text_alignment(s_confirm_title, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_confirm_title, GTextOverflowModeTrailingEllipsis);
  layer_add_child(root, text_layer_get_layer(s_confirm_title));

  s_confirm_hint = text_layer_create(GRect(margin, bounds.size.h - 56,
                                            bounds.size.w - margin * 2, 42));
  text_layer_set_text(s_confirm_hint,
    s_confirm_mode == CONFIRM_VOICE_RESULT ? "SELECT to speak again\nBACK to close"
                                          : "SELECT to confirm\nBACK to cancel");
  text_layer_set_font(s_confirm_hint, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_text_alignment(s_confirm_hint, GTextAlignmentCenter);
  layer_add_child(root, text_layer_get_layer(s_confirm_hint));
}

static void confirm_window_unload(Window *window) {
  text_layer_destroy(s_confirm_title);
  text_layer_destroy(s_confirm_hint);
  s_confirm_title = NULL;
  s_confirm_hint = NULL;
  s_confirm_mode = CONFIRM_NONE;
}

static void init(void) {
  s_icon_light = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_LIGHT);
  s_icon_fan = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_FAN);
  s_icon_switch = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_SWITCH);
  s_icon_outlet = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_OUTLET);
  s_icon_blinds = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_BLINDS);
  s_icon_lock = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_LOCK);
  s_icon_climate = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_CLIMATE);
  s_icon_garage = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_GARAGE);
  s_icon_generic = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_GENERIC);
  s_icon_light_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_LIGHT_SELECTED);
  s_icon_fan_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_FAN_SELECTED);
  s_icon_switch_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_SWITCH_SELECTED);
  s_icon_outlet_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_OUTLET_SELECTED);
  s_icon_blinds_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_BLINDS_SELECTED);
  s_icon_lock_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_LOCK_SELECTED);
  s_icon_climate_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_CLIMATE_SELECTED);
  s_icon_garage_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_GARAGE_SELECTED);
  s_icon_generic_selected = gbitmap_create_with_resource(RESOURCE_ID_DEVICE_GENERIC_SELECTED);

  s_root_window = window_create();
  s_list_window = window_create();
  s_device_window = window_create();
  s_sensor_window = window_create();
  s_room_scene_window = window_create();
  s_action_window = window_create();
  s_preset_window = window_create();
  s_confirm_window = window_create();

  window_set_window_handlers(s_root_window, (WindowHandlers) {
    .load = root_window_load,
    .unload = root_window_unload,
  });
  window_set_window_handlers(s_list_window, (WindowHandlers) {
    .load = list_window_load,
    .unload = list_window_unload,
  });
  window_set_window_handlers(s_device_window, (WindowHandlers) {
    .load = device_window_load,
    .unload = device_window_unload,
  });
  window_set_window_handlers(s_sensor_window, (WindowHandlers) {
    .load = sensor_window_load,
    .unload = sensor_window_unload,
  });
  window_set_window_handlers(s_room_scene_window, (WindowHandlers) {
    .load = room_scene_window_load,
    .unload = room_scene_window_unload,
  });
  window_set_window_handlers(s_action_window, (WindowHandlers) {
    .load = action_window_load,
    .unload = action_window_unload,
  });
  window_set_window_handlers(s_preset_window, (WindowHandlers) {
    .load = preset_window_load,
    .unload = preset_window_unload,
  });
  window_set_window_handlers(s_confirm_window, (WindowHandlers) {
    .load = confirm_window_load,
    .unload = confirm_window_unload,
  });
  window_set_click_config_provider(s_confirm_window, confirm_click_config_provider);

  app_message_register_inbox_received(inbox_received);
  app_message_register_inbox_dropped(inbox_dropped);
  app_message_register_outbox_failed(outbox_failed);
  app_message_open(512, 256);

  window_stack_push(s_root_window, false);
  s_loading = true;
}

static void deinit(void) {
  if (s_dictation_session) dictation_session_destroy(s_dictation_session);
  window_destroy(s_confirm_window);
  window_destroy(s_preset_window);
  window_destroy(s_action_window);
  window_destroy(s_sensor_window);
  window_destroy(s_room_scene_window);
  window_destroy(s_device_window);
  window_destroy(s_list_window);
  window_destroy(s_root_window);
  gbitmap_destroy(s_icon_generic_selected);
  gbitmap_destroy(s_icon_garage_selected);
  gbitmap_destroy(s_icon_climate_selected);
  gbitmap_destroy(s_icon_lock_selected);
  gbitmap_destroy(s_icon_blinds_selected);
  gbitmap_destroy(s_icon_outlet_selected);
  gbitmap_destroy(s_icon_switch_selected);
  gbitmap_destroy(s_icon_fan_selected);
  gbitmap_destroy(s_icon_light_selected);
  gbitmap_destroy(s_icon_generic);
  gbitmap_destroy(s_icon_garage);
  gbitmap_destroy(s_icon_climate);
  gbitmap_destroy(s_icon_lock);
  gbitmap_destroy(s_icon_blinds);
  gbitmap_destroy(s_icon_outlet);
  gbitmap_destroy(s_icon_switch);
  gbitmap_destroy(s_icon_fan);
  gbitmap_destroy(s_icon_light);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
