# factoriollm

An LLM-authorable, declarative format for building Factorio factories,
deployed to a headless server the way Terraform deploys infrastructure:
write a spec, `plan` shows the diff, `apply` pushes it, state is tracked so
re-applying is idempotent and `destroy` tears it down. No player, no
inventory, no character — entities are created directly via the Lua API.

Status: **Phase 2** — reusable parameterized functions (`params`, `repeat`,
ports) and the port-to-port connect.ts router (straight + single-bend belt
runs) work end to end, verified live: two `belt_segment` function instances
10 tiles apart, wired by an auto-generated connector, form one continuous
belt line — confirmed by actually moving an item across it, not just
checking entity positions. A deliberately misaligned connection fails
`validate` with `UNROUTABLE_CONNECTION` and never touches RCON. Wire
connections and real mining-drill placement (`docs/FORMAT.md`'s full format)
land in later phases.

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
packages/cli/        the `factoriollm` binary: ping / validate / plan / apply / destroy
mod/                 companion Lua mod: applies a plan via the Factorio API
scripts/dev.sh        wraps factorio-broadcast's dev.sh for server lifecycle
docs/FORMAT.md        the target YAML format and compiler pipeline
```

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
