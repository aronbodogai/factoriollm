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

-- Surfaces whose name starts with this prefix are factoriollm-managed:
-- created on demand, safe to delete wholesale, and listed in the surface
-- picker GUI. Anything else (nauvis, a Space Age planet, another mod's
-- surface) is only ever looked up, never created and never deleted — the
-- prefix check is the entire safety gate, the same idea as Blueprint
-- Sandboxes' `Lab.IsLab()` name-prefix test.
local SURFACE_PREFIX = "fllm-"

local function is_managed_surface(name)
  return type(name) == "string" and name:sub(1, #SURFACE_PREFIX) == SURFACE_PREFIX
end

-- Lab-tile void surface, modelled on Blueprint Sandboxes' Lab.Create /
-- Lab.AfterCreate (MIT, cameronleger/blueprint-sandboxes). The point is a
-- blank deterministic canvas: no ore, no water, no cliffs, no trees, so
-- can_place_entity in do_create only ever fails for reasons the plan itself
-- caused (overlap, out of bounds) instead of for terrain the map generator
-- happened to roll.
--
-- The optional properties go through pcall because which of them exist
-- depends on the Factorio build (ignore_surface_conditions in particular is
-- 2.0/Space Age territory), and a missing one must not take the whole
-- surface creation down with it.
local function create_managed_surface(name)
  local surface = game.create_surface(name, {
    default_enable_all_autoplace_controls = false,
    autoplace_controls = {},
    autoplace_settings = {
      entity = { treat_missing_as_default = false, settings = {} },
      decorative = { treat_missing_as_default = false, settings = {} },
      tile = { treat_missing_as_default = false, settings = {} },
    },
    cliff_settings = { cliff_elevation_0 = 1024 },
    starting_area = 0,
    peaceful_mode = true,
  })

  -- Must be set before chunks generate, otherwise already-generated chunks
  -- keep whatever terrain the generator produced.
  surface.generate_with_lab_tiles = true
  surface.freeze_daytime = true
  surface.daytime = 0.95
  pcall(function() surface.show_clouds = false end)
  pcall(function() surface.ignore_surface_conditions = true end)

  return surface
end

local function get_surface(name)
  name = name or "nauvis"
  local surface = game.surfaces[name]
  if surface then
    return surface
  end
  if is_managed_surface(name) then
    return create_managed_surface(name)
  end
  error(string.format(
    "surface not found: %s (only %s* surfaces are created on demand)",
    tostring(name), SURFACE_PREFIX
  ))
end

-- A freshly created surface has no generated chunks, and create_entity does
-- not generate one for you. Blueprint Sandboxes hits the same problem in
-- Equipment.Place and solves it with request_to_generate_chunks +
-- force_generate_chunk_requests; do the same, but only for the chunks the
-- plan's create ops actually touch, so a surface never gets generated
-- wholesale.
local function ensure_chunks(surface, ops)
  local requested = false
  for _, entry in ipairs(ops or {}) do
    local position = entry.entity and entry.entity.position
    if entry.op == "create" and position then
      local chunk = { x = math.floor(position.x / 32), y = math.floor(position.y / 32) }
      if not surface.is_chunk_generated(chunk) then
        -- radius is in chunks; 1 covers the neighbours an entity straddling a
        -- chunk border needs.
        surface.request_to_generate_chunks(position, 1)
        requested = true
      end
    end
  end
  if requested then
    surface.force_generate_chunk_requests()
  end
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

-- create_entity does NOT validate placement the way a player or blueprint
-- would — verified live: it happily builds on water and lets two entities
-- overlap at the exact same position, both silently "succeeding". Only
-- can_place_entity actually performs that check, so it has to run first and
-- be treated as the real gate; create_entity's own nil-return case is now
-- just a defensive fallback for whatever can_place_entity doesn't catch.
local function do_create(surface, entity_spec)
  local params = {
    name = entity_spec.name,
    position = entity_spec.position,
    direction = entity_spec.direction or 0,
    force = "player",
  }

  if not surface.can_place_entity(params) then
    error(string.format(
      "cannot place %s at (%s,%s) — off water/land, out of bounds, or overlapping an existing entity",
      entity_spec.name, entity_spec.position.x, entity_spec.position.y
    ))
  end

  local created = surface.create_entity(params)
  if not created then
    error(string.format(
      "create_entity returned nil for %s at (%s,%s) despite can_place_entity saying yes",
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

-- ---------------------------------------------------------------------------
-- Surface picker GUI
--
-- One dropdown listing every fllm-* surface, plus remote view to look at the
-- selected one. Modelled on Blueprint Sandboxes' toggle-gui.lua (a "drop-down"
-- whose selected_index is stored per player) and controllers.lua (pre-sandbox
-- controller/position/surface stashed so exiting restores exactly where the
-- player was).
--
-- Remote view rather than a teleport on purpose: the player's character stays
-- put on its own surface, so looking at a deploy target never moves or
-- endangers them, and nothing about the viewed surface's production depends on
-- whether someone is watching it.
--
-- NOTE: these are plain functions on M, not script.on_event registrations —
-- see the file header. mod/control.lua does the registering, because a
-- softmod build shares its single scenario control.lua with factorio-broadcast
-- and must forward these rather than re-register them.

local BUTTON_NAME = "factoriollm-surfaces-button"
local PANEL_NAME = "factoriollm-surfaces-panel"
local DROPDOWN_NAME = "factoriollm-surfaces-dropdown"
local EXIT_NAME = "factoriollm-surfaces-exit"

local function player_data(player)
  storage.factoriollm = storage.factoriollm or {}
  storage.factoriollm.players = storage.factoriollm.players or {}
  storage.factoriollm.players[player.index] = storage.factoriollm.players[player.index] or {}
  return storage.factoriollm.players[player.index]
end

local function managed_surface_names()
  local names = {}
  for name in pairs(game.surfaces) do
    if is_managed_surface(name) then
      table.insert(names, name)
    end
  end
  table.sort(names)
  return names
end

function M.ensure_button(player)
  if not player.gui.top[BUTTON_NAME] then
    player.gui.top.add({
      type = "button",
      name = BUTTON_NAME,
      caption = "fllm",
      tooltip = "factoriollm: view a deploy surface",
    })
  end
end

-- Remembers where the player was exactly once per visit: re-entering while
-- already viewing must not overwrite the real pre-view state with another
-- surface's, or exiting would strand them on a deploy surface.
local function remember_position(player)
  local data = player_data(player)
  if data.pre then return end
  data.pre = {
    controller = player.controller_type,
    character = player.character,
    position = player.position,
    surface_name = player.surface.name,
  }
end

function M.enter_view(player, surface_name)
  local surface = game.surfaces[surface_name]
  if not surface then
    player.print("factoriollm: no such surface: " .. tostring(surface_name))
    return
  end
  remember_position(player)
  player.set_controller({
    type = defines.controllers.remote,
    surface = surface,
    position = { 0, 0 },
  })
end

function M.exit_view(player)
  local data = player_data(player)
  local pre = data.pre
  if not pre then return end
  data.pre = nil

  -- The surface the player came from can itself have been deleted while they
  -- were away (destroy --delete-surface), so fall back to nauvis rather than
  -- teleporting into nothing.
  local surface_name = pre.surface_name
  if not game.surfaces[surface_name] then
    surface_name = "nauvis"
  end

  if pre.controller == defines.controllers.character and pre.character and pre.character.valid then
    player.set_controller({ type = defines.controllers.character, character = pre.character })
    return
  end

  if pre.controller == defines.controllers.remote then
    player.set_controller({ type = defines.controllers.remote, surface = surface_name, position = pre.position })
    return
  end

  if pre.controller == defines.controllers.editor then
    player.set_controller({ type = defines.controllers.editor })
  else
    -- god, spectator, cutscene, or a character whose body no longer exists:
    -- god mode is the one controller that is always safe to hand back, since
    -- it needs no character entity and no editor permission.
    player.set_controller({ type = defines.controllers.god })
  end
  player.teleport(pre.position, surface_name)
end

function M.toggle_panel(player)
  local existing = player.gui.left[PANEL_NAME]
  if existing then
    existing.destroy()
    return
  end

  local frame = player.gui.left.add({
    type = "frame",
    name = PANEL_NAME,
    caption = "factoriollm surfaces",
    direction = "vertical",
  })

  local names = managed_surface_names()
  if #names == 0 then
    frame.add({ type = "label", caption = "no " .. SURFACE_PREFIX .. "* surfaces yet — deploy a spec first" })
  else
    -- selected_index is only meaningful against the list the dropdown was
    -- built from, so the names are stashed alongside it: surfaces can be
    -- created or deleted between building the GUI and clicking in it.
    player_data(player).surface_choices = names
    frame.add({ type = "drop-down", name = DROPDOWN_NAME, items = names })
  end

  frame.add({ type = "button", name = EXIT_NAME, caption = "back to my character" })
end

function M.on_gui_click(event)
  local element = event.element
  if not (element and element.valid) then return end
  local player = game.get_player(event.player_index)
  if not player then return end

  if element.name == BUTTON_NAME then
    M.toggle_panel(player)
  elseif element.name == EXIT_NAME then
    M.exit_view(player)
  end
end

function M.on_gui_selection_state_changed(event)
  local element = event.element
  if not (element and element.valid) or element.name ~= DROPDOWN_NAME then return end
  local player = game.get_player(event.player_index)
  if not player then return end

  local choices = player_data(player).surface_choices or {}
  local chosen = choices[element.selected_index]
  if chosen then
    M.enter_view(player, chosen)
  end
end

-- Button creation is event-driven, never done in M.setup: setup runs at load
-- scope (mod/control.lua requires this file and calls it immediately), where
-- `game` does not exist yet — touching it there fails the whole save load with
-- "attempt to index global 'game' (a nil value)". on_player_joined_game is
-- what covers players who predate the mod in an existing save; on_player_created
-- alone never fires for them.
function M.on_player_created(event)
  local player = game.get_player(event.player_index)
  if player then
    M.ensure_button(player)
  end
end

M.on_player_joined_game = M.on_player_created

-- ---------------------------------------------------------------------------

function M.setup(_config)
  storage.factoriollm = storage.factoriollm or {}
  storage.factoriollm.players = storage.factoriollm.players or {}

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

      ensure_chunks(surface, plan.ops)

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

    -- Lists the managed (fllm-*) surfaces, for the CLI and for the surface
    -- picker GUI. Deliberately does not list nauvis or other mods' surfaces:
    -- those are not ours to show as deploy targets.
    list_surfaces = function()
      local names = {}
      for name, surface in pairs(game.surfaces) do
        if is_managed_surface(name) then
          table.insert(names, { name = name, entityCount = surface.count_entities_filtered({}) })
        end
      end
      table.sort(names, function(a, b) return a.name < b.name end)
      return names
    end,

    -- Wholesale teardown of a managed surface. Far cheaper and far less
    -- drift-prone than issuing one destroy op per entity, but it is only ever
    -- allowed for fllm-* surfaces — deleting nauvis out from under a save
    -- would be unrecoverable, so the prefix check is a hard gate, not a hint.
    --
    -- Players standing on the surface are moved off first: delete_surface
    -- with someone still on it is how you get a player stuck in a nonexistent
    -- surface after the deletion completes.
    delete_surface = function(opts)
      opts = opts or {}
      local name = opts.surface
      if not is_managed_surface(name) then
        return { ok = false, error = string.format(
          "refusing to delete %s: only %s* surfaces are factoriollm-managed",
          tostring(name), SURFACE_PREFIX
        ) }
      end
      local surface = game.surfaces[name]
      if not surface then
        -- Already gone is not an error, same contract as the destroy op.
        return { ok = true, deleted = false }
      end
      for _, player in pairs(game.players) do
        if player.surface == surface then
          -- exit_view only helps players who got here through the picker; one
          -- who walked or teleported in has no remembered position, so fall
          -- back to dumping them on nauvis rather than letting delete_surface
          -- strand them on a surface that no longer exists.
          M.exit_view(player)
          if player.valid and player.surface == surface then
            player.teleport({ 0, 0 }, game.surfaces["nauvis"])
          end
        end
      end
      game.delete_surface(surface)
      return { ok = true, deleted = true }
    end,
  })
end

return M
