# Spacetime Curvature Simulator — Project summary

**GitHub:** [github.com/v3gaS/Gavity_sim](https://github.com/v3gaS/Gavity_sim)

## One-line pitch

Browser **N-body** (velocity Verlet) + **GPU rubber-sheet** metaphor + **weak-field** light rays, with **DE440**-consistent GM presets.

## Stack

- **Three.js r170** (ES modules + import map), **lil-gui**, **EffectComposer** + **UnrealBloomPass**
- **No build** — static files; serve over HTTP ([README.md](README.md))

## Feature snapshot

| Area | Notes |
|------|--------|
| N-body | 2–3 bodies per preset; softening, substeps, energy HUD |
| Sheet | Shader wireframe; not full GR |
| Rays | RK4 + ∇Φ; “compact” = dominant μ + 2× factor |
| Docs | README, IMPLEMENTATION, concept, CONTRIBUTING |

## Version

- **2.0** — Integrator, DE440 presets, shader grid, bloom, trails, full GitHub-oriented docs.

## Maintainer-facing links

| Resource | URL |
|----------|-----|
| Repo | https://github.com/v3gaS/Gavity_sim |
| Issues | https://github.com/v3gaS/Gavity_sim/issues |
| Pages (if enabled) | Repo **Settings → Pages** for live URL |
