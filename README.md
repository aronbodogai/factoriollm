# factoriollm

An LLM-authorable, declarative format for building Factorio factories,
deployed to a headless server the way Terraform deploys infrastructure:
write a spec, `plan` shows the diff, `apply` pushes it, state is tracked so
re-applying is idempotent and `destroy` tears it down. No player, no
inventory, no character — entities are created directly via the Lua API.

Status: **60 automation-science-pack/min, self-sustained, on a fresh
vanilla no-biters map** — `examples/vanilla-60spm-*.spec.yaml`. 80 solar
panels power 6 real ore→plate electric-furnace smelters and, separately, 1
gear + 4 science assembling-machine-3 (fed by dedicated infinity-chest
stubs — a real Factorio production-bus problem, not a factoriollm one, kept
the two halves from being wired end to end; see the spec files' own
comments). Confirmed via the tool's own `apply --smoke-check`:
`automation-science-pack producing at 60/min` — exact, not just nonzero,
sustained with zero manual intervention once an infinity-chest "void" sink
(`mode: at-most, count: 0`) was added to every assembler's output.

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
packages/cli/        the `factoriollm` binary: ping / validate / plan / apply / destroy / surfaces
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
