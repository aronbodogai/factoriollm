-- Implementation module for factoriollm's companion mod. This file is
-- required, at load scope, from mod/control.lua (and later, the same way,
-- from a softmod build) — never register on_init, on_load,
-- on_configuration_changed, or top-level entity events in here: a save's
-- scenario control.lua tolerates only one handler per event, so doing that
-- would silently clobber whatever else is loaded in the same save (e.g. the
-- sibling factorio-broadcast mod/softmod). Same discipline as
-- factorio-broadcast's mod/broadcast.lua.
--
-- remote.add_interface registrations do not persist across a save load the
-- way `storage` does, so M.setup must call remote.add_interface every time
-- it runs (once per load) rather than guarding it with a persisted flag.

local M = {}

local VERSION = "0.0.1"

function M.setup(_config)
  storage.factoriollm = storage.factoriollm or {}

  remote.add_interface("factoriollm", {
    ping = function()
      return {
        version = VERSION,
        tick = game.tick,
      }
    end,
  })
end

return M
