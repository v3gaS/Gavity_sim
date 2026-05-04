# Physics concepts and how this app represents them

**App:** [Gavity_sim](https://github.com/v3gaS/Gavity_sim) — an interactive **WebGL** visualization.  
This page connects **general relativity (GR) intuition** to **what the program actually computes**. For setup and controls, see [README.md](README.md).

---

## 1. Spacetime as a fabric

In GR, space and time form a single four-dimensional **spacetime**. This demo shows a **2D surface** (a horizontal sheet) deformed in the vertical direction. That is a **popular metaphor** (“rubber sheet”), not a literal plot of a relativistic spacetime slice.

**In the app:** vertex height and color follow a **Newtonian-style** potential built from the same **μ = GM** parameters that drive the particle motion. The sheet **moves with the bodies** and stays easy to read.

---

## 2. Mass and curvature

In GR, **mass–energy** curves spacetime via Einstein’s field equations. Larger mass generally means **stronger** effects on clocks, trajectories, and light.

**In the app:** each colored sphere has a gravitational parameter **μ**. Larger **μ** deepens the sheet metaphor and strengthens **Newtonian** attraction on other bodies. The field equations of GR are **not** solved numerically here.

---

## 3. Gravity as geometry vs Newtonian force

GR: bodies try to follow **geodesics** (“straightest” paths) in curved spacetime.  
Newton: bodies accelerate under a **force** that falls off with distance.

**In the app:** when you press **Start Gravity**, the spheres follow **mutual Newtonian gravity** (velocity Verlet + softening). That gives believable **orbits** and **chaos** for a toy system, while the **sheet** still suggests the geometric picture for learners.

---

## 4. Orbital motion

In nature, planets and satellites follow paths determined by the full metric (GR) or, to high accuracy in the solar system, by Newtonian gravity plus small corrections.

**In the app:** orbits are **Newtonian N-body** (with softened point masses). **Presets** such as Earth–Moon or Sun–Jupiter use **GM ratios** from **DE440**-style data ([`js/physics_constants.js`](js/physics_constants.js)), scaled to fit the scene—not a substitute for a full ephemeris integrator.

---

## 5. Light and gravitational lensing

GR predicts that light **bends** near mass (e.g. Eddington’s 1919 eclipse result). Lensing maps in astrophysics use relativistic optics; weak-field approximations are common.

**In the app:** **light paths** integrate a **simple weak-field-style** bending model using **∇Φ** from the **μ** sources (RK4 in the horizontal plane). **Compact lens** mode uses only the **dominant** mass and applies a **2×** factor on the bend term as a **pedagogical** nod to the classic **factor-of-two** light deflection beyond naive Newtonian scraping—it is **not** a full **null geodesic** in Schwarzschild or Kerr.

---

## 6. Gravitational waves (GW150914 preset)

**LIGO/Virgo/KAGRA** detect **strain** from merging compact objects; waveforms need **numerical relativity** near merger.

**In the app:** the **GW150914 toy** preset uses **illustrative component masses** from the literature and runs a **Newtonian binary** for visual rhythm only. There is **no** waveform, **no** merger, **no** ringdown.

---

## 7. What you can explore in the UI

- **Presets** (lil-gui): toy 3-body, Earth–Moon, Sun–Jupiter + tracer, GW-inspired binary.
- **μ, x, z, vₓ, vᵧ** per body; **Δt**, **substeps**, **softening** for numerical stability.
- **Sheet** depth/color gain; **bloom**; **ray mode** and **bend** strength.
- **Energy** readout: monitors drift for the **μ-consistent** Newtonian energy expression (see [IMPLEMENTATION.md](IMPLEMENTATION.md)).

---

## 8. Historical and modern context

GR (1915) has been tested by lensing, solar system tests, **gravitational waves** (e.g. GW150914), and more. This simulation is **not** a substitute for those measurements or professional tools; it is a **labeled**, **interactive** companion for building intuition.

---

## Further reading

- [README.md](README.md) — install, controls, limitations.
- [IMPLEMENTATION.md](IMPLEMENTATION.md) — equations and file map.
- Repository: **https://github.com/v3gaS/Gavity_sim**
