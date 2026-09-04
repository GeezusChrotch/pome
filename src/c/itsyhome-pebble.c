#include <pebble.h>
#include <ctype.h>

#define MAX_ITEMS 60
#define MAX_NAME_LENGTH 64
#define MAX_TYPE_LENGTH 24
#define MAX_VALUE_LENGTH 32
#define MAX_ID_LENGTH 40
#define MAX_VOICE_LENGTH 128
#define MAX_SHORTCUT_LENGTH 72
#define MAX_THEMES 25
#define PIN_ORDER_KEY 1999
#define PIN_NAME_KEY 2000
#define COLOR_COUNT 6
#define MARQUEE_STEP_PIXELS 2
#define MARQUEE_FRAME_MS 80
#define MARQUEE_PAUSE_MS 900

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
  COMMAND_LOAD_THEMES = 14,
  COMMAND_SET_THEME = 15,
  COMMAND_SET_SHORTCUT = 16,
} Command;

typedef enum {
  ITEM_KIND_FAVORITE = 1,
  ITEM_KIND_SCENE = 2,
  ITEM_KIND_ROOM = 3,
  ITEM_KIND_DEVICE = 4,
  ITEM_KIND_COLOR = 5,
  ITEM_KIND_SENSOR = 6,
  ITEM_KIND_ROOM_SCENE = 7,
  ITEM_KIND_THEME = 8,
} ItemKind;

typedef struct {
  char name[MAX_NAME_LENGTH];
  char type[MAX_TYPE_LENGTH];
  bool active;
  bool reachable;
} HomeItem;

// Scene/favorite/room lists never use accessory type or reachability.
typedef struct {
  char name[MAX_NAME_LENGTH];
  bool active;
} SceneItem;

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

typedef struct {
  char name[33];
  GColor background;
  GColor text;
  GColor selection;
  GColor selection_text;
  uint8_t font;
  uint8_t size;
  bool icons;
  bool active;
} ThemeChoice;

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
  CONFIRM_INFO,
} ConfirmMode;

static Window *s_root_window;
static Window *s_list_window;
static Window *s_device_window;
static Window *s_sensor_window;
static Window *s_room_scene_window;
static Window *s_action_window;
static Window *s_preset_window;
static Window *s_theme_window;
static Window *s_settings_window;
static Window *s_pin_window;
static Window *s_shortcut_window;
static Window *s_shortcut_target_window;
static Window *s_confirm_window;
static MenuLayer *s_root_menu;
static MenuLayer *s_list_menu;
static MenuLayer *s_device_menu;
static MenuLayer *s_sensor_menu;
static MenuLayer *s_room_scene_menu;
static MenuLayer *s_action_menu;
static MenuLayer *s_preset_menu;
static MenuLayer *s_theme_menu;
static MenuLayer *s_settings_menu;
static MenuLayer *s_pin_menu;
static MenuLayer *s_shortcut_menu;
static MenuLayer *s_shortcut_target_menu;
static TextLayer *s_confirm_title;
static TextLayer *s_confirm_hint;
static DictationSession *s_dictation_session;
static GBitmap *s_device_icon;
static uint32_t s_device_icon_resource;

static SceneItem s_favorites[MAX_ITEMS];
static SceneItem s_scenes[MAX_ITEMS];
static SceneItem s_rooms[MAX_ITEMS];
static HomeItem s_devices[MAX_ITEMS];
static char s_device_display_names[MAX_ITEMS][MAX_NAME_LENGTH];
static char s_device_ids[MAX_ITEMS][MAX_ID_LENGTH];
static SceneItem s_room_scenes[MAX_ITEMS];
static SensorItem s_sensors[MAX_ITEMS];
static ThemeChoice s_themes[MAX_THEMES];
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
static uint8_t s_pin_slots[MAX_ITEMS];
static uint16_t s_pin_count;
static uint16_t s_room_count;
static uint16_t s_device_count;
static uint16_t s_sensor_count;
static uint16_t s_room_scene_count;
static uint16_t s_theme_count;
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
static bool s_theme_loading;
static char s_device_error[40];
static char s_status[48] = "Connecting...";
static GColor s_theme_background = GColorWhite;
static GColor s_theme_text = GColorBlack;
static GColor s_theme_selection = GColorBlack;
static GColor s_theme_selection_text = GColorWhite;
static uint8_t s_theme_font;
static uint8_t s_theme_size = 24;
static bool s_theme_icons = true;
static char s_shortcut_up[MAX_SHORTCUT_LENGTH] = "off";
static char s_shortcut_select[MAX_SHORTCUT_LENGTH] = "off";
static char s_shortcut_down[MAX_SHORTCUT_LENGTH] = "off";
static uint8_t s_selected_shortcut_button;
static AppTimer *s_marquee_timer;
static int16_t s_marquee_offset;
static int16_t s_marquee_max;
static bool s_marquee_at_end;
#if defined(PBL_PLATFORM_EMERY)
static GFont s_custom_theme_font;
static uint8_t s_custom_theme_font_id = 255;
static uint8_t s_custom_theme_font_size;
#endif

static void show_scene_confirmation(const char *name);
static void show_voice_info(const char *text);
static void start_voice(void);
static void root_shortcut_click_config_provider(void *context);

static MenuLayer *active_menu(void) {
  Window *top = window_stack_get_top_window();
  if (top == s_root_window) return s_root_menu;
  if (top == s_list_window) return s_list_menu;
  if (top == s_device_window) return s_device_menu;
  if (top == s_sensor_window) return s_sensor_menu;
  if (top == s_room_scene_window) return s_room_scene_menu;
  if (top == s_action_window) return s_action_menu;
  if (top == s_preset_window) return s_preset_menu;
  if (top == s_theme_window) return s_theme_menu;
  if (top == s_settings_window) return s_settings_menu;
  if (top == s_pin_window) return s_pin_menu;
  if (top == s_shortcut_window) return s_shortcut_menu;
  if (top == s_shortcut_target_window) return s_shortcut_target_menu;
  return NULL;
}

static void marquee_tick(void *context);

static void marquee_schedule(uint32_t delay_ms) {
  if (s_marquee_timer) app_timer_cancel(s_marquee_timer);
  s_marquee_timer = app_timer_register(delay_ms, marquee_tick, NULL);
}

static void marquee_reset(void) {
  s_marquee_offset = 0;
  s_marquee_max = 0;
  s_marquee_at_end = false;
  MenuLayer *menu = active_menu();
  if (menu) layer_mark_dirty(menu_layer_get_layer(menu));
  marquee_schedule(MARQUEE_PAUSE_MS);
}

static void marquee_tick(void *context) {
  s_marquee_timer = NULL;
  MenuLayer *menu = active_menu();
  if (!menu || s_marquee_max <= 0) {
    return;
  }

  if (s_marquee_at_end) {
    s_marquee_offset = 0;
    s_marquee_at_end = false;
    layer_mark_dirty(menu_layer_get_layer(menu));
    marquee_schedule(MARQUEE_PAUSE_MS);
    return;
  }

  s_marquee_offset += MARQUEE_STEP_PIXELS;
  if (s_marquee_offset >= s_marquee_max) {
    s_marquee_offset = s_marquee_max;
    s_marquee_at_end = true;
    marquee_schedule(MARQUEE_PAUSE_MS);
  } else {
    marquee_schedule(MARQUEE_FRAME_MS);
  }
  layer_mark_dirty(menu_layer_get_layer(menu));
}

static void marquee_selection_changed(MenuLayer *menu_layer, MenuIndex new_index,
                                      MenuIndex old_index, void *context) {
  marquee_reset();
}

static void menu_window_appear(Window *window) {
  marquee_reset();
}

static bool voice_supported_platform(void) {
  return PBL_PLATFORM_TYPE_CURRENT == PlatformTypeEmery;
}

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
  if (!s_theme_icons) return NULL;
  highlighted = highlighted && gcolor_equal(s_theme_selection_text, GColorWhite);
  uint32_t normal = RESOURCE_ID_DEVICE_GENERIC;
  uint32_t selected = RESOURCE_ID_DEVICE_GENERIC_SELECTED;
#define ICON_PAIR(name) do { normal = RESOURCE_ID_DEVICE_##name; selected = RESOURCE_ID_DEVICE_##name##_SELECTED; } while (0)
  if (strcmp(type, "light") == 0 || strcmp(type, "light-group") == 0) { ICON_PAIR(LIGHT); }
  else if (strcmp(type, "fan") == 0) { ICON_PAIR(FAN); }
  else if (strcmp(type, "switch") == 0) { ICON_PAIR(SWITCH); }
  else if (strcmp(type, "outlet") == 0) { ICON_PAIR(OUTLET); }
  else if (strcmp(type, "blinds") == 0) { ICON_PAIR(BLINDS); }
  else if (strcmp(type, "lock") == 0) { ICON_PAIR(LOCK); }
  else if (strcmp(type, "garage-door") == 0) { ICON_PAIR(GARAGE); }
  else if (strcmp(type, "thermostat") == 0 || strcmp(type, "heater-cooler") == 0 ||
           strcmp(type, "humidifier") == 0 || strcmp(type, "dehumidifier") == 0 ||
           strcmp(type, "humidifier-dehumidifier") == 0 || strcmp(type, "air-purifier") == 0) {
    ICON_PAIR(CLIMATE);
  }
#undef ICON_PAIR
  // Rows draw synchronously; only the current row's icon needs to occupy RAM.
  uint32_t resource = highlighted ? selected : normal;
  if (!s_device_icon || resource != s_device_icon_resource) {
    gbitmap_destroy(s_device_icon);
    s_device_icon = gbitmap_create_with_resource(resource);
    s_device_icon_resource = resource;
  }
  return s_device_icon;
}

#if defined(PBL_PLATFORM_EMERY)
static void unload_custom_theme_font(void) {
  if (s_custom_theme_font) {
    fonts_unload_custom_font(s_custom_theme_font);
    s_custom_theme_font = NULL;
  }
  s_custom_theme_font_id = 255;
  s_custom_theme_font_size = 0;
}

static uint8_t custom_size_index(void) {
  if (s_theme_size <= 14) return 0;
  if (s_theme_size <= 18) return 1;
  if (s_theme_size <= 22) return 2;
  if (s_theme_size <= 26) return 3;
  return 4;
}

static GFont time2_theme_font(void) {
  static const uint32_t font_resources[5][5] = {
    {RESOURCE_ID_INTER_14, RESOURCE_ID_INTER_18, RESOURCE_ID_INTER_22,
     RESOURCE_ID_INTER_26, RESOURCE_ID_INTER_30},
    {RESOURCE_ID_ROBOTO_14, RESOURCE_ID_ROBOTO_18, RESOURCE_ID_ROBOTO_22,
     RESOURCE_ID_ROBOTO_26, RESOURCE_ID_ROBOTO_30},
    {RESOURCE_ID_OPEN_SANS_14, RESOURCE_ID_OPEN_SANS_18, RESOURCE_ID_OPEN_SANS_22,
     RESOURCE_ID_OPEN_SANS_26, RESOURCE_ID_OPEN_SANS_30},
    {RESOURCE_ID_MONTSERRAT_14, RESOURCE_ID_MONTSERRAT_18, RESOURCE_ID_MONTSERRAT_22,
     RESOURCE_ID_MONTSERRAT_26, RESOURCE_ID_MONTSERRAT_30},
    {RESOURCE_ID_POPPINS_14, RESOURCE_ID_POPPINS_18, RESOURCE_ID_POPPINS_22,
     RESOURCE_ID_POPPINS_26, RESOURCE_ID_POPPINS_30},
  };
  uint8_t family = s_theme_font - 5;
  uint8_t size_index = custom_size_index();
  uint8_t actual_size = (uint8_t[]){14, 18, 22, 26, 30}[size_index];
  if (s_custom_theme_font && s_custom_theme_font_id == s_theme_font &&
      s_custom_theme_font_size == actual_size) {
    return s_custom_theme_font;
  }
  unload_custom_theme_font();
  s_custom_theme_font = fonts_load_custom_font(
    resource_get_handle(font_resources[family][size_index]));
  s_custom_theme_font_id = s_theme_font;
  s_custom_theme_font_size = actual_size;
  return s_custom_theme_font ? s_custom_theme_font :
    fonts_get_system_font(FONT_KEY_GOTHIC_24);
}
#endif

static GFont theme_title_font(void) {
#if defined(PBL_PLATFORM_EMERY)
  if (s_theme_font >= 5 && s_theme_font <= 9) return time2_theme_font();
  unload_custom_theme_font();
#endif
  if (s_theme_font == 2) return fonts_get_system_font(FONT_KEY_ROBOTO_CONDENSED_21);
  if (s_theme_font == 3) return fonts_get_system_font(FONT_KEY_DROID_SERIF_28_BOLD);
  if (s_theme_font == 4) return fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK);
  if (s_theme_font == 1) {
    if (s_theme_size <= 14) return fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD);
    if (s_theme_size <= 18) return fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
    if (s_theme_size >= 28) return fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
    return fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  }
  if (s_theme_size <= 14) return fonts_get_system_font(FONT_KEY_GOTHIC_14);
  if (s_theme_size <= 18) return fonts_get_system_font(FONT_KEY_GOTHIC_18);
  if (s_theme_size >= 28) return fonts_get_system_font(FONT_KEY_GOTHIC_28);
  return fonts_get_system_font(FONT_KEY_GOTHIC_24);
}

static int16_t theme_cell_height(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  if (s_theme_size <= 14) return 32;
  if (s_theme_size <= 18) return 38;
  if (s_theme_size <= 21) return 42;
  if (s_theme_size <= 24) return 46;
  if (s_theme_size <= 28) return 52;
  return 56;
}

static void theme_cell_draw(GContext *ctx, const Layer *cell_layer, const char *title,
                            const char *subtitle, GBitmap *icon) {
  GRect bounds = layer_get_bounds(cell_layer);
  bool highlighted = menu_cell_layer_is_highlighted(cell_layer);
  graphics_context_set_text_color(ctx, highlighted ? s_theme_selection_text : s_theme_text);

  int16_t text_x = 6;
  GRect icon_rect = GRectZero;
  bool has_icon = s_theme_icons && icon;
  if (s_theme_icons && icon) {
    GRect icon_bounds = gbitmap_get_bounds(icon);
    int16_t icon_y = (bounds.size.h - icon_bounds.size.h) / 2;
    icon_rect = GRect(5, icon_y, icon_bounds.size.w, icon_bounds.size.h);
    text_x = icon_bounds.size.w + 10;
  }

  int16_t approximate_height = s_theme_size <= 14 ? 20 : s_theme_size <= 18 ? 24 :
                               s_theme_size <= 24 ? 30 : 36;
  int16_t subtitle_y = s_theme_size <= 14 ? 14 : s_theme_size <= 18 ? 18 :
                         s_theme_size <= 24 ? 24 : 30;
  int16_t title_y;
  if (subtitle && subtitle[0]) {
    title_y = s_theme_size <= 18 ? -3 : -5;
  } else {
    title_y = (bounds.size.h - approximate_height) / 2 - 2;
  }
  int16_t title_height = subtitle && subtitle[0] ? subtitle_y - title_y : approximate_height;
  GFont title_font = theme_title_font();
  int16_t title_width = bounds.size.w - text_x - 3;
  if (highlighted) {
    GSize content_size = graphics_text_layout_get_content_size(title, title_font,
      GRect(0, 0, 1000, title_height), GTextOverflowModeFill, GTextAlignmentLeft);
    s_marquee_max = content_size.w > title_width ? content_size.w - title_width + 6 : 0;
    if (s_marquee_max > 0) {
      if (!s_marquee_timer) marquee_schedule(MARQUEE_PAUSE_MS);
      graphics_draw_text(ctx, title, title_font,
        GRect(text_x - s_marquee_offset, title_y, content_size.w + 4, title_height),
        GTextOverflowModeFill, GTextAlignmentLeft, NULL);
    } else {
      s_marquee_offset = 0;
      s_marquee_at_end = false;
      graphics_draw_text(ctx, title, title_font,
        GRect(text_x, title_y, title_width, title_height),
        GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
    }
  } else {
    graphics_draw_text(ctx, title, title_font,
      GRect(text_x, title_y, title_width, title_height),
      GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }
  if (has_icon) {
    graphics_context_set_fill_color(ctx, highlighted ? s_theme_selection : s_theme_background);
    graphics_fill_rect(ctx, GRect(0, 0, text_x, bounds.size.h), 0, GCornerNone);
    graphics_context_set_compositing_mode(ctx, GCompOpSet);
    graphics_draw_bitmap_in_rect(ctx, icon, icon_rect);
  }
  if (subtitle && subtitle[0]) {
    graphics_draw_text(ctx, subtitle, fonts_get_system_font(FONT_KEY_GOTHIC_14),
      GRect(text_x, subtitle_y, bounds.size.w - text_x - 3, 18),
      GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }
}

static void theme_header_draw(GContext *ctx, const Layer *cell_layer, const char *title) {
  GRect bounds = layer_get_bounds(cell_layer);
  graphics_context_set_fill_color(ctx, s_theme_selection);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);
  graphics_context_set_text_color(ctx, s_theme_selection_text);
  graphics_draw_text(ctx, title, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD),
    GRect(6, -2, bounds.size.w - 12, bounds.size.h + 2), GTextOverflowModeTrailingEllipsis,
    GTextAlignmentLeft, NULL);
}

static void apply_theme_to_menu(MenuLayer *menu) {
  if (!menu) return;
  menu_layer_set_normal_colors(menu, s_theme_background, s_theme_text);
  menu_layer_set_highlight_colors(menu, s_theme_selection, s_theme_selection_text);
  menu_layer_reload_data(menu);
}

static void apply_theme(void) {
  Window *windows[] = {s_root_window, s_list_window, s_device_window, s_sensor_window,
                       s_room_scene_window, s_action_window, s_preset_window, s_theme_window,
                       s_settings_window, s_pin_window, s_shortcut_window, s_shortcut_target_window,
                       s_confirm_window};
  for (size_t i = 0; i < ARRAY_LENGTH(windows); i++) {
    if (windows[i]) window_set_background_color(windows[i], s_theme_background);
  }
  apply_theme_to_menu(s_root_menu);
  apply_theme_to_menu(s_list_menu);
  apply_theme_to_menu(s_device_menu);
  apply_theme_to_menu(s_sensor_menu);
  apply_theme_to_menu(s_room_scene_menu);
  apply_theme_to_menu(s_action_menu);
  apply_theme_to_menu(s_preset_menu);
  apply_theme_to_menu(s_theme_menu);
  apply_theme_to_menu(s_settings_menu);
  apply_theme_to_menu(s_pin_menu);
  apply_theme_to_menu(s_shortcut_menu);
  apply_theme_to_menu(s_shortcut_target_menu);
  if (s_confirm_title) {
    text_layer_set_background_color(s_confirm_title, GColorClear);
    text_layer_set_text_color(s_confirm_title, s_theme_text);
    text_layer_set_font(s_confirm_title, theme_title_font());
  }
  if (s_confirm_hint) {
    text_layer_set_background_color(s_confirm_hint, GColorClear);
    text_layer_set_text_color(s_confirm_hint, s_theme_text);
  }
  marquee_reset();
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
  if (!voice_supported_platform()) {
    show_voice_info("Voice requires\nPebble Time 2");
    return;
  }
  if (!s_dictation_session) {
    s_dictation_session = dictation_session_create(MAX_VOICE_LENGTH, dictation_callback, NULL);
    if (s_dictation_session) {
      dictation_session_enable_confirmation(s_dictation_session, false);
    }
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

// Store names separately to keep the original Time's RAM usage small. Updating
// the ordered slot list commits a pin/unpin only after its name has been saved.
static void pin_name(uint16_t index, char *name) {
  name[0] = '\0';
  if (index < s_pin_count) {
    persist_read_string(PIN_NAME_KEY + s_pin_slots[index], name, MAX_NAME_LENGTH);
  }
}

static int pin_index(const char *name) {
  char saved[MAX_NAME_LENGTH];
  for (uint16_t i = 0; i < s_pin_count; i++) {
    pin_name(i, saved);
    if (strcmp(saved, name) == 0) return i;
  }
  return -1;
}

static void load_pins(void) {
  int size = persist_get_size(PIN_ORDER_KEY);
  if (size <= 0 || size > MAX_ITEMS) return;
  uint8_t slots[MAX_ITEMS];
  if (persist_read_data(PIN_ORDER_KEY, slots, size) != size) return;
  char name[MAX_NAME_LENGTH];
  for (int i = 0; i < size; i++) {
    if (slots[i] >= MAX_ITEMS) continue;
    name[0] = '\0';
    persist_read_string(PIN_NAME_KEY + slots[i], name, sizeof(name));
    if (name[0] && pin_index(name) < 0) s_pin_slots[s_pin_count++] = slots[i];
  }
}

static bool toggle_pin(const char *name) {
  int index = pin_index(name);
  uint8_t slots[MAX_ITEMS];
  memcpy(slots, s_pin_slots, s_pin_count);
  uint16_t count = s_pin_count;
  if (index >= 0) {
    memmove(slots + index, slots + index + 1, count - index - 1);
    count--;
  } else {
    if (!name[0] || count == MAX_ITEMS) return false;
    uint8_t slot = 0;
    for (; slot < MAX_ITEMS; slot++) {
      bool used = false;
      for (uint16_t i = 0; i < count; i++) if (slots[i] == slot) used = true;
      if (!used) break;
    }
    if (persist_write_string(PIN_NAME_KEY + slot, name) < 0) return false;
    slots[count++] = slot;
  }
  if (count == 0) {
    if (persist_delete(PIN_ORDER_KEY) < 0) return false;
  } else if (persist_write_data(PIN_ORDER_KEY, slots, count) != count) {
    return false;
  }
  if (index >= 0) persist_delete(PIN_NAME_KEY + s_pin_slots[index]);
  memcpy(s_pin_slots, slots, count);
  s_pin_count = count;
  return true;
}

// Keep missing/renamed scenes available here so their old pins can be removed.
static bool pin_is_missing(uint16_t index) {
  char name[MAX_NAME_LENGTH];
  pin_name(index, name);
  for (uint16_t i = 0; i < s_scene_count; i++) {
    if (strcmp(s_scenes[i].name, name) == 0) return false;
  }
  return true;
}

static uint16_t pin_picker_count(void) {
  uint16_t count = s_scene_count;
  for (uint16_t i = 0; i < s_pin_count; i++) if (pin_is_missing(i)) count++;
  return count;
}

static void pin_picker_name(uint16_t row, char *name) {
  name[0] = '\0';
  if (row < s_scene_count) {
    snprintf(name, MAX_NAME_LENGTH, "%s", s_scenes[row].name);
    return;
  }
  row -= s_scene_count;
  for (uint16_t i = 0; i < s_pin_count; i++) {
    if (pin_is_missing(i)) {
      if (row == 0) { pin_name(i, name); return; }
      row--;
    }
  }
}

static uint16_t pin_get_num_rows(MenuLayer *menu, uint16_t section, void *context) {
  uint16_t count = pin_picker_count();
  return count ? count : 1;
}

static void pin_draw_header(GContext *ctx, const Layer *layer, uint16_t section, void *context) {
  theme_header_draw(ctx, layer, "Pinned Scenes");
}

static void pin_draw_row(GContext *ctx, const Layer *layer, MenuIndex *index, void *context) {
  char name[MAX_NAME_LENGTH];
  pin_picker_name(index->row, name);
  theme_cell_draw(ctx, layer, name[0] ? name : s_loading ? "Loading..." : "No scenes",
                  name[0] ? (pin_index(name) >= 0 ? "Pinned - select to unpin" : "Select to pin") : NULL,
                  NULL);
}

static void pin_select_click(MenuLayer *menu, MenuIndex *index, void *context) {
  char name[MAX_NAME_LENGTH];
  pin_picker_name(index->row, name);
  if (!name[0]) return;
  if (!toggle_pin(name)) { show_voice_info("Could not save pin"); return; }
  marquee_reset();
  menu_layer_reload_data(s_pin_menu);
  if (s_root_menu) menu_layer_reload_data(s_root_menu);
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

static SceneItem *list_items(void) {
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
  return visible_root_count() + 3 + s_pin_count;
}

static void root_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                          void *context) {
  uint16_t visible_count = visible_root_count();
  if (cell_index->row < s_pin_count) {
    char name[MAX_NAME_LENGTH];
    pin_name(cell_index->row, name);
    theme_cell_draw(ctx, cell_layer, name, "Scene", NULL);
    return;
  }
  uint16_t row = cell_index->row - s_pin_count;
  if (row == 0) {
    theme_cell_draw(ctx, cell_layer, "Voice",
                    voice_supported_platform() ? "Speak a command" : "Requires Time 2", NULL);
  } else if (row <= visible_count) {
    ItemKind kind = root_kind_at(row - 1);
    theme_cell_draw(ctx, cell_layer, root_kind_label(kind),
                    s_loading ? "Loading..." : NULL, NULL);
  } else if (row == visible_count + 1) {
    theme_cell_draw(ctx, cell_layer, "Refresh", s_status, NULL);
  } else {
    theme_cell_draw(ctx, cell_layer, "Settings", NULL, NULL);
  }
}

static uint16_t list_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                  void *context) {
  return list_count();
}

static void list_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                          void *context) {
  SceneItem *item = &list_items()[cell_index->row];
  const char *subtitle = NULL;
  if (s_current_kind != ITEM_KIND_ROOM && item->active) subtitle = "Active";
  theme_cell_draw(ctx, cell_layer, item->name, subtitle, NULL);
}

static void list_draw_header(GContext *ctx, const Layer *cell_layer,
                             uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, list_title());
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
    theme_cell_draw(ctx, cell_layer, "Loading...", NULL, NULL);
    return;
  }
  if (s_device_error[0]) {
    theme_cell_draw(ctx, cell_layer, s_device_error, NULL, NULL);
    return;
  }

  if (sensors_visible() && cell_index->row == 0) {
    static char subtitle[24];
    snprintf(subtitle, sizeof(subtitle), "%u reading%s", s_sensor_count,
             s_sensor_count == 1 ? "" : "s");
    theme_cell_draw(ctx, cell_layer, "Sensors", subtitle, NULL);
    return;
  }

  uint16_t scenes_row = sensors_visible() ? 1 : 0;
  if (cell_index->row == scenes_row) {
    static char subtitle[24];
    snprintf(subtitle, sizeof(subtitle), "%u scene%s", s_room_scene_count,
             s_room_scene_count == 1 ? "" : "s");
    theme_cell_draw(ctx, cell_layer, "Scenes", subtitle, NULL);
    return;
  }

  uint16_t all_lights_row = scenes_row + 1;
  uint16_t lights = light_count();
  if (lights > 0 && cell_index->row == all_lights_row) {
    static char subtitle[24];
    snprintf(subtitle, sizeof(subtitle), "%u light%s", lights, lights == 1 ? "" : "s");
    theme_cell_draw(ctx, cell_layer, "All Lights", subtitle,
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
  theme_cell_draw(ctx, cell_layer,
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
  theme_cell_draw(ctx, cell_layer,
                  display_name_in_room(sensor->name, display_name, sizeof(display_name)),
                  value[0] ? value : "Unknown", NULL);
}

static void sensor_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, "Sensors");
}

static uint16_t room_scene_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                        void *context) {
  return s_room_scene_count == 0 ? 1 : s_room_scene_count;
}

static void room_scene_draw_row(GContext *ctx, const Layer *cell_layer,
                                MenuIndex *cell_index, void *context) {
  if (s_room_scene_count == 0) {
    theme_cell_draw(ctx, cell_layer, "No scenes", NULL, NULL);
    return;
  }
  SceneItem *scene = &s_room_scenes[cell_index->row];
  theme_cell_draw(ctx, cell_layer, scene->name, scene->active ? "Active" : NULL, NULL);
}

static void room_scene_draw_header(GContext *ctx, const Layer *cell_layer,
                                   uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, "Scenes");
}

static void room_scene_select_click(MenuLayer *menu_layer, MenuIndex *cell_index,
                                    void *context) {
  if (s_room_scene_count == 0) return;
  SceneItem *scene = &s_room_scenes[cell_index->row];
  if (scene_is_sensitive(scene->name)) {
    show_scene_confirmation(scene->name);
  } else {
    run_scene(scene->name);
  }
}

static void device_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, s_selected_room);
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
  theme_cell_draw(ctx, cell_layer, labels[cell_index->row], NULL, NULL);
}

static void action_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, s_selected_device);
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
  theme_cell_draw(ctx, cell_layer, label, NULL, NULL);
}

static void preset_draw_header(GContext *ctx, const Layer *cell_layer,
                               uint16_t section_index, void *context) {
  const char *title = s_preset_kind == PRESET_COLOR ? "Color"
                      : s_preset_kind == PRESET_SPEED ? "Speed" : "Brightness";
  theme_header_draw(ctx, cell_layer, title);
}

static uint16_t theme_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                   void *context) {
  return s_theme_loading || s_theme_count == 0 ? 1 : s_theme_count;
}

static void theme_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                           void *context) {
  if (s_theme_loading) {
    theme_cell_draw(ctx, cell_layer, "Loading themes...", NULL, NULL);
    return;
  }
  if (s_theme_count == 0) {
    theme_cell_draw(ctx, cell_layer, "No themes", NULL, NULL);
    return;
  }
  ThemeChoice *theme = &s_themes[cell_index->row];
  theme_cell_draw(ctx, cell_layer, theme->name, theme->active ? "Current" : NULL, NULL);
}

static void theme_draw_header(GContext *ctx, const Layer *cell_layer,
                              uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, "Themes");
}

static void apply_theme_choice(ThemeChoice *theme) {
  s_theme_background = theme->background;
  s_theme_text = theme->text;
  s_theme_selection = theme->selection;
  s_theme_selection_text = theme->selection_text;
#if defined(PBL_PLATFORM_EMERY)
  s_theme_font = theme->font <= 9 ? theme->font : 0;
#else
  s_theme_font = theme->font <= 4 ? theme->font : 0;
#endif
  s_theme_size = theme->size >= 14 && theme->size <= 30 ? theme->size : 24;
  s_theme_icons = theme->icons;
  apply_theme();
}

static void theme_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  if (s_theme_loading || cell_index->row >= s_theme_count) return;
  for (uint16_t i = 0; i < s_theme_count; i++) s_themes[i].active = false;
  ThemeChoice *theme = &s_themes[cell_index->row];
  theme->active = true;
  apply_theme_choice(theme);

  DictionaryIterator *out = NULL;
  if (app_message_outbox_begin(&out) != APP_MSG_OK || !out) {
    set_status("Phone unavailable");
    vibes_short_pulse();
    return;
  }
  dict_write_uint8(out, MESSAGE_KEY_COMMAND, COMMAND_SET_THEME);
  dict_write_uint16(out, MESSAGE_KEY_ITEM_INDEX, cell_index->row);
  dict_write_end(out);
  app_message_outbox_send();
  vibes_short_pulse();
}

static void show_theme_picker(void) {
  s_theme_count = 0;
  s_theme_loading = true;
  window_stack_push(s_theme_window, true);
  send_command(COMMAND_LOAD_THEMES, NULL, NULL, NULL);
}

static const char *shortcut_value(uint8_t button) {
  if (button == 0) return s_shortcut_up;
  if (button == 1) return s_shortcut_select;
  return s_shortcut_down;
}

static const char *shortcut_button_name(uint8_t button) {
  if (button == 0) return "Up";
  if (button == 1) return "Select";
  return "Down";
}

static const char *shortcut_target_label(const char *target, char *buffer, size_t size) {
  if (strcmp(target, "off") == 0) return "Off";
  if (strcmp(target, "voice") == 0) return "Voice";
  if (strcmp(target, "favorites") == 0) return "Favorites";
  if (strcmp(target, "scenes") == 0) return "Scenes";
  if (strcmp(target, "rooms") == 0) return "Rooms";
  if (strcmp(target, "themes") == 0) return "Themes";
  if (strncmp(target, "scene:", 6) == 0 && target[6]) {
    snprintf(buffer, size, "Scene: %s", target + 6);
    return buffer;
  }
  return "Off";
}

static uint16_t settings_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                      void *context) {
  return 3;
}

static void settings_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                              void *context) {
  const char *titles[] = {"Themes", "Long Press Buttons", "Pinned Scenes"};
  const char *subtitles[] = {"Choose a theme", "Up, Select, Down", "Pin or unpin scenes"};
  theme_cell_draw(ctx, cell_layer, titles[cell_index->row], subtitles[cell_index->row], NULL);
}

static void settings_draw_header(GContext *ctx, const Layer *cell_layer,
                                 uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, "Settings");
}

static void settings_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  if (cell_index->row == 0) show_theme_picker();
  else if (cell_index->row == 1) window_stack_push(s_shortcut_window, true);
  else window_stack_push(s_pin_window, true);
}

static uint16_t shortcut_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                      void *context) {
  return 3;
}

static void shortcut_draw_row(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index,
                              void *context) {
  static char label[MAX_SHORTCUT_LENGTH];
  const char *target = shortcut_value(cell_index->row);
  theme_cell_draw(ctx, cell_layer, shortcut_button_name(cell_index->row),
                  shortcut_target_label(target, label, sizeof(label)), NULL);
}

static void shortcut_draw_header(GContext *ctx, const Layer *cell_layer,
                                 uint16_t section_index, void *context) {
  theme_header_draw(ctx, cell_layer, "Long Press Buttons");
}

static void shortcut_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  s_selected_shortcut_button = cell_index->row;
  window_stack_push(s_shortcut_target_window, true);
}

static const char *shortcut_target_at(uint16_t row, char *buffer, size_t size) {
  static const char *targets[] = {"off", "voice", "favorites", "scenes", "rooms", "themes"};
  if (row < ARRAY_LENGTH(targets)) return targets[row];
  uint16_t scene_index = row - ARRAY_LENGTH(targets);
  if (scene_index < s_scene_count) {
    snprintf(buffer, size, "scene:%s", s_scenes[scene_index].name);
    return buffer;
  }
  return "off";
}

static uint16_t shortcut_target_get_num_rows(MenuLayer *menu_layer, uint16_t section_index,
                                             void *context) {
  return 6 + s_scene_count;
}

static void shortcut_target_draw_row(GContext *ctx, const Layer *cell_layer,
                                     MenuIndex *cell_index, void *context) {
  static char target[MAX_SHORTCUT_LENGTH];
  static char label[MAX_SHORTCUT_LENGTH];
  const char *value = shortcut_target_at(cell_index->row, target, sizeof(target));
  const char *title = shortcut_target_label(value, label, sizeof(label));
  theme_cell_draw(ctx, cell_layer, title,
                  strcmp(value, shortcut_value(s_selected_shortcut_button)) == 0 ? "Current" : NULL,
                  NULL);
}

static void shortcut_target_draw_header(GContext *ctx, const Layer *cell_layer,
                                        uint16_t section_index, void *context) {
  static char title[24];
  snprintf(title, sizeof(title), "%s Long Press", shortcut_button_name(s_selected_shortcut_button));
  theme_header_draw(ctx, cell_layer, title);
}

static void shortcut_target_select_click(MenuLayer *menu_layer, MenuIndex *cell_index,
                                         void *context) {
  char target[MAX_SHORTCUT_LENGTH];
  const char *value = shortcut_target_at(cell_index->row, target, sizeof(target));
  char *destination = s_selected_shortcut_button == 0 ? s_shortcut_up :
                      s_selected_shortcut_button == 1 ? s_shortcut_select : s_shortcut_down;
  snprintf(destination, MAX_SHORTCUT_LENGTH, "%s", value);
  window_set_click_config_provider_with_context(
    s_root_window, root_shortcut_click_config_provider, s_root_menu);
  if (s_shortcut_menu) menu_layer_reload_data(s_shortcut_menu);
  if (s_shortcut_target_menu) menu_layer_reload_data(s_shortcut_target_menu);

  DictionaryIterator *out = NULL;
  if (app_message_outbox_begin(&out) != APP_MSG_OK || !out) {
    set_status("Phone unavailable");
    vibes_short_pulse();
    return;
  }
  dict_write_uint8(out, MESSAGE_KEY_COMMAND, COMMAND_SET_SHORTCUT);
  dict_write_uint16(out, MESSAGE_KEY_ITEM_INDEX, s_selected_shortcut_button);
  dict_write_cstring(out, MESSAGE_KEY_ITEM_NAME, value);
  dict_write_end(out);
  app_message_outbox_send();
  vibes_short_pulse();
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

static void show_voice_info(const char *text) {
  snprintf(s_confirm_text, sizeof(s_confirm_text), "%s", text);
  s_confirm_mode = CONFIRM_INFO;
  window_stack_push(s_confirm_window, true);
}

static void list_select_click(MenuLayer *menu_layer, MenuIndex *cell_index, void *context) {
  SceneItem *item = &list_items()[cell_index->row];
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
  if (cell_index->row < s_pin_count) {
    char name[MAX_NAME_LENGTH];
    pin_name(cell_index->row, name);
    if (scene_is_sensitive(name)) show_scene_confirmation(name);
    else if (name[0]) run_scene(name);
    return;
  }
  uint16_t row = cell_index->row - s_pin_count;
  if (row == 0) {
    start_voice();
  } else if (row <= visible_count) {
    push_list(root_kind_at(row - 1));
  } else if (row == visible_count + 1) {
    refresh_lists();
  } else {
    window_stack_push(s_settings_window, true);
  }
}

static void run_shortcut(const char *target) {
  if (!target || !target[0] || strcmp(target, "off") == 0) return;
  vibes_short_pulse();
  if (strcmp(target, "voice") == 0) {
    start_voice();
  } else if (strcmp(target, "favorites") == 0) {
    push_list(ITEM_KIND_FAVORITE);
  } else if (strcmp(target, "scenes") == 0) {
    push_list(ITEM_KIND_SCENE);
  } else if (strcmp(target, "rooms") == 0) {
    push_list(ITEM_KIND_ROOM);
  } else if (strcmp(target, "themes") == 0) {
    show_theme_picker();
  } else if (strncmp(target, "scene:", 6) == 0 && target[6]) {
    run_scene(target + 6);
  }
}

static void root_long_click(ClickRecognizerRef recognizer, void *context) {
  ButtonId button = click_recognizer_get_button_id(recognizer);
  if (button == BUTTON_ID_UP) run_shortcut(s_shortcut_up);
  else if (button == BUTTON_ID_SELECT) run_shortcut(s_shortcut_select);
  else if (button == BUTTON_ID_DOWN) run_shortcut(s_shortcut_down);
}

static void root_single_click(ClickRecognizerRef recognizer, void *context) {
  if (!s_root_menu) return;
  ButtonId button = click_recognizer_get_button_id(recognizer);
  if (button == BUTTON_ID_UP) {
    menu_layer_set_selected_next(s_root_menu, true, MenuRowAlignCenter, true);
  } else if (button == BUTTON_ID_DOWN) {
    menu_layer_set_selected_next(s_root_menu, false, MenuRowAlignCenter, true);
  } else if (button == BUTTON_ID_SELECT) {
    MenuIndex selected = menu_layer_get_selected_index(s_root_menu);
    root_select_click(s_root_menu, &selected, NULL);
  }
}

static void root_shortcut_click_config_provider(void *context) {
  if (strcmp(s_shortcut_up, "off") == 0) {
    window_single_repeating_click_subscribe(BUTTON_ID_UP, 100, root_single_click);
  } else {
    window_single_click_subscribe(BUTTON_ID_UP, root_single_click);
    window_long_click_subscribe(BUTTON_ID_UP, 700, root_long_click, NULL);
  }
  window_single_click_subscribe(BUTTON_ID_SELECT, root_single_click);
  if (strcmp(s_shortcut_select, "off") != 0) {
    window_long_click_subscribe(BUTTON_ID_SELECT, 700, root_long_click, NULL);
  }
  if (strcmp(s_shortcut_down, "off") == 0) {
    window_single_repeating_click_subscribe(BUTTON_ID_DOWN, 100, root_single_click);
  } else {
    window_single_click_subscribe(BUTTON_ID_DOWN, root_single_click);
    window_long_click_subscribe(BUTTON_ID_DOWN, 700, root_long_click, NULL);
  }
}

static void maybe_auto_open(void) {
  if (!s_auto_opened && s_pin_count == 0 && visible_root_count() == 1) {
    s_auto_opened = true;
    push_list(root_kind_at(0));
  }
}

static void inbox_received(DictionaryIterator *iterator, void *context) {
  Tuple *item_kind_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_KIND);
  bool is_theme_catalog_item = item_kind_tuple &&
    item_kind_tuple->value->uint8 == ITEM_KIND_THEME;
  Tuple *shortcut_up = dict_find(iterator, MESSAGE_KEY_SHORTCUT_UP);
  Tuple *shortcut_select = dict_find(iterator, MESSAGE_KEY_SHORTCUT_SELECT);
  Tuple *shortcut_down = dict_find(iterator, MESSAGE_KEY_SHORTCUT_DOWN);
  if (shortcut_up || shortcut_select || shortcut_down) {
    if (shortcut_up) snprintf(s_shortcut_up, sizeof(s_shortcut_up), "%s", shortcut_up->value->cstring);
    if (shortcut_select) {
      snprintf(s_shortcut_select, sizeof(s_shortcut_select), "%s", shortcut_select->value->cstring);
    }
    if (shortcut_down) {
      snprintf(s_shortcut_down, sizeof(s_shortcut_down), "%s", shortcut_down->value->cstring);
    }
    if (s_root_menu) {
      window_set_click_config_provider_with_context(
        s_root_window, root_shortcut_click_config_provider, s_root_menu);
    }
    if (s_shortcut_menu) menu_layer_reload_data(s_shortcut_menu);
    if (s_shortcut_target_menu) menu_layer_reload_data(s_shortcut_target_menu);
  }

  Tuple *theme_background = dict_find(iterator, MESSAGE_KEY_THEME_BACKGROUND);
  Tuple *theme_text = dict_find(iterator, MESSAGE_KEY_THEME_TEXT);
  Tuple *theme_selection = dict_find(iterator, MESSAGE_KEY_THEME_SELECTION);
  Tuple *theme_selection_text = dict_find(iterator, MESSAGE_KEY_THEME_SELECTION_TEXT);
  Tuple *theme_font = dict_find(iterator, MESSAGE_KEY_THEME_FONT);
  Tuple *theme_size = dict_find(iterator, MESSAGE_KEY_THEME_SIZE);
  Tuple *theme_icons = dict_find(iterator, MESSAGE_KEY_THEME_ICONS);
  if (!is_theme_catalog_item && (theme_background || theme_text || theme_selection ||
      theme_selection_text || theme_font || theme_size || theme_icons)) {
    if (theme_background) s_theme_background.argb = theme_background->value->uint8;
    if (theme_text) s_theme_text.argb = theme_text->value->uint8;
    if (theme_selection) s_theme_selection.argb = theme_selection->value->uint8;
    if (theme_selection_text) s_theme_selection_text.argb = theme_selection_text->value->uint8;
    if (theme_font) {
      uint8_t requested_font = (uint8_t)theme_font->value->int32;
#if defined(PBL_PLATFORM_EMERY)
      s_theme_font = requested_font <= 9 ? requested_font : 0;
#else
      s_theme_font = requested_font <= 4 ? requested_font : 0;
#endif
    }
    if (theme_size) {
      uint8_t requested_size = theme_size->value->uint8;
      s_theme_size = requested_size >= 14 && requested_size <= 30 ? requested_size : 24;
    }
    if (theme_icons) s_theme_icons = theme_icons->value->int8 != 0;
    apply_theme();
  }

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
    if (s_theme_loading) {
      s_theme_loading = false;
      s_theme_count = 0;
      if (s_theme_menu) menu_layer_reload_data(s_theme_menu);
    }
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
    } else if (strcmp(status->value->cstring, "Shortcut saved") == 0) {
      vibes_double_pulse();
    }
  }

  Tuple *kind_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_KIND);
  Tuple *index_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_INDEX);
  Tuple *name_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_NAME);
  if (kind_tuple && index_tuple && name_tuple) {
    ItemKind kind = kind_tuple->value->uint8;
    uint16_t index = index_tuple->value->uint16;
    if (kind == ITEM_KIND_THEME && index < MAX_THEMES) {
      ThemeChoice *theme = &s_themes[index];
      snprintf(theme->name, sizeof(theme->name), "%s", name_tuple->value->cstring);
      theme->background.argb = theme_background ? theme_background->value->uint8 : GColorWhite.argb;
      theme->text.argb = theme_text ? theme_text->value->uint8 : GColorBlack.argb;
      theme->selection.argb = theme_selection ? theme_selection->value->uint8 : GColorBlack.argb;
      theme->selection_text.argb = theme_selection_text ?
        theme_selection_text->value->uint8 : GColorWhite.argb;
      theme->font = theme_font ? (uint8_t)theme_font->value->int32 : 0;
      theme->size = theme_size ? theme_size->value->uint8 : 24;
      theme->icons = !theme_icons || theme_icons->value->int8 != 0;
      Tuple *active_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_ACTIVE);
      theme->active = active_tuple && active_tuple->value->int8 != 0;
      if (index >= s_theme_count) s_theme_count = index + 1;
      return;
    }
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
    if (index < MAX_ITEMS && (kind == ITEM_KIND_FAVORITE || kind == ITEM_KIND_SCENE ||
                             kind == ITEM_KIND_ROOM || kind == ITEM_KIND_ROOM_SCENE)) {
      SceneItem *items;
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
      } else {
        items = s_room_scenes;
        count = &s_room_scene_count;
      }
      snprintf(items[index].name, sizeof(items[index].name), "%s", name_tuple->value->cstring);
      Tuple *active_tuple = dict_find(iterator, MESSAGE_KEY_ITEM_ACTIVE);
      items[index].active = active_tuple && active_tuple->value->int8 != 0;
      if (index >= *count) *count = index + 1;
    } else if (index < MAX_ITEMS && kind == ITEM_KIND_DEVICE) {
      HomeItem *items = s_devices;
      uint16_t *count = &s_device_count;
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
      if (s_pin_menu) menu_layer_reload_data(s_pin_menu);
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
    } else if (done_kind == ITEM_KIND_THEME) {
      s_theme_loading = false;
      if (s_theme_menu) menu_layer_reload_data(s_theme_menu);
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
    .get_cell_height = theme_cell_height,
    .draw_row = root_draw_row,
    .select_click = root_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_root_menu);
  window_set_click_config_provider_with_context(
    window, root_shortcut_click_config_provider, s_root_menu);
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
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = list_draw_header,
    .draw_row = list_draw_row,
    .select_click = list_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_list_menu);
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
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = device_draw_header,
    .draw_row = device_draw_row,
    .select_click = device_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_device_menu);
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
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = sensor_draw_header,
    .draw_row = sensor_draw_row,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_sensor_menu);
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
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = room_scene_draw_header,
    .draw_row = room_scene_draw_row,
    .select_click = room_scene_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_room_scene_menu);
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
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = action_draw_header,
    .draw_row = action_draw_row,
    .select_click = action_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_action_menu);
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
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = preset_draw_header,
    .draw_row = preset_draw_row,
    .select_click = preset_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_preset_menu);
  menu_layer_set_click_config_onto_window(s_preset_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_preset_menu));
}

static void preset_window_unload(Window *window) {
  menu_layer_destroy(s_preset_menu);
  s_preset_menu = NULL;
}

static void theme_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_theme_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_theme_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = theme_get_num_rows,
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = theme_draw_header,
    .draw_row = theme_draw_row,
    .select_click = theme_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_theme_menu);
  menu_layer_set_click_config_onto_window(s_theme_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_theme_menu));
}

static void theme_window_unload(Window *window) {
  menu_layer_destroy(s_theme_menu);
  s_theme_menu = NULL;
}

static void settings_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_settings_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_settings_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = settings_get_num_rows,
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = settings_draw_header,
    .draw_row = settings_draw_row,
    .select_click = settings_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_settings_menu);
  menu_layer_set_click_config_onto_window(s_settings_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_settings_menu));
}

static void settings_window_unload(Window *window) {
  menu_layer_destroy(s_settings_menu);
  s_settings_menu = NULL;
}

static void pin_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_pin_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_pin_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = pin_get_num_rows,
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = pin_draw_header,
    .draw_row = pin_draw_row,
    .select_click = pin_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_pin_menu);
  menu_layer_set_click_config_onto_window(s_pin_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_pin_menu));
}

static void pin_window_unload(Window *window) {
  menu_layer_destroy(s_pin_menu);
  s_pin_menu = NULL;
}

static void shortcut_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_shortcut_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_shortcut_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = shortcut_get_num_rows,
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = shortcut_draw_header,
    .draw_row = shortcut_draw_row,
    .select_click = shortcut_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_shortcut_menu);
  menu_layer_set_click_config_onto_window(s_shortcut_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_shortcut_menu));
}

static void shortcut_window_unload(Window *window) {
  menu_layer_destroy(s_shortcut_menu);
  s_shortcut_menu = NULL;
}

static void shortcut_target_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  s_shortcut_target_menu = menu_layer_create(layer_get_bounds(root));
  menu_layer_set_callbacks(s_shortcut_target_menu, NULL, (MenuLayerCallbacks) {
    .get_num_rows = shortcut_target_get_num_rows,
    .get_cell_height = theme_cell_height,
    .get_header_height = list_get_header_height,
    .draw_header = shortcut_target_draw_header,
    .draw_row = shortcut_target_draw_row,
    .select_click = shortcut_target_select_click,
    .selection_changed = marquee_selection_changed,
  });
  apply_theme_to_menu(s_shortcut_target_menu);
  menu_layer_set_click_config_onto_window(s_shortcut_target_menu, window);
  layer_add_child(root, menu_layer_get_layer(s_shortcut_target_menu));
}

static void shortcut_target_window_unload(Window *window) {
  menu_layer_destroy(s_shortcut_target_menu);
  s_shortcut_target_menu = NULL;
}

static void confirm_window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);
  const int16_t margin = PBL_IF_ROUND_ELSE(18, 8);
  window_set_background_color(window, s_theme_background);

  s_confirm_title = text_layer_create(GRect(margin, 18, bounds.size.w - margin * 2, 100));
  text_layer_set_text(s_confirm_title, s_confirm_text);
  text_layer_set_background_color(s_confirm_title, GColorClear);
  text_layer_set_text_color(s_confirm_title, s_theme_text);
  text_layer_set_font(s_confirm_title, theme_title_font());
  text_layer_set_text_alignment(s_confirm_title, GTextAlignmentCenter);
  text_layer_set_overflow_mode(s_confirm_title, GTextOverflowModeTrailingEllipsis);
  layer_add_child(root, text_layer_get_layer(s_confirm_title));

  s_confirm_hint = text_layer_create(GRect(margin, bounds.size.h - 56,
                                            bounds.size.w - margin * 2, 42));
  text_layer_set_text(s_confirm_hint,
    s_confirm_mode == CONFIRM_VOICE_RESULT ? "SELECT to speak again\nBACK to close" :
    s_confirm_mode == CONFIRM_INFO ? "BACK to close" :
                                    "SELECT to confirm\nBACK to cancel");
  text_layer_set_font(s_confirm_hint, fonts_get_system_font(FONT_KEY_GOTHIC_18));
  text_layer_set_background_color(s_confirm_hint, GColorClear);
  text_layer_set_text_color(s_confirm_hint, s_theme_text);
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
  load_pins();

  s_root_window = window_create();
  s_list_window = window_create();
  s_device_window = window_create();
  s_sensor_window = window_create();
  s_room_scene_window = window_create();
  s_action_window = window_create();
  s_preset_window = window_create();
  s_theme_window = window_create();
  s_settings_window = window_create();
  s_pin_window = window_create();
  s_shortcut_window = window_create();
  s_shortcut_target_window = window_create();
  s_confirm_window = window_create();

  window_set_window_handlers(s_root_window, (WindowHandlers) {
    .load = root_window_load,
    .appear = menu_window_appear,
    .unload = root_window_unload,
  });
  window_set_window_handlers(s_list_window, (WindowHandlers) {
    .load = list_window_load,
    .appear = menu_window_appear,
    .unload = list_window_unload,
  });
  window_set_window_handlers(s_device_window, (WindowHandlers) {
    .load = device_window_load,
    .appear = menu_window_appear,
    .unload = device_window_unload,
  });
  window_set_window_handlers(s_sensor_window, (WindowHandlers) {
    .load = sensor_window_load,
    .appear = menu_window_appear,
    .unload = sensor_window_unload,
  });
  window_set_window_handlers(s_room_scene_window, (WindowHandlers) {
    .load = room_scene_window_load,
    .appear = menu_window_appear,
    .unload = room_scene_window_unload,
  });
  window_set_window_handlers(s_action_window, (WindowHandlers) {
    .load = action_window_load,
    .appear = menu_window_appear,
    .unload = action_window_unload,
  });
  window_set_window_handlers(s_preset_window, (WindowHandlers) {
    .load = preset_window_load,
    .appear = menu_window_appear,
    .unload = preset_window_unload,
  });
  window_set_window_handlers(s_theme_window, (WindowHandlers) {
    .load = theme_window_load,
    .appear = menu_window_appear,
    .unload = theme_window_unload,
  });
  window_set_window_handlers(s_settings_window, (WindowHandlers) {
    .load = settings_window_load,
    .appear = menu_window_appear,
    .unload = settings_window_unload,
  });
  window_set_window_handlers(s_pin_window, (WindowHandlers) {
    .load = pin_window_load,
    .appear = menu_window_appear,
    .unload = pin_window_unload,
  });
  window_set_window_handlers(s_shortcut_window, (WindowHandlers) {
    .load = shortcut_window_load,
    .appear = menu_window_appear,
    .unload = shortcut_window_unload,
  });
  window_set_window_handlers(s_shortcut_target_window, (WindowHandlers) {
    .load = shortcut_target_window_load,
    .appear = menu_window_appear,
    .unload = shortcut_target_window_unload,
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
  if (s_marquee_timer) {
    app_timer_cancel(s_marquee_timer);
    s_marquee_timer = NULL;
  }
  if (s_dictation_session) dictation_session_destroy(s_dictation_session);
  window_destroy(s_confirm_window);
  window_destroy(s_shortcut_target_window);
  window_destroy(s_shortcut_window);
  window_destroy(s_settings_window);
  window_destroy(s_pin_window);
  window_destroy(s_theme_window);
  window_destroy(s_preset_window);
  window_destroy(s_action_window);
  window_destroy(s_sensor_window);
  window_destroy(s_room_scene_window);
  window_destroy(s_device_window);
  window_destroy(s_list_window);
  window_destroy(s_root_window);
#if defined(PBL_PLATFORM_EMERY)
  unload_custom_theme_font();
#endif
  gbitmap_destroy(s_device_icon);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
