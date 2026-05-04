# Contributing to Gavity_sim

Thank you for helping improve **[Gavity_sim](https://github.com/v3gaS/Gavity_sim)**.

## Ground rules

- Keep changes **focused** (one concern per PR when possible).
- **Do not** claim full general relativity or LIGO-accurate mergers unless the code actually implements them—update [README.md](README.md), [concept.md](concept.md), and tooltips if physics scope changes.
- Match existing style: ES modules, imports at top of files, no unnecessary refactors.

## Development setup

```bash
git clone https://github.com/v3gaS/Gavity_sim.git
cd Gavity_sim
python3 -m http.server 8080
# http://localhost:8080
```

There is no bundler; test in a browser with the console open (F12).

## Suggested workflow

1. **Fork** the repository and create a branch from `main`.
2. Make your changes; verify presets, integrator stability, and light paths.
3. Update **user-facing docs** ([README.md](README.md), [IMPLEMENTATION.md](IMPLEMENTATION.md), or in-app overlay in `index.html`) if behavior or scope changes.
4. Open a **pull request** with a short description of *what* and *why*.

## Ideas (non-exhaustive)

- GitHub Actions: smoke test (e.g. `node` script that checks files parse).
- Optional **Vite** dev server while keeping static deploy path.
- Accessibility: keyboard focus, reduced motion, bloom toggle persisted in `localStorage`.
- Additional **presets** with the same DE440 / citation discipline as [`js/physics_constants.js`](js/physics_constants.js).

## Questions

Open a [GitHub issue](https://github.com/v3gaS/Gavity_sim/issues) for bugs, doc gaps, or design discussion.
