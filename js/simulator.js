// Constants and configuration
const GRID_SIZE = 30;
const GRID_SEGMENTS = 30;
const GRAVITY_STRENGTH = 5.0;
const EPSILON = 0.5;
const LIGHT_PATH_COUNT = 20;
const LIGHT_PATH_POINTS = 100;

// Three.js global variables
let scene, camera, renderer, controls;
let gridMesh, wireframeMesh;
let spheres = [];
let lightPaths = [];

// Simulation state
let gravityActive = false;
let lightPathsActive = false;
let masses = [
    { x: -3, y: 1, z: -3, mass: 92, color: 0xff6600, offsetX: 0, offsetZ: 0 }, // Orange
    { x: 3, y: 1, z: 3, mass: 29, color: 0x00ff00, offsetX: 0, offsetZ: 0 },   // Green
    { x: 0, y: 1, z: 0, mass: 10, color: 0xff0000, offsetX: 0, offsetZ: 0 }    // Red
];

// GUI controller
let gui;

// DOM elements
let startGravityBtn, resetSimulationBtn, statusText, toggleEducationBtn, educationOverlay, toggleLightPathsBtn;

// Initialize the application
function init() {
    // Get DOM elements
    startGravityBtn = document.getElementById('startGravity');
    resetSimulationBtn = document.getElementById('resetSimulation');
    statusText = document.getElementById('status');
    toggleEducationBtn = document.getElementById('toggleEducation');
    educationOverlay = document.getElementById('education-overlay');
    toggleLightPathsBtn = document.getElementById('toggleLightPaths');

    // Set up event listeners
    startGravityBtn.addEventListener('click', toggleGravity);
    resetSimulationBtn.addEventListener('click', resetSimulation);
    toggleEducationBtn.addEventListener('click', toggleEducation);
    toggleLightPathsBtn.addEventListener('click', toggleLightPaths);

    // Set up Three.js scene
    setupScene();
    
    // Create the spacetime grid
    createGrid();
    
    // Create the mass spheres
    createSpheres();
    
    // Set up GUI controls
    setupGUI();
    
    // Initial grid deformation
    deformGrid();
    
    // Start the animation loop
    animate();
}

// Set up the Three.js scene, camera, renderer, and controls
function setupScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create camera with better viewing angle
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // Set up orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    
    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 5, -7);
    scene.add(fillLight);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Create the spacetime grid
function createGrid() {
    const wireframeGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SEGMENTS, GRID_SEGMENTS);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: false,
        opacity: 1.0
    });
    
    gridMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    gridMesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
    scene.add(gridMesh);
    
    wireframeMesh = gridMesh;
}

// Create spheres representing masses
function createSpheres() {
    masses.forEach((mass, index) => {
        const sphereGeometry = new THREE.SphereGeometry(Math.cbrt(mass.mass) * 0.15, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: mass.color,
            shininess: 80,
            specular: 0x666666,
            emissive: mass.color,
            emissiveIntensity: 0.2
        });
        
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(mass.x, mass.y, mass.z);
        sphere.userData.index = index;
        
        scene.add(sphere);
        spheres.push(sphere);
    });
}

// Set up GUI controls
function setupGUI() {
    gui = new dat.GUI();
    
    const massFolders = [];
    const sphereNames = ['Orange', 'Green', 'Red'];
    
    masses.forEach((mass, index) => {
        const folder = gui.addFolder(`${sphereNames[index]} Sphere`);
        
        // Mass control
        folder.add(mass, 'mass', 0, 100)
            .name('Mass')
            .onChange(() => {
                updateSphereSize(index);
                deformGrid();
                updateEducationalHighlights();
            });
        
        // X Position control - now updates offsetX
        folder.add(mass, 'x', -10, 10)
            .name('X Position')
            .onChange(() => {
                // Store the offset when user changes position
                if (gravityActive) {
                    const time = Date.now() * 0.001;
                    const radius = 2 + index * 2;
                    const speed = 0.5 - index * 0.1;
                    const simulatedX = radius * Math.cos(time * speed);
                    mass.offsetX = mass.x - simulatedX;
                }
                updateSpherePosition(index);
                deformGrid();
                updateEducationalHighlights();
            });
        
        // Z Position control - now updates offsetZ
        folder.add(mass, 'z', -10, 10)
            .name('Z Position')
            .onChange(() => {
                // Store the offset when user changes position
                if (gravityActive) {
                    const time = Date.now() * 0.001;
                    const radius = 2 + index * 2;
                    const speed = 0.5 - index * 0.1;
                    const simulatedZ = radius * Math.sin(time * speed);
                    mass.offsetZ = mass.z - simulatedZ;
                }
                updateSpherePosition(index);
                deformGrid();
                updateEducationalHighlights();
            });
        
        folder.open();
        massFolders.push(folder);
    });
}

// Update sphere size based on mass
function updateSphereSize(index) {
    const mass = masses[index];
    const sphere = spheres[index];
    
    // Remove old sphere
    scene.remove(sphere);
    
    // Create new sphere with updated size
    const sphereGeometry = new THREE.SphereGeometry(Math.cbrt(mass.mass) * 0.15, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
        color: mass.color,
        shininess: 80,
        specular: 0x666666,
        emissive: mass.color,
        emissiveIntensity: 0.2
    });
    
    const newSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    newSphere.position.set(mass.x, mass.y, mass.z);
    newSphere.userData.index = index;
    
    scene.add(newSphere);
    spheres[index] = newSphere;
}

// Update sphere position
function updateSpherePosition(index) {
    const mass = masses[index];
    const sphere = spheres[index];
    
    // Keep y position constant at 1 (above the grid)
    sphere.position.set(mass.x, 1, mass.z);
    
    // Update mass object to match
    mass.y = 1;
}

// Deform the grid based on masses
function deformGrid() {
    const positions = gridMesh.geometry.attributes.position;
    
    // Reset grid rotation to horizontal
    gridMesh.rotation.x = -Math.PI / 2;
    
    for (let i = 0; i < positions.count; i++) {
        const localX = positions.getX(i);
        const localY = positions.getY(i);
        
        // Calculate the original z position (which is 0 for a flat grid)
        let displacement = 0;
        
        // Apply gravitational deformation from each mass
        masses.forEach(mass => {
            // Calculate distance between grid point and mass in world coordinates
            const dx = localX - mass.x;
            const dy = 0 - mass.y; // Grid's world Y is always 0 before deformation
            const dz = (-localY) - mass.z; // Grid's world Z is -localY
            
            // Calculate squared distance (adding epsilon to avoid division by zero)
            const distance2 = dx * dx + dy * dy + dz * dz + EPSILON;
            
            // Calculate displacement using inverse square law
            const massEffect = -GRAVITY_STRENGTH * mass.mass / distance2;
            
            // Add the effect of this mass to total displacement
            displacement += Math.max(massEffect, -3.0); // Limit maximum deformation
        });
        
        // Update the z position (which creates vertical deformation in world space)
        positions.setZ(i, displacement);
    }
    
    // Update the geometry
    positions.needsUpdate = true;
    gridMesh.geometry.computeVertexNormals();
}

// Toggle gravity simulation
function toggleGravity() {
    gravityActive = !gravityActive;
    
    if (gravityActive) {
        // Store current positions as offsets when starting gravity
        masses.forEach((mass, index) => {
            const time = Date.now() * 0.001;
            const radius = 2 + index * 2;
            const speed = 0.5 - index * 0.1;
            
            const baseX = radius * Math.cos(time * speed);
            const baseZ = radius * Math.sin(time * speed);
            
            mass.offsetX = mass.x - baseX;
            mass.offsetZ = mass.z - baseZ;
        });
        
        startGravityBtn.textContent = "Pause Gravity";
        statusText.textContent = "Gravity simulation active";
    } else {
        startGravityBtn.textContent = "Start Gravity";
        statusText.textContent = "Gravity simulation paused";
    }
    
    updateEducationalHighlights();
}

// Reset the simulation
function resetSimulation() {
    // Reset masses to default positions and clear offsets
    masses[0].x = -3;
    masses[0].y = 1;
    masses[0].z = -3;
    masses[0].offsetX = 0;
    masses[0].offsetZ = 0;
    
    masses[1].x = 3;
    masses[1].y = 1;
    masses[1].z = 3;
    masses[1].offsetX = 0;
    masses[1].offsetZ = 0;
    
    masses[2].x = 0;
    masses[2].y = 1;
    masses[2].z = 0;
    masses[2].offsetX = 0;
    masses[2].offsetZ = 0;
    
    // Update sphere positions and GUI
    masses.forEach((mass, index) => {
        updateSpherePosition(index);
    });
    
    // Reset the GUI controllers
    for (let folder of Object.values(gui.__folders)) {
        for (let controller of folder.__controllers) {
            controller.updateDisplay();
        }
    }
    
    // Reset grid
    deformGrid();
    
    // Reset gravity state
    gravityActive = false;
    startGravityBtn.textContent = "Start Gravity";
    statusText.textContent = "Gravity simulation paused";
    
    // Reset light paths if active
    if (lightPathsActive) {
        // Turn off light paths
        lightPathsActive = false;
        toggleLightPathsBtn.textContent = "Show Light Paths";
        removeLightPaths();
    }
    
    // Update educational highlights
    updateEducationalHighlights();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    
    // If gravity is active, update positions
    if (gravityActive) {
        simulateGravity();
        deformGrid();
    }
    
    // Update light paths if active
    if (lightPathsActive) {
        updateLightPaths();
    }
    
    renderer.render(scene, camera);
}

// Simulate gravity effects
function simulateGravity() {
    const time = Date.now() * 0.001;
    
    masses.forEach((mass, index) => {
        // Different radius and speed for each sphere
        const radius = 2 + index * 2;
        const speed = 0.5 - index * 0.1;
        
        // Calculate base orbital position
        const baseX = radius * Math.cos(time * speed);
        const baseZ = radius * Math.sin(time * speed);
        
        // Apply user's position offset
        mass.x = baseX + mass.offsetX;
        mass.z = baseZ + mass.offsetZ;
        mass.y = 1; // Keep height constant
        
        // Update sphere position
        updateSpherePosition(index);
    });
}

// Toggle educational overlay
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

// Highlight relevant tooltips based on simulation state
function highlightRelevantTooltips() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => tooltip.classList.remove('highlight'));
    
    if (gravityActive) {
        // Highlight orbital motion tooltip when gravity is active
        document.querySelector('[data-target="gravity-simulation"]').classList.add('highlight');
    }
    
    if (lightPathsActive) {
        // Highlight light paths tooltip when feature is active
        document.querySelector('[data-target="light-paths"]').classList.add('highlight');
    }
    
    // Find the most massive sphere and highlight its tooltip
    const maxMass = Math.max(...masses.map(m => m.mass));
    if (maxMass > 50) {
        document.querySelector('[data-target="grid-deformation"]').classList.add('highlight');
    }
    
    // Highlight mass controls tooltip when GUI is open
    if (gui && !gui.closed) {
        document.querySelector('[data-target="mass-controls"]').classList.add('highlight');
    }
}

// Remove all tooltip highlights
function removeTooltipHighlights() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => tooltip.classList.remove('highlight'));
}

// Update tooltip highlights when simulation state changes
function updateEducationalHighlights() {
    if (!educationOverlay.classList.contains('hidden')) {
        highlightRelevantTooltips();
    }
}

// Toggle light paths
function toggleLightPaths() {
    lightPathsActive = !lightPathsActive;
    
    if (lightPathsActive) {
        toggleLightPathsBtn.textContent = "Hide Light Paths";
        statusText.textContent = "Light paths visualization active";
        createLightPaths();
        
        // Highlight the light paths tooltip if educational overlay is visible
        if (!educationOverlay.classList.contains('hidden')) {
            document.querySelector('[data-target="light-paths"]').classList.add('highlight');
        }
    } else {
        toggleLightPathsBtn.textContent = "Show Light Paths";
        statusText.textContent = gravityActive ? "Gravity simulation active" : "Gravity simulation paused";
        removeLightPaths();
        
        // Remove highlight if educational overlay is visible
        if (!educationOverlay.classList.contains('hidden')) {
            document.querySelector('[data-target="light-paths"]').classList.remove('highlight');
        }
    }
}

// Create light paths
function createLightPaths() {
    // Remove any existing light paths
    removeLightPaths();
    
    // Create new light paths
    for (let i = 0; i < LIGHT_PATH_COUNT; i++) {
        // Calculate starting position in a circle around the scene
        const angle = (i / LIGHT_PATH_COUNT) * Math.PI * 2;
        const radius = GRID_SIZE / 2 - 2; // Slightly inside the grid edge
        const startX = radius * Math.cos(angle);
        const startZ = radius * Math.sin(angle);
        
        // Create a light path as a line geometry
        const points = [];
        const material = new THREE.LineBasicMaterial({ 
            color: 0xffff00, 
            transparent: true,
            opacity: 0.8
        });
        
        // Calculate the light path
        for (let j = 0; j < LIGHT_PATH_POINTS; j++) {
            // Linearly interpolate position across the scene
            // We'll replace this with proper path calculation in updateLightPaths
            const t = j / (LIGHT_PATH_POINTS - 1);
            const x = startX * (1 - t) + (-startX) * t;
            const y = 0.5; // Slightly above the grid
            const z = startZ * (1 - t) + (-startZ) * t;
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        lightPaths.push(line);
    }
    
    // Immediately update the paths to show proper bending
    updateLightPaths();
}

// Remove light paths
function removeLightPaths() {
    // Remove all existing light paths from the scene
    for (let path of lightPaths) {
        scene.remove(path);
    }
    lightPaths = [];
}

// Update light paths based on mass distribution
function updateLightPaths() {
    if (!lightPathsActive || lightPaths.length === 0) return;
    
    for (let i = 0; i < lightPaths.length; i++) {
        const path = lightPaths[i];
        const angle = (i / LIGHT_PATH_COUNT) * Math.PI * 2;
        const radius = GRID_SIZE / 2 - 2;
        const startX = radius * Math.cos(angle);
        const startZ = radius * Math.sin(angle);
        
        // Create new points array
        const points = [];
        
        // Trace the light path considering spacetime curvature
        let x = startX;
        let z = startZ;
        let dirX = -startX * 2; // Direction vector pointing across the grid
        let dirZ = -startZ * 2;
        
        // Normalize direction vector
        const dirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
        dirX /= dirLength;
        dirZ /= dirLength;
        
        for (let j = 0; j < LIGHT_PATH_POINTS; j++) {
            // Add current position to points
            points.push(new THREE.Vector3(x, 0.5, z));
            
            // Calculate gravitational effects from masses
            let forceX = 0;
            let forceZ = 0;
            
            for (const mass of masses) {
                // Vector from point to mass
                const dx = mass.x - x;
                const dz = mass.z - z;
                
                // Distance squared (with epsilon to avoid division by zero)
                const distSquared = dx * dx + dz * dz + EPSILON;
                const dist = Math.sqrt(distSquared);
                
                // Calculate gravitational force (proportional to mass and inverse square of distance)
                const forceMagnitude = mass.mass / distSquared * 0.03;
                
                // Add to total force (normalized by distance)
                forceX += dx / dist * forceMagnitude;
                forceZ += dz / dist * forceMagnitude;
            }
            
            // Update direction based on gravitational forces
            dirX += forceX;
            dirZ += forceZ;
            
            // Re-normalize direction
            const newDirLength = Math.sqrt(dirX * dirX + dirZ * dirZ);
            dirX /= newDirLength;
            dirZ /= newDirLength;
            
            // Move to next position (smaller step size for accuracy)
            const stepSize = 0.2;
            x += dirX * stepSize;
            z += dirZ * stepSize;
            
            // Stop if we're outside the grid
            if (Math.abs(x) > GRID_SIZE/2 || Math.abs(z) > GRID_SIZE/2) {
                break;
            }
        }
        
        // Update the line geometry
        path.geometry.dispose();
        path.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
}

// Initialize the application when DOM content is loaded
window.addEventListener('DOMContentLoaded', init); 