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

local function get_surface(name)
  local surface = game.surfaces[name or "nauvis"]
  if not surface then
    error("surface not found: " .. tostring(name))
  end
  return surface
end

local function apply_infinity_filter(entity, filter)
  if not filter then return end
  entity.set_infinity_container_filter(1, {
    name = filter.name,
    count = filter.count,
    mode = filter.mode,
  })
end

-- Each op is {op, localId, entity: {name, position, direction?, infinityFilter?, recipe?}}.
-- localId is a factoriollm concept, not a Factorio one, so update/destroy re-find their
-- entity by exact name+position rather than by any id Factorio itself tracks.

local function do_create(surface, entity_spec)
  local created = surface.create_entity({
    name = entity_spec.name,
    position = entity_spec.position,
    direction = entity_spec.direction or 0,
    force = "player",
  })
  if not created then
    error(string.format(
      "create_entity returned nil for %s at (%s,%s)",
      entity_spec.name, entity_spec.position.x, entity_spec.position.y
    ))
  end
  apply_infinity_filter(created, entity_spec.infinityFilter)
  if entity_spec.recipe then
    created.set_recipe(entity_spec.recipe)
  end
end

local function do_update(surface, entity_spec)
  local existing = surface.find_entity(entity_spec.name, entity_spec.position)
  if not existing then
    error(string.format(
      "update: entity not found: %s at (%s,%s)",
      entity_spec.name, entity_spec.position.x, entity_spec.position.y
    ))
  end
  apply_infinity_filter(existing, entity_spec.infinityFilter)
  if entity_spec.recipe then
    existing.set_recipe(entity_spec.recipe)
  end
end

local function do_destroy(surface, entity_spec)
  local existing = surface.find_entity(entity_spec.name, entity_spec.position)
  if existing then
    existing.destroy()
  end
  -- Already gone is not an error: destroy is idempotent by design.
end

local HANDLERS = {
  create = do_create,
  update = do_update,
  destroy = do_destroy,
}

function M.setup(_config)
  storage.factoriollm = storage.factoriollm or {}

  remote.add_interface("factoriollm", {
    ping = function()
      return {
        version = VERSION,
        tick = game.tick,
      }
    end,

    -- `plan` arrives as an already-decoded Lua table: there is no
    -- helpers.read_file in this API (Lua can write to script-output but not
    -- read arbitrary files back), so the CLI passes the plan JSON as a Lua
    -- string literal and decodes it with helpers.json_to_table before this
    -- function ever runs — see packages/cli/src/deploy/trigger.ts. Returns
    -- one {localId, ok, error?} per op, in the same order plan.ops was
    -- given, so the caller can zip results back onto its own op list by index.
    apply = function(plan)
      local ok_surface, surface = pcall(get_surface, plan.surface)
      if not ok_surface then
        return { { localId = "*", ok = false, error = tostring(surface) } }
      end

      local results = {}
      for _, entry in ipairs(plan.ops or {}) do
        local handler = HANDLERS[entry.op]
        local ok, err = pcall(function()
          if not handler then
            error("unknown op: " .. tostring(entry.op))
          end
          handler(surface, entry.entity)
        end)
        -- Not `error = ok and nil or tostring(err)`: that idiom breaks here
        -- because `ok and nil` is always nil (falsy), so the `or` always
        -- falls through to tostring(err) even when ok is true.
        local result = { localId = entry.localId, ok = ok }
        if not ok then
          result.error = tostring(err)
        end
        table.insert(results, result)
      end
      return results
    end,
  })
end

return M
