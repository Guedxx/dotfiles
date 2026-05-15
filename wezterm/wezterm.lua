-- WezTerm config
-- Docs: https://wezterm.org/config/files.html

local wezterm = require 'wezterm'
local act = wezterm.action

local config = wezterm.config_builder()

-- Platform / rendering
config.enable_wayland = true
config.front_end = 'WebGpu'
config.webgpu_power_preference = 'HighPerformance'
config.max_fps = 120
config.animation_fps = 60

-- Font
config.font = wezterm.font_with_fallback {
  { family = 'JetBrains Mono', weight = 'Regular' },
  'Noto Color Emoji',
}
config.font_size = 11.5
config.line_height = 1.05
config.harfbuzz_features = { 'calt=1', 'clig=1', 'liga=1' }

-- Window / appearance
config.color_scheme = 'Ayu Dark (Gogh)'
config.window_background_opacity = 0.96
config.text_background_opacity = 1.0
config.window_padding = {
  left = 10,
  right = 10,
  top = 8,
  bottom = 8,
}
config.initial_cols = 120
config.initial_rows = 34
config.adjust_window_size_when_changing_font_size = false
config.hide_mouse_cursor_when_typing = true
config.window_close_confirmation = 'NeverPrompt'
config.window_decorations = 'TITLE|RESIZE'

-- Tabs
config.enable_tab_bar = true
config.hide_tab_bar_if_only_one_tab = true
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = false
config.tab_max_width = 32
config.show_new_tab_button_in_tab_bar = false

-- Cursor / scrollback
config.default_cursor_style = 'BlinkingBlock'
config.cursor_blink_rate = 600
config.scrollback_lines = 10000

-- Custom keys.
config.keys = {
  -- SUPER+\ splits the current pane side-by-side.
  { key = '\\', mods = 'SUPER', action = act.SplitHorizontal { domain = 'CurrentPaneDomain' } },

  -- Move focus between panes.
  { key = '[', mods = 'SUPER', action = act.ActivatePaneDirection 'Left' },
  { key = ']', mods = 'SUPER', action = act.ActivatePaneDirection 'Right' },

  -- Kill the current pane.
  { key = 'k', mods = 'SUPER', action = act.CloseCurrentPane { confirm = false } },
}

return config
