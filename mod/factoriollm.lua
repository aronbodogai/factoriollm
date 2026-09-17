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

-- Furnaces (type "furnace") pick their recipe automatically from whatever
-- raw material lands in their input, unlike assembling machines — calling
-- set_recipe on one errors ("Entity is not assembling-machine"). So
-- `recipe` in the format only takes effect for assembling-machine entities;
-- it's silently a no-op on a furnace, which needs nothing else from it.
local function apply_recipe(entity, recipe)
  if recipe and entity.type == "assembling-machine" then
    entity.set_recipe(recipe)
  end
end

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
  apply_recipe(created, entity_spec.recipe)
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
  apply_recipe(existing, entity_spec.recipe)
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

-- Flood-fills resource entities (one per tile, no first-class "patch" object
-- in the API) into clusters. Returns only small summaries — never per-tile
-- data — to keep the RCON reply small; scan an area, not the whole surface,
-- to keep the flood-fill itself bounded (it runs on the game thread).
local function cluster_resources(surface, area, resource_name)
  local filter = { type = "resource" }
  if area then filter.area = area end
  if resource_name then filter.name = resource_name end

  local entities = surface.find_entities_filtered(filter)

  local by_tile = {}
  for _, e in ipairs(entities) do
    local tx, ty = math.floor(e.position.x), math.floor(e.position.y)
    by_tile[tx] = by_tile[tx] or {}
    by_tile[tx][ty] = { name = e.name, amount = e.amount }
  end

  local NEIGHBORS = { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }
  local visited = {}
  local patches = {}
  local patch_index = 0

  for _, e in ipairs(entities) do
    local start_x, start_y = math.floor(e.position.x), math.floor(e.position.y)
    local start_key = start_x .. ":" .. start_y
    if not visited[start_key] then
      visited[start_key] = true
      local cluster_name = e.name
      local min_x, max_x, min_y, max_y = start_x, start_x, start_y, start_y
      local tile_count, total_amount = 0, 0
      local stack = { { start_x, start_y } }

      while #stack > 0 do
        local cur = table.remove(stack)
        local cx, cy = cur[1], cur[2]
        local cell = by_tile[cx] and by_tile[cx][cy]
        if cell and cell.name == cluster_name then
          tile_count = tile_count + 1
          total_amount = total_amount + cell.amount
          if cx < min_x then min_x = cx end
          if cx > max_x then max_x = cx end
          if cy < min_y then min_y = cy end
          if cy > max_y then max_y = cy end

          for _, d in ipairs(NEIGHBORS) do
            local nx, ny = cx + d[1], cy + d[2]
            local nkey = nx .. ":" .. ny
            if not visited[nkey] then
              local ncell = by_tile[nx] and by_tile[nx][ny]
              if ncell and ncell.name == cluster_name then
                visited[nkey] = true
                table.insert(stack, { nx, ny })
              end
            end
          end
        end
      end

      patch_index = patch_index + 1
      table.insert(patches, {
        patchId = "patch-" .. patch_index,
        resourceName = cluster_name,
        boundingBox = { left = min_x, top = min_y, right = max_x, bottom = max_y },
        tileCount = tile_count,
        totalAmount = total_amount,
      })
    end
  end

  return patches
end

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

    -- opts: {surface?, area?: {{left,top},{right,bottom}}, resource?}. area
    -- is required in practice (see cluster_resources) — the CLI always
    -- passes one from `factoriollm scan-resources`' --left/--top/--right/--bottom.
    scan_resources = function(opts)
      opts = opts or {}
      local ok, surface = pcall(get_surface, opts.surface)
      if not ok then
        return { error = tostring(surface) }
      end
      return cluster_resources(surface, opts.area, opts.resource)
    end,
  })
end

return M
