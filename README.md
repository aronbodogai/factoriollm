# factoriollm

An LLM-authorable, declarative format for building Factorio factories,
deployed to a headless server the way Terraform deploys infrastructure:
write a spec, `plan` shows the diff, `apply` pushes it, state is tracked so
re-applying is idempotent and `destroy` tears it down. No player, no
inventory, no character — entities are created directly via the Lua API.

Status: **60 automation-science-pack/min, self-sustained and fully
ore-to-pack, on a fresh vanilla no-biters map** — `examples/science-line-*.spec.yaml`
(plus follow-up capacity/reroute/power files added during debugging, see
below). 4 independent lines were built, each with its own `real_drills` on
a real iron-ore patch → electric-furnace → assembling-machine-3 making
iron-gear-wheel, and its own `real_drills` on a real copper-ore patch →
electric-furnace, both feeding a final assembling-machine-3 making
automation-science-pack from real iron-gear-wheel + real copper-plate, with
output flowing into that line's own void sink. **Zero infinity-chest input
spawners anywhere on the map** — verified live, repeatedly, across many
rounds of fixes: exactly 4 infinity-chests exist, all `mode: at-most, count:
0` void sinks, one per science line's output, nothing in `at-least` mode.

Verified via RCON production statistics
(`force.get_item_production_statistics():get_flow_count{...}`, both
`one_minute` and `ten_minutes` precision, polled repeatedly over roughly 15
minutes of real time after the last fix landed): the combined rate climbed
from an earlier 30/min plateau through 45 → 57 → 58 and, after one final
fix (below), **converged and held at a genuinely sustained 60/min across 4
consecutive samples spaced minutes apart** — `1min=60/10min=59.0`,
`1min=60/10min=59.9`, `1min=60/10min=60.0` — both windows agreeing exactly,
not declining, not a momentary spike. All 4 science assemblers hold
`working` status continuously; the gear assemblers still occasionally show
brief `item_ingredient_shortage`/`full_output` blips but the sustained
combined throughput is genuinely ≥60/min regardless.

The last gap (57-58/min, just short of target) turned out to be a real
power-capacity shortfall, not a wiring problem: nearly the entire factory
(gear1-4, science2-4 — 7 of 8 assemblers) turned out to share ONE electric
network (confirmed live via each pole's `.electric_network_id`, all on
network "5"; only line 1's science assembler sits on a separate network),
and with all 4 lines finally running simultaneously, combined demand was
intermittently exceeding that network's solar supply even with `daytime`
frozen at 0 (full daylight) — multiple assemblers across different lines
went `low_power` at the same moment, the tell for a genuine generation
shortfall rather than a belt/wiring bug (there are no accumulators in this
build, so any momentary demand spike above capacity shows up immediately as
`low_power`). Fix: `examples/power-boost-net5.spec.yaml` adds 3 more
`solar_row(5)` blocks (15 more panels, 109 total) stacked next to the
existing line-4 solar farm, confirmed to auto-join network 5 via wire reach.
`low_power` statuses disappeared immediately after applying it and the rate
converged to 60/min within a few minutes. The server's `daytime` is frozen
at 0 — this had to be re-frozen at least once mid-session after it silently
drifted back to a cycling value, which is worth checking first if the rate
ever unexpectedly drops (look for `low_power` across multiple assemblers at
once as the tell, then check `game.surfaces[1].daytime`/`.freeze_daytime`
before assuming it's a supply/belt problem).

**This took many iterative fix rounds to get this close, and it's worth
recording what was actually broken along the way rather than only the final
number:**
- A reproduced compiler/mod bug: **programmatic underground-belt placement
  compiles and applies cleanly but the two ends don't reliably pair up
  in-game**, and separately an underground-belt's `.belt_to_ground_type`
  was observed misreporting `"input"` even on an entity created/recorded as
  `"output"`. The proven, repeatedly-successful workaround used throughout
  this build is `examples/long-inserter-hop-west.function.yaml` — a single
  long-handed-inserter hopping 2 tiles to skip exactly one foreign/broken
  tile without needing underground-belt pairing at all. Not yet root-caused
  in `packages/compiler` — worth fixing properly if this project keeps
  using underground-belts for anything beyond a last resort.
- **Cross-line belt-tile collisions**: this project builds each line as
  several small, separately-applied spec files with belts placed at
  absolute tile coordinates, and there is no cross-spec collision check.
  Twice during this build, two *different* lines' specs independently
  routed a belt through the exact same physical tile without either author
  knowing; Factorio silently let one line's belt "win" the tile and the
  other line's items got diverted/contaminated, starving that line even
  though its own drill/furnace looked completely healthy in isolation. Both
  occurrences were fixed the same way: locate the exact foreign belt/tile
  via live `find_entities_filtered` + `get_transport_line` item-content
  inspection (checking item *names*, not just counts, is what actually
  reveals contamination), then reroute around the collision point with an
  underground-crossing hop or a `long-handed-inserter` hop.
- A separate, reproducible **"stuck inserter despite a valid source"**
  anomaly: an inserter's live `pickup_position` correctly matched a belt
  tile holding real items (confirmed via `get_transport_line`), yet the
  inserter's `.status` stayed `waiting_for_source_items` with an empty
  `held_stack` indefinitely. Fix: destroy and recreate that exact inserter
  entity (same position/direction) — this reliably resolved it, suggesting
  a stale pickup-target cache from the entity being created before its
  neighboring belt existed in final form (plausible whenever an earlier
  destroy/recreate cycle touched the belt but not the inserter, or vice
  versa).
- **`plan`/`apply` never diffs against live game state**, only against
  `state.json` — a crashed session, a manual RCON edit, or any out-of-band
  change silently desyncs the two. Several of this session's fixes
  (especially under time pressure mid-debugging) were applied as raw RCON
  entity create/destroy calls rather than through a tracked spec+state
  file, which means `examples/*.state.json` is now known to be out of sync
  with the live map in places. This is flagged as real follow-up work:
  retrofitting those raw fixes into proper spec files (so `plan` reports
  them correctly and a future `apply` doesn't fight the live map) was
  explicitly deprioritized behind reaching a working production number and
  was only partially done — don't trust `plan`'s diff output for these
  areas without re-verifying live first.
- A sharp-edged footgun worth calling out explicitly: **`plan`/`apply`
  without an explicit `--state` flag silently falls back to a single shared
  default state file (`examples/factoriollm.state.json`)** rather than a
  per-spec one. Always pass `--state` explicitly per spec file — this
  project's convention of one spec file per line/segment only actually
  gives you independent, non-interfering tracking if each one also gets its
  own `--state` file.
- Also confirmed (not a bug, but a real resource-drift issue): a
  `real_drills` bounding box sized to exactly one drill can genuinely run
  out of *reachable* ore over time even when the wider patch still has
  plenty — `no_minable_resources` on a live drill means relocate the
  bounding box to fresh ground within the same patch, verified via actual
  ore-tile counts, not just visual/comment assumptions.

**60/min across all 4 lines was the design target and is now the confirmed,
sustained, live-verified number** (converged 1-minute/10-minute flow-rate
windows across multiple samples minutes apart, all 4 lines contributing,
zero infinity-chest spawners). The paragraph below describes an earlier,
now-superseded result kept for context.

Earlier historical result, now superseded by the above (kept for context):
80 solar panels powered 6 real ore→plate electric-furnace smelters and,
separately, 1 gear + 4 science assembling-machine-3 (fed by dedicated
infinity-chest stubs — a real Factorio production-bus problem, not a
factoriollm one, kept the two halves from being wired end to end; see
`examples/vanilla-60spm-*.spec.yaml`'s own comments). Confirmed via the
tool's own `apply --smoke-check`: `automation-science-pack producing at
60/min` — but that run's *inputs* (copper-plate, iron-gear-wheel) came from
infinity-chest spawner stubs, not real mining, which is exactly the gap the
new `science-line-*` specs above close (partially, pending the
underground-belt fix).

On top of that: all 5 planned phases (0-4) — RCON round trip, resource-backed
instances (`infinity_chest` stub and real `real_drills` greedy placement),
parameterized reusable functions (`params`/`repeat`/ports), the connect.ts
port-router, and `apply --smoke-check` itself — all verified live, not just
type-checked. Wire connections and rotated instances (only `direction:
north` works today) are the two things `docs/FORMAT.md` describes that
aren't implemented yet.

Real bugs this project's live-testing discipline caught that a type checker
never would have (see commit history for the fix and the false assumption
behind each): a nonexistent `helpers.read_file` the whole plan-delivery
design first assumed existed; a blind RCON double-send that silently
double-executed every side-effecting command; missing footprint-aware
center-offset math causing duplicate-looking entities; unresolved
`"${expr}"` templates in port offsets; `set_recipe` failing on furnaces
(only assembling-machines support it — furnaces infer their recipe from
input); an inserter's `direction` meaning pickup-side, not drop-side; and
the stats API nesting production by time window, not flat, contradicting
the README's own simplified example.

## Quick start (against the shared dev server)

Needs the same WSL2 headless dev server as the sibling
[factorio-broadcast](https://github.com/aronbodogai/factorio-broadcast)
project — factoriollm doesn't stand up its own; see `scripts/dev.sh`. The
CLI itself needs to run under WSL's node too (not Windows'): its runtime
deps are plain JS, but it talks to a server that only exists inside WSL.

```bash
export FACTORIO_BROADCAST_DIR=/mnt/c/Users/<you>/factorio-broadcast
./scripts/dev.sh mod      # switch the shared dev instance to mod mode (loads factoriollm alongside factorio-broadcast)
./scripts/dev.sh start    # forwarded to the sibling's dev.sh
./scripts/dev.sh ping     # factoriollm: RCON round trip to the companion mod

node packages/cli/dist/index.js plan examples/mining-patch-infinity-stub.spec.yaml --password devpass
node packages/cli/dist/index.js apply examples/mining-patch-infinity-stub.spec.yaml --password devpass --auto-approve
node packages/cli/dist/index.js destroy examples/mining-patch-infinity-stub.spec.yaml --password devpass --auto-approve
```

Build first with `npm run build` (compiles `packages/compiler` then
`packages/cli` with `tsc` — plain JS output, no native binaries, so it runs
fine under WSL's node even though `npm install` has to happen on the Windows
side; this WSL2 instance has no outbound network).

## Layout

```
packages/compiler/   parse -> layout -> ir -> state (diff) -> planBuilder
packages/cli/        the `factoriollm` binary: ping / validate / plan / apply / destroy / surfaces / speed
mod/                 companion Lua mod: applies a plan via the Factorio API
scripts/dev.sh        wraps factorio-broadcast's dev.sh for server lifecycle
docs/FORMAT.md        the target YAML format and compiler pipeline
```

## Managed surfaces

Factorio's production statistics are per-surface, which is what makes the
`apply --smoke-check` measurement meaningful: on a busy base there is no way
to tell your new instance's output from everything else already producing the
same item. Giving each spec its own surface removes the ambiguity entirely.

Set `server.surface` in the spec to anything starting with `fllm-` and the
companion mod creates it on first apply — a lab-tile void surface with no ore,
water, cliffs or trees, daytime frozen, modelled on
[Blueprint Sandboxes](https://github.com/cameronleger/blueprint-sandboxes)'
lab surfaces (MIT). A blank deterministic canvas means `can_place_entity`
only ever rejects a placement the plan itself got wrong, never terrain the map
generator happened to roll. Chunks are generated on demand for exactly the
positions a plan's create ops touch.

The `fllm-` prefix is the safety gate, not a convention: any other surface
name (`nauvis`, a Space Age planet, another mod's) is looked up but never
created and never deleted.

```bash
node packages/cli/dist/index.js surfaces --password devpass
node packages/cli/dist/index.js destroy my.spec.yaml --password devpass --auto-approve --delete-surface
```

`--delete-surface` tears the whole surface down in one call instead of one
destroy op per entity: cheaper, and it also removes entities the state file
never knew about, which per-entity destroy by construction cannot.

In game, the `fllm` button in the top bar opens a dropdown of managed
surfaces and switches to the selected one in **remote view** — your character
stays where it is, so looking at a deploy target never moves or endangers it.

Note that surfaces do **not** isolate everything: electric networks never
cross surfaces, so each one needs its own power, and a void surface has no ore
patches, so inputs come from infinity chests (the same pattern
`examples/science-assembler.function.yaml` already uses for void sinks).
Full isolation of research and logistics would need a separate *force* as
well, which Blueprint Sandboxes does — not done here yet, because it first
needs checking whether factorio-broadcast's sidecar reports non-player forces.

## Game speed

Waiting for a build to prove itself is mostly waiting for game time to pass:
a furnace has to heat up, inserters have to swing, the first craft has to
finish, and the stats window `--smoke-check` reads is measured in game
seconds. `game.speed` is a multiplier on how much of that happens per real
second (1 = the normal 60 updates per second), and the companion mod exposes
it so an agent can fast-forward on demand instead of sitting through the
warm-up at 1x.

```bash
node packages/cli/dist/index.js speed --password devpass          # show
node packages/cli/dist/index.js speed 10 --password devpass       # 10x
node packages/cli/dist/index.js speed reset --password devpass    # back to 1
```

The useful form is `--smoke-speed` on `apply --smoke-check`: it raises the
speed just for the production wait and puts back whatever it found
afterwards, on success, failure or a thrown error alike:

```bash
node packages/cli/dist/index.js apply my.spec.yaml --password devpass --auto-approve \
  --smoke-check --smoke-item iron-plate --smoke-speed 10
```

Two things worth knowing:

- Production rates stay per game-minute, so `producing at 60/min` reads the
  same at any speed. Only the wall clock changes: `--smoke-timeout` is real
  milliseconds, and at 10x the same timeout covers ten times as much game
  time.
- `game.speed` is server-global. There is no per-surface speed, so this
  fast-forwards every surface and every connected player at once. That is
  why it is an explicit flag and a visible `speed` command rather than
  something `apply` does silently. The mod refuses anything outside
  0.01–64; the server just runs as fast as its CPU allows anyway, so a
  huge number buys nothing over a large one.

## How a plan reaches the server

Factorio's Lua API can **write** to `script-output/` (`helpers.write_file`)
but cannot **read** arbitrary files back (`helpers.read_file` doesn't exist
— verified live, not assumed) — mods are write-only to the host filesystem
by design. So the plan JSON travels as the RCON command's own argument: the
CLI passes it as a Lua *string* literal (JSON and Lua table-literal syntax
aren't compatible), and the companion mod decodes it with
`helpers.json_to_table` before `factoriollm.apply` ever sees it — no file
round-trip needed for input. This has been tested up to 100,000 characters
in one command with no issue; the CLI refuses anything over 50,000 chars for
now rather than silently failing, since chunked delivery for larger plans
isn't implemented yet.

RCON replies aren't constrained the same way, so results come back directly
as `remote.call`'s return value.

**A correctness note worth keeping in mind if you're scripting RCON calls
directly**: don't assume a command needs sending twice. It doesn't on this
server — a single send executes correctly. Blindly sending every command
twice (a pattern borrowed from factorio-broadcast's `scripts/rcon.js`, whose
comment claims the first command in a session needs repeating) was verified
live to **double-execute** side-effecting Lua — one `create_entity` call
sent that way created two entities — while "take the last reply" silently
hid it for anything whose output doesn't change between runs, which is
exactly why Phase 0's `ping` test never caught it. `packages/cli/src/rcon/client.ts`
sends once and only resends if the reply is actually the "please repeat"
prompt.
