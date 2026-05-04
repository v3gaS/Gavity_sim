# Spacetime Curvature Simulator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black)](https://threejs.org/)

Interactive **WebGL** demo: **Newtonian N-body** orbits, a **GPU-shaded** “rubber sheet” tied to the same **μ = GM** values, and **weak-field** light-ray bending.  
**Repository:** [github.com/v3gaS/Gavity_sim](https://github.com/v3gaS/Gavity_sim)

---

## Table of contents

- [Overview](#overview)
- [Live demo](#live-demo)
- [Quick start](#quick-start)
- [Controls](#controls)
- [What is modeled (and what is not)](#what-is-modeled-and-what-is-not)
- [Presets & data sources](#presets--data-sources)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [References](#references)

---

## Overview

| Area | What you get |
|------|----------------|
| **Dynamics** | Velocity Verlet integrator, Plummer softening, per-body **μ (GM)**, optional energy drift readout |
| **Sheet** | Wireframe plane with **vertex shader** displacement + color from a Newtonian-potential metaphor (not a numerical GR solution) |
| **Light rays** | **RK4** in the horizontal plane; **weak-field (∇Φ)** with all masses, or **compact lens** (dominant mass + 2× bend factor for pedagogy) |
| **Rendering** | Three.js **r170**, **ACES** tone mapping, **UnrealBloomPass**, **MeshPhysicalMaterial** spheres, motion **trails** |
| **UI** | **lil-gui**: presets, Δ*t*, substeps, softening, sheet/bloom, ray mode |

Ephemeris-style presets use **GM** values aligned with JPL **DE440** / NAIF **`gm_de440.tpc`** (see [`js/physics_constants.js`](js/physics_constants.js)).

---

## Live demo

**Option A — GitHub Pages (recommended for sharing)**  
Enable [GitHub Pages](https://docs.github.com/pages) for this repo (source: `main`, folder `/` root). After deployment, open the URL shown under **Settings → Pages** (typically `https://<user>.github.io/Gavity_sim/`).

**Option B — Local**  
Use any static server (see [Quick start](#quick-start)). Browsers block ES modules on `file://`; you need **http://** or **https://**.

---

## Quick start

```bash
git clone https://github.com/v3gaS/Gavity_sim.git
cd Gavity_sim
python3 -m http.server 8080
```

Open **http://localhost:8080** in a recent Chrome, Firefox, Safari, or Edge (WebGL 2).

No install or build step: Three.js loads from a CDN via the import map in [`index.html`](index.html).

---

## Controls

| Action | Description |
|--------|-------------|
| **Mouse drag** | Orbit camera |
| **Scroll** | Zoom |
| **Right-drag** | Pan |
| **Start / Pause Gravity** | Run or stop N-body integration |
| **Reset** | Restore current preset; clears light paths |
| **Show / Hide Light Paths** | Ray fan from the grid edge |
| **Show / Hide Explanations** | In-page physics notes |
| **lil-gui** (top-right) | Preset, integrator, sheet depth/color, bloom, ray model & bend gain |

---

## What is modeled (and what is not)

**In scope**

- Mutual Newtonian gravity with softened point masses (**μ = GM**).
- Educational **rubber sheet** and **lensing-style** rays (approximate).

**Out of scope**

- Full **Einstein field equations** (no BSSN / numerical relativity).
- **Gravitational-wave** strain or binary **merger** (GW preset is Newtonian + illustrative masses only).
- **Relativistic** corrections in the particle stepper.

More detail: [IMPLEMENTATION.md](IMPLEMENTATION.md) and [concept.md](concept.md).

---

## Presets & data sources

| Preset | Role |
|--------|------|
| **Toy 3-body** | Exploratory masses and velocities in scene units |
| **Earth–Moon** | DE440 GM ratios, scaled separation |
| **Sun–Jupiter + tracer** | DE440 GM ratios + light tracer (schematic) |
| **GW150914 toy binary** | Illustrative masses from GWTC-1; **Newtonian** orbit only |

**References:** Park et al. 2021 (*AJ* 161, 105); NAIF `gm_de440.tpc`; Abbott et al. 2016 (*PRL* 116, 241102) for event parameters.

---

## Project layout

```
Gavity_sim/
├── index.html                 # Import map, layout, education overlay
├── styles.css
├── LICENSE
├── README.md                  # This file (users & GitHub landing)
├── IMPLEMENTATION.md          # Equations, architecture, performance
├── PROJECT_SUMMARY.md         # Short maintainer snapshot
├── concept.md                 # Physics narrative (with honesty caveats)
├── CONTRIBUTING.md            # How to contribute
├── SECURITY.md              # Security & reporting
└── js/
    ├── simulator.js           # Three.js, integrator, rays, composer, GUI
    └── physics_constants.js   # GM_SI, presets, citations
```

---

## Documentation

| Doc | Audience |
|-----|----------|
| [README.md](README.md) | Everyone: install, controls, scope |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | Developers: math, files, GPU, rays |
| [concept.md](concept.md) | Learners: GR intuition vs this app’s approximations |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Quick internal / release notes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributors |
| [SECURITY.md](SECURITY.md) | Security / supply-chain notes |

---

## Contributing

Issues and pull requests are welcome at **[github.com/v3gaS/Gavity_sim](https://github.com/v3gaS/Gavity_sim)**. See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow and expectations.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

---

## References

- Park, R. S. et al. 2021, *AJ* **161**, 105 — DE440 / DE441.
- NAIF `gm_de440.tpc` — [JPL NAIF](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc).
- GW150914 (illustrative masses): Abbott et al. 2016, *PRL* **116**, 241102.
- [Three.js](https://threejs.org/) · [lil-gui](https://lil-gui.georgealways.com/)

---

## Acknowledgments

Educational spacetime visualizations (e.g. PBS *Space Time*–style explanations) inspired the original direction; the current build emphasizes **honest labeling** of Newtonian vs schematic GR content.
