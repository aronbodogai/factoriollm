-- Mod entry point. The implementation lives in factoriollm.lua so the same
-- file can be shipped as a softmod inside a save later (see
-- scripts/make-scenario.py), the same split factorio-broadcast uses.
local factoriollm = require("factoriollm")

factoriollm.setup({})

-- Event registration lives here, never in factoriollm.lua: as a mod,
-- script.on_event is per-mod and cannot clobber anything; as a softmod
-- sharing one scenario control.lua with factorio-broadcast, it would. A
-- softmod build therefore forwards these calls from the scenario's own single
-- handler instead of copying these registrations.
script.on_event(defines.events.on_gui_click, factoriollm.on_gui_click)
script.on_event(defines.events.on_gui_selection_state_changed, factoriollm.on_gui_selection_state_changed)
script.on_event(defines.events.on_player_created, factoriollm.on_player_created)
script.on_event(defines.events.on_player_joined_game, factoriollm.on_player_joined_game)
