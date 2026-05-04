import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { getPreset, PRESET_KEYS } from './physics_constants.js';

const GRID_SIZE = 30;
const GRID_SEGMENTS_HI = 56;
const GRID_SEGMENTS_LO = 28;
const LIGHT_PATH_COUNT = 24;
const LIGHT_PATH_POINTS = 140;
const TRAIL_MAX = 100;
const TOY_MU_SCALE = 0.55;
const MAX_SHADER_BODIES = 8;

let scene;
let camera;
let renderer;
let controls;
let composer;
let bloomPass;
let gridMesh;
let gridMaterial;
let spheres = [];
let trailLines = [];
let lightPaths = [];
let trailQueues = [];

let bodies = [];
let baselineEnergy = 0;
let currentPresetKey = PRESET_KEYS.TOY;

let gravityActive = false;
let lightPathsActive = false;
let gui;

let simParams = {
    dt: 0.012,
    substeps: 6,
    softening: 0.065,
    rayMode: 'weakfield',
    rayBend: 0.042,
    bloomStrength: 0.38,
    bloomThreshold: 0.15,
    highQualityGrid: true,
    dispScale: 4.2,
    potNorm: 0.012,
};

const gridVertexShader = `
uniform vec4 uBodies[8];
uniform int uBodyCount;
uniform float uSoftening;
uniform float uDispScale;
varying float vPot;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec3 wp = worldPosition.xyz;
    float pot = 0.0;
    float disp = 0.0;
    for (int i = 0; i < 8; i++) {
        if (i >= uBodyCount) break;
        vec4 B = uBodies[i];
        vec3 d = wp - B.xyz;
        float r2 = dot(d, d) + uSoftening * uSoftening;
        float invR = inversesqrt(r2);
        float invR2 = invR * invR;
        pot += -B.w * invR;
        disp += -uDispScale * B.w * invR2;
    }
    disp = clamp(disp, -3.0, 0.0);
    vec3 displaced = wp + vec3(0.0, disp, 0.0);
    vPot = pot;
    vec4 mvPosition = viewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const gridFragmentShader = `
varying float vPot;
uniform float uPotNorm;

void main() {
    float t = clamp(0.52 + vPot * uPotNorm, 0.0, 1.0);
    vec3 c = mix(vec3(0.02, 0.05, 0.12), vec3(0.4, 0.82, 1.0), t);
    gl_FragColor = vec4(c, 0.82);
}
`;

function accelerations(bd, eps) {
    const n = bd.length;
    const ax = new Float64Array(n);
    const ay = new Float64Array(n);
    const az = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const bi = bd[i];
            const bj = bd[j];
            if (bj.mu < 1e-20) continue;
            const dx = bj.x - bi.x;
            const dy = bj.y - bi.y;
            const dz = bj.z - bi.z;
            const r2 = dx * dx + dy * dy + dz * dz + eps * eps;
            const invR = 1 / Math.sqrt(r2);
            const invR3 = invR * invR * invR;
            const s = bj.mu * invR3;
            ax[i] += s * dx;
            ay[i] += s * dy;
            az[i] += s * dz;
        }
    }
    return { ax, ay, az };
}

function integrateStep(bd, dt, eps) {
    const n = bd.length;
    const a0 = accelerations(bd, eps);
    for (let i = 0; i < n; i++) {
        const b = bd[i];
        b.vx += a0.ax[i] * dt * 0.5;
        b.vy += a0.ay[i] * dt * 0.5;
        b.vz += a0.az[i] * dt * 0.5;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
    }
    const a1 = accelerations(bd, eps);
    for (let i = 0; i < n; i++) {
        bd[i].vx += a1.ax[i] * dt * 0.5;
        bd[i].vy += a1.ay[i] * dt * 0.5;
        bd[i].vz += a1.az[i] * dt * 0.5;
    }
}

function computeEnergy(bd, eps) {
    let T = 0;
    for (const b of bd) {
        T += 0.5 * b.mu * (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
    }
    let V = 0;
    for (let i = 0; i < bd.length; i++) {
        for (let j = i + 1; j < bd.length; j++) {
            const a = bd[i];
            const bb = bd[j];
            const dx = bb.x - a.x;
            const dy = bb.y - a.y;
            const dz = bb.z - a.z;
            const r = Math.sqrt(dx * dx + dy * dy + dz * dz + eps * eps);
            V -= (a.mu * bb.mu) / r;
        }
    }
    return T + V;
}

function dominantBodyIndex(bd) {
    let idx = 0;
    let m = -1;
    for (let i = 0; i < bd.length; i++) {
        if (bd[i].mu > m) {
            m = bd[i].mu;
            idx = i;
        }
    }
    return idx;
}

function gradPotentialAt(x, y, z, bd, eps, centralOnly, centralIdx) {
    let gx = 0;
    let gy = 0;
    let gz = 0;
    const useIdx = centralOnly ? [centralIdx] : bd.map((_, i) => i);
    for (const idx of useIdx) {
        const b = bd[idx];
        if (!b || b.mu < 1e-20) continue;
        const dx = x - b.x;
        const dy = y - b.y;
        const dz = z - b.z;
        const r2 = dx * dx + dy * dy + dz * dz + eps * eps;
        const invR = 1 / Math.sqrt(r2);
        const invR3 = invR * invR * invR;
        const s = b.mu * invR3;
        gx += s * dx;
        gy += s * dy;
        gz += s * dz;
    }
    return { gx, gy, gz };
}

function rayDerivative(px, pz, kx, kz, bd, eps, bendScale, centralOnly, centralIdx) {
    const y = 0.55;
    const { gx, gz } = gradPotentialAt(px, y, pz, bd, eps, centralOnly, centralIdx);
    const factor = centralOnly ? 2 : 1;
    return {
        dpx: kx,
        dpz: kz,
        dkx: -bendScale * factor * gx,
        dkz: -bendScale * factor * gz,
    };
}

function rk4RayStep(px, pz, kx, kz, dl, bd, eps, bendScale, centralOnly, centralIdx) {
    const norm = (ax, az) => {
        const L = Math.hypot(ax, az) || 1;
        return { x: ax / L, z: az / L };
    };
    const nk0 = norm(kx, kz);
    kx = nk0.x;
    kz = nk0.z;

    const F = (x, z, kxv, kzv) => rayDerivative(x, z, kxv, kzv, bd, eps, bendScale, centralOnly, centralIdx);

    const r1 = F(px, pz, kx, kz);
    const r2 = F(px + 0.5 * dl * r1.dpx, pz + 0.5 * dl * r1.dpz, kx + 0.5 * dl * r1.dkx, kz + 0.5 * dl * r1.dkz);
    const r3 = F(px + 0.5 * dl * r2.dpx, pz + 0.5 * dl * r2.dpz, kx + 0.5 * dl * r2.dkx, kz + 0.5 * dl * r2.dkz);
    const r4 = F(px + dl * r3.dpx, pz + dl * r3.dpz, kx + dl * r3.dkx, kz + dl * r3.dkz);

    const npx = px + (dl / 6) * (r1.dpx + 2 * r2.dpx + 2 * r3.dpx + r4.dpx);
    const npz = pz + (dl / 6) * (r1.dpz + 2 * r2.dpz + 2 * r3.dpz + r4.dpz);
    let nkx = kx + (dl / 6) * (r1.dkx + 2 * r2.dkx + 2 * r3.dkx + r4.dkx);
    let nkz = kz + (dl / 6) * (r1.dkz + 2 * r2.dkz + 2 * r3.dkz + r4.dkz);
    const nf = norm(nkx, nkz);
    return { px: npx, pz: npz, kx: nf.x, kz: nf.z };
}

function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(18, 16, 22);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(8, 20, 10);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xaaccff, 0.35);
    fill.position.set(-12, 8, -8);
    scene.add(fill);

    composer = new EffectComposer(renderer);
    const rp = new RenderPass(scene, camera);
    composer.addPass(rp);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.45, 0.15);
    bloomPass.strength = simParams.bloomStrength;
    bloomPass.threshold = simParams.bloomThreshold;
    composer.addPass(bloomPass);

    window.addEventListener('resize', onWindowResize);
}

function createGrid() {
    if (gridMesh) {
        scene.remove(gridMesh);
        gridMesh.geometry.dispose();
        gridMaterial.dispose();
    }
    const segs = simParams.highQualityGrid ? GRID_SEGMENTS_HI : GRID_SEGMENTS_LO;
    const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, segs, segs);
    const arr = new Float32Array(MAX_SHADER_BODIES * 4);
    gridMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uBodies: { value: arr },
            uBodyCount: { value: 0 },
            uSoftening: { value: simParams.softening },
            uDispScale: { value: simParams.dispScale },
            uPotNorm: { value: simParams.potNorm },
        },
        vertexShader: gridVertexShader,
        fragmentShader: gridFragmentShader,
        wireframe: true,
        transparent: true,
        depthWrite: true,
    });
    gridMesh = new THREE.Mesh(geo, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    scene.add(gridMesh);
}

function sphereRadiusForBody(b) {
    const ref = Math.max(b.mu, 0.5);
    return Math.min(1.8, 0.12 + Math.cbrt(ref) * 0.045);
}

function rebuildSpheres() {
    for (const m of spheres) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
    }
    for (const ln of trailLines) {
        scene.remove(ln);
        ln.geometry.dispose();
        ln.material.dispose();
    }
    spheres = [];
    trailLines = [];
    trailQueues = [];

    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const r = sphereRadiusForBody(b);
        const geo = new THREE.SphereGeometry(r, 40, 40);
        const mat = new THREE.MeshPhysicalMaterial({
            color: b.color,
            metalness: 0.25,
            roughness: 0.35,
            emissive: new THREE.Color(b.color),
            emissiveIntensity: 0.35,
            clearcoat: 0.4,
            clearcoatRoughness: 0.35,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(b.x, b.y, b.z);
        scene.add(mesh);
        spheres.push(mesh);

        const tGeo = new THREE.BufferGeometry();
        const tMat = new THREE.LineBasicMaterial({
            color: b.color,
            transparent: true,
            opacity: 0.45,
        });
        const line = new THREE.Line(tGeo, tMat);
        scene.add(line);
        trailLines.push(line);
        trailQueues.push([]);
    }
}

function updateGridUniforms() {
    if (!gridMaterial) return;
    const u = gridMaterial.uniforms;
    const arr = u.uBodies.value;
    arr.fill(0);
    const n = Math.min(bodies.length, MAX_SHADER_BODIES);
    for (let i = 0; i < n; i++) {
        const b = bodies[i];
        arr[i * 4] = b.x;
        arr[i * 4 + 1] = b.y;
        arr[i * 4 + 2] = b.z;
        arr[i * 4 + 3] = b.mu;
    }
    u.uBodyCount.value = n;
    u.uSoftening.value = simParams.softening;
    u.uDispScale.value = simParams.dispScale;
    u.uPotNorm.value = simParams.potNorm;
}

function updateSphereMeshes() {
    for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        spheres[i].position.set(b.x, b.y, b.z);
    }
}

function updateTrails(frame) {
    if (frame % 2 !== 0) return;
    for (let i = 0; i < bodies.length; i++) {
        const q = trailQueues[i];
        q.push(new THREE.Vector3(bodies[i].x, bodies[i].y, bodies[i].z));
        if (q.length > TRAIL_MAX) q.shift();
        if (q.length < 2) continue;
        trailLines[i].geometry.dispose();
        trailLines[i].geometry = new THREE.BufferGeometry().setFromPoints(q);
    }
}

function applyPreset(key) {
    currentPresetKey = key;
    const p = getPreset(key);
    const S = p.separationScene;
    bodies = p.bodies.map((b) => {
        if ('mass' in b) {
            const mu = b.mass * TOY_MU_SCALE;
            return {
                name: b.name,
                color: b.color,
                x: b.x,
                y: b.y,
                z: b.z,
                vx: b.vx,
                vy: b.vy,
                vz: b.vz,
                mu,
                massGui: b.mass,
                isToy: true,
            };
        }
        return {
            name: b.name,
            color: b.color,
            x: b.x * S,
            y: b.y,
            z: b.z * S,
            vx: b.vx * S,
            vy: b.vy,
            vz: b.vz * S,
            mu: b.muFrac * S * S * S,
            massGui: b.muFrac * S * S * S,
            isToy: false,
        };
    });
    baselineEnergy = computeEnergy(bodies, simParams.softening);
    rebuildSpheres();
    rebuildGUI();
    updateGridUniforms();
    if (lightPathsActive) {
        removeLightPaths();
        createLightPaths();
    }
}

function rebuildGUI() {
    if (gui) gui.destroy();
    gui = new GUI({ title: 'Simulation' });

    const simFolder = gui.addFolder('Integrator');
    simFolder
        .add(
            {
                preset: currentPresetKey,
            },
            'preset',
            {
                'Toy 3-body': PRESET_KEYS.TOY,
                'Earth–Moon': PRESET_KEYS.EARTH_MOON,
                'Sun–Jupiter + tracer': PRESET_KEYS.SUN_JUPITER,
                'GW150914 toy binary': PRESET_KEYS.GW_TOY,
            },
        )
        .name('Preset')
        .onChange((v) => {
            gravityActive = false;
            startGravityBtn.textContent = 'Start Gravity';
            applyPreset(v);
            statusText.textContent = 'Gravity simulation paused';
            updateEducationalHighlights();
        });
    simFolder.add(simParams, 'dt', 0.002, 0.04, 0.001).name('Δt');
    simFolder.add(simParams, 'substeps', 1, 24, 1).name('Substeps');
    simFolder.add(simParams, 'softening', 0.02, 0.2, 0.005).name('Softening ε');
    simFolder.open();

    const disp = gui.addFolder('Sheet & bloom');
    disp.add(simParams, 'dispScale', 1, 12, 0.1).name('Sheet depth');
    disp.add(simParams, 'potNorm', 0.002, 0.04, 0.001).name('Sheet color gain');
    disp.add(simParams, 'highQualityGrid').name('High-res grid').onChange(() => {
        createGrid();
        updateGridUniforms();
    });
    disp.add(simParams, 'bloomStrength', 0, 1.2, 0.02).name('Bloom').onChange((v) => {
        bloomPass.strength = v;
    });
    disp.add(simParams, 'bloomThreshold', 0, 1, 0.02).name('Bloom threshold').onChange((v) => {
        bloomPass.threshold = v;
    });
    disp.open();

    const rayF = gui.addFolder('Light rays');
    rayF
        .add(simParams, 'rayMode', { 'Weak-field (all masses)': 'weakfield', 'Compact lens (2× bend)': 'compact' })
        .name('Ray model')
        .onChange(() => {
            if (lightPathsActive) updateLightPaths();
        });
    rayF.add(simParams, 'rayBend', 0.005, 0.12, 0.001).name('Bend gain').onChange(() => {
        if (lightPathsActive) updateLightPaths();
    });
    rayF.open();

    bodies.forEach((b, index) => {
        const f = gui.addFolder(b.name || `Body ${index + 1}`);
        f.add(b, 'mu', 0.05, Math.max(900, b.mu * 4), 0.05)
            .name('μ (GM)')
            .onChange(() => {
                updateGridUniforms();
                const r = sphereRadiusForBody(b);
                spheres[index].geometry.dispose();
                spheres[index].geometry = new THREE.SphereGeometry(r, 40, 40);
                if (lightPathsActive) updateLightPaths();
                updateEnergyReadout();
            });
        f.add(b, 'x', -GRID_SIZE * 0.55, GRID_SIZE * 0.55, 0.05)
            .name('x')
            .onChange(() => {
                updateSphereMeshes();
                updateGridUniforms();
                if (lightPathsActive) updateLightPaths();
                updateEnergyReadout();
            });
        f.add(b, 'z', -GRID_SIZE * 0.55, GRID_SIZE * 0.55, 0.05)
            .name('z')
            .onChange(() => {
                updateSphereMeshes();
                updateGridUniforms();
                if (lightPathsActive) updateLightPaths();
                updateEnergyReadout();
            });
        f.add(b, 'vx', -3, 3, 0.02)
            .name('vx')
            .onChange(() => {
                baselineEnergy = computeEnergy(bodies, simParams.softening);
                updateEnergyReadout();
            });
        f.add(b, 'vz', -3, 3, 0.02)
            .name('vz')
            .onChange(() => {
                baselineEnergy = computeEnergy(bodies, simParams.softening);
                updateEnergyReadout();
            });
        f.open();
    });
}

let startGravityBtn;
let resetSimulationBtn;
let statusText;
let toggleEducationBtn;
let educationOverlay;
let toggleLightPathsBtn;
let energyText;
let frameCount = 0;

function updateEnergyReadout() {
    if (!energyText) return;
    const E = computeEnergy(bodies, simParams.softening);
    const dE = baselineEnergy !== 0 ? ((E - baselineEnergy) / Math.max(Math.abs(baselineEnergy), 1e-9)) * 100 : 0;
    energyText.textContent = `E = ${E.toExponential(4)}  (Δ vs baseline: ${dE.toFixed(3)}%)`;
}

function toggleGravity() {
    gravityActive = !gravityActive;
    if (gravityActive) {
        baselineEnergy = computeEnergy(bodies, simParams.softening);
        startGravityBtn.textContent = 'Pause Gravity';
        statusText.textContent = 'N-body integration running';
    } else {
        startGravityBtn.textContent = 'Start Gravity';
        statusText.textContent = 'Gravity simulation paused';
    }
    updateEducationalHighlights();
}

function resetSimulation() {
    gravityActive = false;
    startGravityBtn.textContent = 'Start Gravity';
    statusText.textContent = 'Gravity simulation paused';
    applyPreset(currentPresetKey);
    if (lightPathsActive) {
        lightPathsActive = false;
        toggleLightPathsBtn.textContent = 'Show Light Paths';
        removeLightPaths();
        statusText.textContent = 'Gravity simulation paused';
    }
    updateEducationalHighlights();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
}

function toggleEducation() {
    const isHidden = educationOverlay.classList.contains('hidden');
    if (isHidden) {
        educationOverlay.classList.remove('hidden');
        toggleEducationBtn.textContent = 'Hide Explanations';
        highlightRelevantTooltips();
    } else {
        educationOverlay.classList.add('hidden');
        toggleEducationBtn.textContent = 'Show Explanations';
        removeTooltipHighlights();
    }
}

function highlightRelevantTooltips() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach((t) => t.classList.remove('highlight'));
    if (gravityActive) {
        document.querySelector('[data-target="gravity-simulation"]')?.classList.add('highlight');
    }
    if (lightPathsActive) {
        document.querySelector('[data-target="light-paths"]')?.classList.add('highlight');
    }
    const maxMu = Math.max(...bodies.map((m) => m.mu));
    if (maxMu > 40) {
        document.querySelector('[data-target="grid-deformation"]')?.classList.add('highlight');
    }
}

function removeTooltipHighlights() {
    document.querySelectorAll('.tooltip').forEach((t) => t.classList.remove('highlight'));
}

function updateEducationalHighlights() {
    if (!educationOverlay.classList.contains('hidden')) {
        highlightRelevantTooltips();
    }
}

function toggleLightPaths() {
    lightPathsActive = !lightPathsActive;
    if (lightPathsActive) {
        toggleLightPathsBtn.textContent = 'Hide Light Paths';
        statusText.textContent = gravityActive ? 'N-body + light rays' : 'Light rays (paused N-body)';
        createLightPaths();
        if (!educationOverlay.classList.contains('hidden')) {
            document.querySelector('[data-target="light-paths"]')?.classList.add('highlight');
        }
    } else {
        toggleLightPathsBtn.textContent = 'Show Light Paths';
        statusText.textContent = gravityActive ? 'N-body integration running' : 'Gravity simulation paused';
        removeLightPaths();
        document.querySelector('[data-target="light-paths"]')?.classList.remove('highlight');
    }
}

function createLightPaths() {
    removeLightPaths();
    for (let i = 0; i < LIGHT_PATH_COUNT; i++) {
        const mat = new THREE.LineBasicMaterial({
            color: 0xffee88,
            transparent: true,
            opacity: 0.75,
        });
        const geom = new THREE.BufferGeometry();
        const line = new THREE.Line(geom, mat);
        scene.add(line);
        lightPaths.push(line);
    }
    updateLightPaths();
}

function removeLightPaths() {
    for (const path of lightPaths) {
        scene.remove(path);
        path.geometry.dispose();
        path.material.dispose();
    }
    lightPaths = [];
}

function updateLightPaths() {
    if (!lightPathsActive || lightPaths.length === 0) return;
    const half = GRID_SIZE * 0.48;
    const centralIdx = dominantBodyIndex(bodies);
    const compact = simParams.rayMode === 'compact';
    const eps = simParams.softening;
    const bend = simParams.rayBend;
    const dl = 0.14;

    for (let i = 0; i < LIGHT_PATH_COUNT; i++) {
        const angle = (i / LIGHT_PATH_COUNT) * Math.PI * 2;
        const r0 = half - 1.2;
        let px = r0 * Math.cos(angle);
        let pz = r0 * Math.sin(angle);
        let kx = -Math.cos(angle);
        let kz = -Math.sin(angle);
        const L0 = Math.hypot(kx, kz) || 1;
        kx /= L0;
        kz /= L0;

        const pts = [];
        for (let s = 0; s < LIGHT_PATH_POINTS; s++) {
            pts.push(new THREE.Vector3(px, 0.55, pz));
            const step = rk4RayStep(px, pz, kx, kz, dl, bodies, eps, bend, compact, centralIdx);
            px = step.px;
            pz = step.pz;
            kx = step.kx;
            kz = step.kz;
            if (Math.abs(px) > half + 2 || Math.abs(pz) > half + 2) break;
        }
        const path = lightPaths[i];
        path.geometry.dispose();
        path.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    }
}

function animate() {
    requestAnimationFrame(animate);
    frameCount++;
    controls.update();

    if (gravityActive) {
        const h = simParams.dt / simParams.substeps;
        for (let s = 0; s < simParams.substeps; s++) {
            integrateStep(bodies, h, simParams.softening);
        }
        updateSphereMeshes();
        updateTrails(frameCount);
        updateGridUniforms();
        if (lightPathsActive) updateLightPaths();
        if (frameCount % 12 === 0) updateEnergyReadout();
    }

    composer.render();
}

function init() {
    startGravityBtn = document.getElementById('startGravity');
    resetSimulationBtn = document.getElementById('resetSimulation');
    statusText = document.getElementById('status');
    toggleEducationBtn = document.getElementById('toggleEducation');
    educationOverlay = document.getElementById('education-overlay');
    toggleLightPathsBtn = document.getElementById('toggleLightPaths');
    energyText = document.getElementById('energy');

    startGravityBtn.addEventListener('click', toggleGravity);
    resetSimulationBtn.addEventListener('click', resetSimulation);
    toggleEducationBtn.addEventListener('click', toggleEducation);
    toggleLightPathsBtn.addEventListener('click', toggleLightPaths);

    setupScene();
    createGrid();
    applyPreset(PRESET_KEYS.TOY);
    updateEnergyReadout();

    animate();
}

window.addEventListener('DOMContentLoaded', init);
