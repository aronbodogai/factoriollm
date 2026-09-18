# Graph Report - multiple-surfaces-save-f8b734  (2026-09-18)

## Corpus Check
- 44 files · ~16,879 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 3)

## Summary
- 397 nodes · 711 edges · 18 communities (17 shown, 1 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6df24706`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cli/src/index.ts
- compiler/src/index.ts
- Function definition (*.function.yaml)
- spec.ts
- one assembler group per apply call
- cli/package.json
- compiler/package.json
- smoke/package.json
- compilerOptions
- factoriollm.lua
- package.json
- info.json
- cli/tsconfig.json
- compiler/tsconfig.json
- smoke/tsconfig.json
- dev.sh
- smoke/src/index.ts
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `CompileError` - 24 edges
2. `main()` - 12 edges
3. `IREntity` - 12 edges
4. `compilerOptions` - 12 edges
5. `Function definition (*.function.yaml)` - 12 edges
6. `Auto-fill straight/L connector router` - 11 edges
7. `centerPosition()` - 9 edges
8. `ResolvedPort` - 9 edges
9. `resolveFunction()` - 9 edges
10. `furnace_row function` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Resource-backed instance` --semantically_similar_to--> `Infinity-chest void sink`  [INFERRED] [semantically similar]
  docs/FORMAT.md → examples/science-assembler.function.yaml
- `in-port y:1 alignment to the belt tile` --references--> `Auto-fill straight/L connector router`  [INFERRED]
  examples/furnace-row.function.yaml → docs/FORMAT.md
- `belt_segment function` --implements--> `Function definition (*.function.yaml)`  [INFERRED]
  examples/belt-segment.function.yaml → docs/FORMAT.md
- `belt_segment function` --implements--> `params / repeat / ${expr} templating`  [INFERRED]
  examples/belt-segment.function.yaml → docs/FORMAT.md
- `furnace_row function` --implements--> `Function definition (*.function.yaml)`  [INFERRED]
  examples/furnace-row.function.yaml → docs/FORMAT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 2 fixtures exercising the connector router** — examples_belt_segment_function_belt_segment, examples_smelting_column_function_smelting_column, docs_format_auto_fill_connector, docs_format_port [EXTRACTED 1.00]
- **RCON apply batch-size limits and spec splitting** — examples_vanilla_60spm_power_smelting_spec_rcon_command_char_limit, examples_vanilla_60spm_assembly_spec_apply_lua_work_limit, examples_vanilla_60spm_assembly_science1_spec_one_group_per_apply [EXTRACTED 1.00]
- **Solar farm to assembly electric network** — examples_vanilla_60spm_power_smelting_spec_solar_farm, examples_vanilla_60spm_power_smelting_spec_frozen_daytime_solar_convention, examples_vanilla_60spm_power_smelting_spec_relay_spine, examples_vanilla_60spm_power_smelting_spec_relay10, examples_vanilla_60spm_power_smelting_spec_relay12, examples_vanilla_60spm_power_smelting_spec_iron_furnace_1 [EXTRACTED 1.00]
- **Electric pole coverage and placement rules learned live** — examples_solar_row_function_pole_supply_radius, examples_science_assembler_function_pole_supply_radius_coverage, examples_furnace_row_function_pole_gap_spacing, examples_science_assembler_function_pole_connector_collision, examples_single_pole_function_single_pole [INFERRED 0.85]
- **60 SPM self-sustained production chain** — readme_60spm_milestone, examples_furnace_row_function_furnace_row, examples_gear_assembler_function_gear_assembler, examples_science_assembler_function_science_assembler, examples_solar_row_function_solar_row, examples_science_assembler_function_void_sink [INFERRED 0.85]
- **Four-group science assembler bank (60 SPM)** — examples_vanilla_60spm_assembly_science1_spec_science1, examples_vanilla_60spm_assembly_science2_spec_science2, examples_vanilla_60spm_assembly_science3_spec_science3, examples_vanilla_60spm_assembly_science4_spec_science4, examples_vanilla_60spm_assembly_science1_spec_one_group_per_apply [INFERRED 0.95]

## Communities (18 total, 1 thin omitted)

### Community 0 - "cli/src/index.ts"
Cohesion: 0.08
Nodes (49): BOOLEAN_FLAGS, parseArgs(), ParsedArgs, applyCommand(), runSmokeCheck(), destroyBySurfaceDelete(), destroyCommand(), ping() (+41 more)

### Community 1 - "compiler/src/index.ts"
Cohesion: 0.07
Nodes (64): BELT_ENTITY_NAME, findCorner(), gapTiles(), isHorizontal(), OPPOSITE, resolvePort(), routeBeltOrPipe(), routeConnections() (+56 more)

### Community 2 - "Function definition (*.function.yaml)"
Cohesion: 0.09
Nodes (45): Auto-fill straight/L connector router, Compiler pipeline, Composition spec (*.spec.yaml), v1 four-way direction restriction, Function definition (*.function.yaml), L-bend connector case, params / repeat / ${expr} templating, Named port (+37 more)

### Community 3 - "spec.ts"
Cohesion: 0.08
Nodes (29): loadFunctions(), parseFunction(), parseSpec(), parseYamlFile(), ZodLikeSchema, directionSchema, numberOrExprSchema, positionSchema (+21 more)

### Community 4 - "one assembler group per apply call"
Cohesion: 0.06
Nodes (40): infinity_chest resource mode, patch1 (infinity-chest iron-ore stub), patch1 (real-drills iron-ore patch), real_drills resource mode, factoriollm scan-resources, direct-adjacency placement (no connections block), ore_source (infinity-chest iron-ore feed), smelter (test_smelter instance) (+32 more)

### Community 5 - "cli/package.json"
Cohesion: 0.09
Nodes (21): bin, factoriollm, dependencies, @factoriollm/compiler, @factoriollm/smoke, devDependencies, tsx, @types/node (+13 more)

### Community 7 - "compiler/package.json"
Cohesion: 0.11
Nodes (17): dependencies, yaml, zod, devDependencies, @types/node, typescript, @types/node, typescript (+9 more)

### Community 8 - "smoke/package.json"
Cohesion: 0.14
Nodes (13): devDependencies, @types/node, typescript, @types/node, typescript, main, name, private (+5 more)

### Community 9 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+4 more)

### Community 10 - "factoriollm.lua"
Cohesion: 0.17
Nodes (20): apply_infinity_filter(), apply_recipe(), cluster_resources(), create_managed_surface(), do_create(), do_update(), ensure_chunks(), get_surface() (+12 more)

### Community 11 - "package.json"
Cohesion: 0.20
Nodes (9): devDependencies, typescript, typescript, name, private, scripts, build, type (+1 more)

### Community 12 - "info.json"
Cohesion: 0.25
Nodes (7): author, dependencies, description, factorio_version, name, title, version

### Community 13 - "cli/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 14 - "compiler/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 15 - "smoke/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 17 - "dev.sh"
Cohesion: 0.83
Nodes (3): forward_to_sibling(), is_sibling_command(), dev.sh script

### Community 18 - "smoke/src/index.ts"
Cohesion: 0.50
Nodes (4): fetchStats(), SmokeCheckResult, StatsSnapshot, waitForProduction()

## Ambiguous Edges - Review These
- `test_smelter function` → `Electric-only furnace choice`  [AMBIGUOUS]
  examples/test-smelter.function.yaml · relation: conceptually_related_to

## Knowledge Gaps
- **127 isolated node(s):** `name`, `version`, `title`, `author`, `factorio_version` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 144 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `test_smelter function` and `Electric-only furnace choice`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `CompileError` connect `compiler/src/index.ts` to `spec.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `yaml` connect `compiler/package.json` to `spec.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `zod` connect `spec.ts` to `compiler/package.json`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `Function definition (*.function.yaml)` (e.g. with `belt_segment function` and `furnace_row function`) actually correct?**
  _`Function definition (*.function.yaml)` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `title` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cli/src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07595628415300547 - nodes in this community are weakly interconnected._