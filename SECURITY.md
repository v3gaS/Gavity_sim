# Security

This project is a **static client-side** site (HTML/CSS/JS). It loads **Three.js** from a **CDN** (see `index.html` import map). Use an **integrity** subresource policy or vendor the library if your threat model requires pinning.

## Reporting

If you find a **security issue** in this repository (e.g. XSS in how user content is handled—currently there is no server or user-generated HTML), please open a **private** report via [GitHub Security Advisories](https://github.com/v3gaS/Gavity_sim/security) for the [v3gaS/Gavity_sim](https://github.com/v3gaS/Gavity_sim) repo, or email the maintainer if that channel is unavailable.

For **dependency** or **CDN** supply-chain concerns, document the risk in your deployment and mirror assets if needed.
