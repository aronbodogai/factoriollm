# factoriollm

An LLM-authorable, declarative format for building Factorio factories,
deployed to a headless server the way Terraform deploys infrastructure:
write a spec, `plan` shows the diff, `apply` pushes it, state is tracked so
re-applying is idempotent and `destroy` tears it down. No player, no
inventory, no character — entities are created directly via the Lua API.

Status: **Phase 0** — RCON round trip only. `factoriollm ping` calls the
companion mod's `ping` interface over RCON and prints back its version and
the server's current tick. The format itself (`docs/FORMAT.md`) isn't
implemented yet.

## Quick start (against the shared dev server)

Needs the same WSL2 headless dev server as the sibling
[factorio-broadcast](https://github.com/aronbodogai/factorio-broadcast)
project — factoriollm doesn't stand up its own; see `scripts/dev.sh`.

```bash
export FACTORIO_BROADCAST_DIR=/mnt/c/Users/<you>/factorio-broadcast
./scripts/dev.sh start   # forwarded to the sibling's dev.sh
./scripts/dev.sh ping    # factoriollm: RCON round trip to the companion mod
```

`ping` needs the companion mod (`mod/`) loaded on that server alongside
factorio-broadcast's — see `scripts/dev.sh`'s usage output for the full
forwarded command list (`setup`, `mod`, `softmod`, `rcon`, ...).

## Layout

```
packages/compiler/   parse -> IR -> diff (not implemented yet, see docs/FORMAT.md)
packages/cli/        the `factoriollm` binary — currently just `ping`
mod/                 companion Lua mod: reads a dropped plan, applies it via the Factorio API
scripts/dev.sh        wraps factorio-broadcast's dev.sh for server lifecycle
docs/FORMAT.md        the target YAML format and compiler pipeline
```

## Why RCON alone isn't enough

Factorio's RCON silently rejects long pasted Lua — there's a hard ceiling on
a single command's size. So bulk data never goes over RCON directly: the CLI
will write a compiled plan JSON into the server's `script-output/`
directory, then send a *short* RCON trigger
(`remote.call("factoriollm","apply","plan-<id>.json")`); the companion mod
reads the file itself via `helpers.read_file` and applies it in Lua. RCON
replies aren't constrained the same way, so results come back directly as
the call's return value — `ping` already exercises that path end to end.
