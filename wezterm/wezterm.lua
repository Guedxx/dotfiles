-- WezTerm config
-- Docs: https://wezterm.org/config/files.html

local wezterm = require 'wezterm'
local act = wezterm.action

local config = wezterm.config_builder()
local dotfiles_dir = (os.getenv 'HOME') .. '/dotfiles/wezterm'
local wallpapers = {
  { image = dotfiles_dir .. '/berserk.jpg', color_scheme = 'Ayu Dark (Gogh)' },
  { image = dotfiles_dir .. '/goku.jpg', color_scheme = 'Catppuccin Mocha' },
}
local background_image = wallpapers[1].image
local background_color_scheme = wallpapers[1].color_scheme

-- Platform / rendering
config.enable_wayland = true
config.front_end = 'OpenGL'
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
config.color_scheme = background_color_scheme
config.window_background_image = background_image
config.window_background_image_hsb = {
  brightness = 0.20,
  saturation = 1.0,
}
config.window_background_opacity = 0.80
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

-- Tabs
config.enable_tab_bar = true
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
  -- SUPER+\ and SUPER+/ split the current pane side-by-side.
  { key = '\\', mods = 'SUPER', action = act.SplitHorizontal { domain = 'CurrentPaneDomain' } },
  { key = '/', mods = 'SUPER', action = act.SplitHorizontal { domain = 'CurrentPaneDomain' } },

  -- SUPER+% splits the current pane vertically.
  { key = '%', mods = 'SUPER|SHIFT', action = act.SplitVertical { domain = 'CurrentPaneDomain' } },

  -- SUPER+C then G cycles through wallpapers.
  { key = 'c', mods = 'SUPER', action = act.ActivateKeyTable { name = 'wallpaper', one_shot = true, timeout_milliseconds = 1500 } },

  -- SUPER+N opens a new tab.
  { key = 'n', mods = 'SUPER', action = act.SpawnTab 'CurrentPaneDomain' },
  { key = 'N', mods = 'SUPER|SHIFT', action = act.SpawnTab 'CurrentPaneDomain' },

  -- Move between tabs.
  { key = '{', mods = 'SUPER|SHIFT', action = act.ActivateTabRelative(-1) },
  { key = '}', mods = 'SUPER|SHIFT', action = act.ActivateTabRelative(1) },

  -- Move focus between panes.
  { key = '[', mods = 'SUPER', action = act.ActivatePaneDirection 'Left' },
  { key = ']', mods = 'SUPER', action = act.ActivatePaneDirection 'Right' },

  -- Kill the current pane.
  { key = 'k', mods = 'SUPER', action = act.CloseCurrentPane { confirm = false } },
}

config.key_tables = {
  wallpaper = {
    { key = 'g', mods = 'NONE', action = act.EmitEvent 'cycle-wallpaper' },
    { key = 'g', mods = 'SUPER', action = act.EmitEvent 'cycle-wallpaper' },
  },
}

wezterm.on('cycle-wallpaper', function(window)
  local overrides = window:get_config_overrides() or {}
  local current_wallpaper = overrides.window_background_image or background_image
  local next_index = 1

  for index, wallpaper in ipairs(wallpapers) do
    if wallpaper.image == current_wallpaper then
      next_index = (index % #wallpapers) + 1
      break
    end
  end

  local next_wallpaper = wallpapers[next_index]
  overrides.window_background_image = next_wallpaper.image
  overrides.color_scheme = next_wallpaper.color_scheme
  window:set_config_overrides(overrides)
  window:toast_notification('WezTerm', 'Wallpaper: ' .. next_wallpaper.image:match '[^/]+$', nil, 2000)
end)

return config
