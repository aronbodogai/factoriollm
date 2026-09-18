## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Managed surfaces (fllm-*)

Factorio's production statistics are per-surface (verified live: `get_item_production_statistics` returns a different object per surface). Deploying each spec to its own surface is what makes `apply --smoke-check` able to attribute output to that spec alone — on a shared surface it cannot.

Rules:
- Set `server.surface` to a name starting with `fllm-` and the companion mod creates it on first apply: a lab-tile void surface, no ore/water/cliffs/trees, daytime frozen. Chunks are generated on demand only where the plan's create ops land.
- The `fllm-` prefix is a hard safety gate, not a convention. Any other surface name (`nauvis`, a Space Age planet, another mod's) is looked up but never created and never deleted — `delete_surface` refuses it.
- `destroy <spec> --delete-surface` tears the surface down in one call. Prefer it over per-entity destroy on a managed surface: cheaper, and it also removes entities the state file never tracked.
- `factoriollm surfaces` lists the managed surfaces on the server.
- In game, the `fllm` top-bar button opens a dropdown of managed surfaces and switches to the selected one in remote view, leaving the player's character where it is.

Constraints worth remembering:
- Electric networks never cross surfaces, so every surface needs its own power; a void surface has no ore, so inputs come from infinity chests.
- Research/logistics isolation would need a separate *force* as well (Blueprint Sandboxes does this). Not implemented — it first needs checking whether factorio-broadcast's sidecar reports non-player forces.
- `M.setup` in `mod/factoriollm.lua` runs at load scope where `game` does not exist. Never touch `game` there; use the event handlers registered in `mod/control.lua`.
