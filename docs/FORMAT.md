# factoriollm format

Two YAML file kinds: function definitions (`*.function.yaml`) and composition
specs (`*.spec.yaml`) that import functions and declare how they're placed
and wired. Not implemented yet (`packages/compiler`) — this documents the
target shape; see the phased delivery plan for when each part lands.

## Function definition

A fixed-footprint, reusable block of entities with named ports on its
perimeter.

```yaml
kind: function
name: smelting_column
params:
  furnace_count: { type: int, default: 6 }
  furnace_type: { type: string, default: "stone-furnace" }
  recipe: { type: string }
size: { width: 3, height: "${furnace_count * 2}" }
entities:
  - repeat: "${furnace_count}"
    name: "${furnace_type}"
    position: { x: 1, y: "${i * 2}" }
    direction: south
    recipe: "${recipe}"
  - repeat: "${furnace_count}"
    name: transport-belt
    position: { x: 0, y: "${i * 2}" }
    direction: south
ports:
  in:  { side: west, offset: {x: 0, y: 0}, direction: south, kind: belt, item: iron-ore }
  out: { side: east, offset: {x: 2, y: "${(furnace_count-1)*2}"}, direction: south, kind: belt, item: iron-plate }
```

Port fields: `side` (which bounding-box edge — validated against `offset` at
load time), `offset` (function-local tile coordinates), `direction` (the
belt/pipe flow direction *at that exact tile* — every port's direction is
"material moves this way here," so the connector router never has to flip
anything, only check colinearity), `kind` (`belt | pipe | wire`), and
`item`/`fluid`/`signal` depending on kind.

v1 restricts directions to 4-way N/E/S/W, since only straight/L-bend routing
is in scope (see below).

## Composition spec

Places function instances on a grid and wires named ports between them.

```yaml
kind: spec
server:
  rcon: { host: 127.0.0.1, port: 27015, password_env: FACTORIO_RCON_PASSWORD }
  script_output_dir: /home/aron/fb/instance/script-output
  surface: fllm-smelting   # optional, defaults to nauvis
imports:
  - examples/smelting-column.function.yaml
instances:
  - id: smelt1
    function: smelting_column
    position: { x: 10, y: 10 }
    params: { furnace_count: 6, recipe: iron-plate }
  - id: smelt2
    function: smelting_column
    position: { x: 20, y: 10 }
    params: { furnace_count: 6, recipe: copper-plate }
connections:
  - { from: smelt1.out, to: smelt2.in, kind: belt }
```

`server.surface` names the deploy target. A name starting with `fllm-` is
factoriollm-managed: the mod creates it on demand as an empty lab-tile
surface, and `destroy --delete-surface` may delete it wholesale. Because
production statistics are per-surface, one surface per spec is what makes
`apply --smoke-check` able to attribute output to this spec alone. Any other
name is used as-is and never created or deleted. See README.md.

A resource-backed instance has no hand-authored function — a synthesized
one is produced either by the drill placer or, for testing, an
infinity-chest/pipe stub:

```yaml
instances:
  - id: patch1
    resource: iron-ore
    patch_id: patch-07              # from `factoriollm scan-resources`
    resource_mode: infinity_chest   # swap to real_drills once the placer is trusted — same downstream ports either way
    position: { x: 40, y: 40 }
connections:
  - { from: patch1.out, to: smelt1.in, kind: belt }
```

## Auto-fill straight/L connector

Given two absolute, already-laid-out ports `A` and `B`:

1. **Straight** — valid iff `A.direction == B.direction` and that direction
   is axis-aligned with the vector from `A` to `B` (e.g. `east` requires
   `dy == 0 && dx > 0`), and every intermediate tile is unobstructed. Fills
   the gap with belt/pipe entities facing `A.direction`.
2. **L-bend** — valid iff `A.direction` and `B.direction` are perpendicular
   and the one compatible corner gives two unobstructed legs (each ≥ 1
   tile). Factorio auto-curves belts from neighbor direction, so no
   separate corner prototype is needed. Pipes use the same two-leg geometry
   with no directionality constraint on the pipe entities themselves.
3. **Wire** — no belt/pipe geometry at all: `distance(A, B) <= max_reach`,
   emitted as a direct `LuaWireConnector:connect_to` op, no intermediate
   entities.
4. **Anything else is a hard compile error**, collected across the whole
   spec (not fail-fast) — e.g.:

   ```
   UNROUTABLE_CONNECTION: port smelt1.out at (12,3) facing east cannot reach
   smelt2.in at (10,9) facing south with a straight-or-single-bend belt run —
   reposition one of the instances or add an intermediate connection.
   ```

   A full pathfinding autorouter is explicitly out of scope for v1.

## Compiler pipeline (target)

```
parse -> resolveFunctions (params/repeat/expr) -> layout (absolute coords + rotation, bbox-overlap check)
      -> connect (router above) -> ir (flatten to IREntity[], deterministic localId)
      -> state.diff (vs factoriollm.state.json) -> planBuilder (op list -> plan JSON + human diff)
```

Update policy for v1: only `recipe` and filter fields (`set_recipe`,
`set_filter`) update in place; any other change (position/direction/name) is
destroy+recreate.
