# Graph Report - graphify-b05a49  (2026-09-18)

## Corpus Check
- Corpus is ~14,018 words - fits in a single context window. You may not need a graph.

## Summary
- 358 nodes · 680 edges · 18 communities
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.89)
- Token cost: 207,030 input · 0 output

## Community Hubs (Navigation)
- CLI Command Layer
- Connector Routing and Layout
- Spec Format Concepts
- YAML Schema Parsing
- 60 SPM Build Specs
- CLI Package Manifest
- Resource and Smoke Fixtures
- Compiler Package Manifest
- Smoke Package Manifest
- Shared TypeScript Config
- Factorio Lua Mod
- Workspace Root Manifest
- Mod Metadata
- CLI TypeScript Config
- Compiler TypeScript Config
- Smoke TypeScript Config
- Expression Parser
- Dev Shell Script

## God Nodes (most connected - your core abstractions)
1. `CompileError` - 24 edges
2. `IREntity` - 12 edges
3. `compilerOptions` - 12 edges
4. `Function definition (*.function.yaml)` - 12 edges
5. `main()` - 11 edges
6. `parseSpec()` - 11 edges
7. `Auto-fill straight/L connector router` - 11 edges
8. `destroyCommand()` - 10 edges
9. `compilePlan()` - 10 edges
10. `buildIR()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Resource-backed instance` --semantically_similar_to--> `Infinity-chest void sink`  [INFERRED] [semantically similar]
  docs/FORMAT.md → examples/science-assembler.function.yaml
- `in-port y:1 alignment to the belt tile` --references--> `Auto-fill straight/L connector router`  [INFERRED]
  examples/furnace-row.function.yaml → docs/FORMAT.md
- `packages/compiler` --implements--> `Compiler pipeline`  [INFERRED]
  README.md → docs/FORMAT.md
- `Infinity-chest void sink` --conceptually_related_to--> `apply --smoke-check`  [INFERRED]
  examples/science-assembler.function.yaml → README.md
- `60 SPM self-sustained vanilla build` --references--> `Resource-backed instance`  [INFERRED]
  README.md → docs/FORMAT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 2 fixtures exercising the connector router** — examples_belt_segment_function_belt_segment, examples_smelting_column_function_smelting_column, docs_format_auto_fill_connector, docs_format_port [EXTRACTED 1.00]
- **60 SPM self-sustained production chain** — readme_60spm_milestone, examples_furnace_row_function_furnace_row, examples_gear_assembler_function_gear_assembler, examples_science_assembler_function_science_assembler, examples_solar_row_function_solar_row, examples_science_assembler_function_void_sink [INFERRED 0.85]
- **Electric pole coverage and placement rules learned live** — examples_solar_row_function_pole_supply_radius, examples_science_assembler_function_pole_supply_radius_coverage, examples_furnace_row_function_pole_gap_spacing, examples_science_assembler_function_pole_connector_collision, examples_single_pole_function_single_pole [INFERRED 0.85]
- **Four-group science assembler bank (60 SPM)** — examples_vanilla_60spm_assembly_science1_spec_science1, examples_vanilla_60spm_assembly_science2_spec_science2, examples_vanilla_60spm_assembly_science3_spec_science3, examples_vanilla_60spm_assembly_science4_spec_science4, examples_vanilla_60spm_assembly_science1_spec_one_group_per_apply [INFERRED 0.95]
- **RCON apply batch-size limits and spec splitting** — examples_vanilla_60spm_power_smelting_spec_rcon_command_char_limit, examples_vanilla_60spm_assembly_spec_apply_lua_work_limit, examples_vanilla_60spm_assembly_science1_spec_one_group_per_apply [EXTRACTED 1.00]
- **Solar farm to assembly electric network** — examples_vanilla_60spm_power_smelting_spec_solar_farm, examples_vanilla_60spm_power_smelting_spec_frozen_daytime_solar_convention, examples_vanilla_60spm_power_smelting_spec_relay_spine, examples_vanilla_60spm_power_smelting_spec_relay10, examples_vanilla_60spm_power_smelting_spec_relay12, examples_vanilla_60spm_power_smelting_spec_iron_furnace_1 [EXTRACTED 1.00]

## Communities (18 total, 0 thin omitted)

### Community 0 - "CLI Command Layer"
Cohesion: 0.09
Nodes (44): BOOLEAN_FLAGS, parseArgs(), ParsedArgs, applyCommand(), runSmokeCheck(), destroyCommand(), ping(), Compiled (+36 more)

### Community 1 - "Connector Routing and Layout"
Cohesion: 0.10
Nodes (47): BELT_ENTITY_NAME, findCorner(), gapTiles(), isHorizontal(), OPPOSITE, resolvePort(), routeBeltOrPipe(), routeConnections() (+39 more)

### Community 2 - "Spec Format Concepts"
Cohesion: 0.09
Nodes (45): Auto-fill straight/L connector router, Compiler pipeline, Composition spec (*.spec.yaml), v1 four-way direction restriction, Function definition (*.function.yaml), L-bend connector case, params / repeat / ${expr} templating, Named port (+37 more)

### Community 3 - "YAML Schema Parsing"
Cohesion: 0.08
Nodes (28): parseFunction(), parseYamlFile(), ZodLikeSchema, directionSchema, numberOrExprSchema, positionSchema, EntityTemplate, entityTemplateSchema (+20 more)

### Community 4 - "60 SPM Build Specs"
Cohesion: 0.10
Nodes (22): one assembler group per apply call, science1 (science_assembler group), science1_copper (copper-plate infinity chest), science1_gear (iron-gear-wheel infinity chest), science2 (science_assembler group), science2_copper (copper-plate infinity chest), science2_gear (iron-gear-wheel infinity chest), science3 (science_assembler group) (+14 more)

### Community 5 - "CLI Package Manifest"
Cohesion: 0.09
Nodes (21): bin, factoriollm, dependencies, @factoriollm/compiler, @factoriollm/smoke, devDependencies, tsx, @types/node (+13 more)

### Community 6 - "Resource and Smoke Fixtures"
Cohesion: 0.15
Nodes (18): infinity_chest resource mode, patch1 (infinity-chest iron-ore stub), patch1 (real-drills iron-ore patch), real_drills resource mode, factoriollm scan-resources, direct-adjacency placement (no connections block), ore_source (infinity-chest iron-ore feed), smelter (test_smelter instance) (+10 more)

### Community 7 - "Compiler Package Manifest"
Cohesion: 0.11
Nodes (17): dependencies, yaml, zod, devDependencies, @types/node, typescript, @types/node, typescript (+9 more)

### Community 8 - "Smoke Package Manifest"
Cohesion: 0.14
Nodes (13): devDependencies, @types/node, typescript, @types/node, typescript, main, name, private (+5 more)

### Community 9 - "Shared TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+4 more)

### Community 10 - "Factorio Lua Mod"
Cohesion: 0.31
Nodes (6): apply_infinity_filter(), apply_recipe(), cluster_resources(), do_create(), do_update(), M.setup()

### Community 11 - "Workspace Root Manifest"
Cohesion: 0.20
Nodes (9): devDependencies, typescript, typescript, name, private, scripts, build, type (+1 more)

### Community 12 - "Mod Metadata"
Cohesion: 0.25
Nodes (7): author, dependencies, description, factorio_version, name, title, version

### Community 13 - "CLI TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 14 - "Compiler TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 15 - "Smoke TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, extends, include, ../../tsconfig.base.json

### Community 16 - "Expression Parser"
Cohesion: 0.80
Nodes (5): evaluate(), parseExpr(), parsePrimary(), parseTerm(), parseUnary()

### Community 17 - "Dev Shell Script"
Cohesion: 0.83
Nodes (3): forward_to_sibling(), is_sibling_command(), dev.sh script

## Ambiguous Edges - Review These
- `Electric-only furnace choice` → `test_smelter function`  [AMBIGUOUS]
  examples/test-smelter.function.yaml · relation: conceptually_related_to

## Knowledge Gaps
- **122 isolated node(s):** `name`, `version`, `title`, `author`, `factorio_version` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 134 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Electric-only furnace choice` and `test_smelter function`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `CompileError` connect `Connector Routing and Layout` to `Expression Parser`, `CLI Command Layer`, `YAML Schema Parsing`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `zod` connect `YAML Schema Parsing` to `Compiler Package Manifest`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `yaml` connect `Compiler Package Manifest` to `YAML Schema Parsing`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `Function definition (*.function.yaml)` (e.g. with `belt_segment function` and `furnace_row function`) actually correct?**
  _`Function definition (*.function.yaml)` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `title` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CLI Command Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.08832425892316999 - nodes in this community are weakly interconnected._