# Spacetime Curvature Simulator - Technical Implementation

This document describes the technical implementation details of the Spacetime Curvature Simulator, intended for developers who want to understand or contribute to the codebase.

## Project Structure

```
spacetime-curvature-simulator/
├── index.html           # Main HTML page with UI structure
├── styles.css           # CSS styles for UI components
├── js/
│   └── simulator.js     # Core simulation logic and Three.js implementation
├── README.md            # Project overview and usage instructions
├── concept.md           # Physics concepts explanation
└── IMPLEMENTATION.md    # This technical documentation
```

## Technology Stack

- **Three.js**: 3D visualization library
- **dat.GUI**: Interface controls for simulation parameters
- **HTML5/CSS3**: Structure and styling
- **Vanilla JavaScript**: Core simulation logic

## Core Modules

### 1. Scene Setup

The scene is built using Three.js with the following components:

```javascript
function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    
    // Enhanced lighting setup with ambient and directional lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    
    // Add lights to scene
    // Handle window resize
}
```

### 2. Spacetime Grid Representation

The spacetime grid is implemented as a highly segmented plane geometry that can deform to visualize spacetime curvature:

```javascript
function createGrid() {
    const wireframeGeometry = new THREE.PlaneGeometry(
        GRID_SIZE, 
        GRID_SIZE, 
        GRID_SEGMENTS, 
        GRID_SEGMENTS
    );
    
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: false,
        opacity: 1.0
    });
    
    gridMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    gridMesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
    scene.add(gridMesh);
}
```

### 3. Mass Objects Implementation

Masses are represented by spheres with size proportional to their mass value (using cube root scaling for more intuitive visualization):

```javascript
function createSpheres() {
    masses.forEach((mass, index) => {
        const sphereGeometry = new THREE.SphereGeometry(
            Math.cbrt(mass.mass) * 0.15, 
            32, 
            32
        );
        
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
```

### 4. Spacetime Deformation Algorithm

The core physics simulation is implemented in the `deformGrid()` function, which calculates how each point on the grid should be displaced based on the gravitational influence of each mass:

```javascript
function deformGrid() {
    // Get grid geometry vertices
    const positions = gridMesh.geometry.attributes.position;
    
    // For each vertex in the grid
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        let y = 0;
        
        // Calculate displacement from each mass
        masses.forEach(mass => {
            const dx = x - mass.x;
            const dz = z - mass.z;
            const distance2 = dx * dx + dz * dz + EPSILON;
            
            // Calculate displacement using inverse-square relationship
            const displacement = -GRAVITY_STRENGTH * mass.mass / distance2;
            y += displacement;
        });
        
        // Update vertex position
        positions.setY(i, y);
    }
    
    // Tell Three.js to update the geometry
    positions.needsUpdate = true;
}
```

This algorithm:
1. Accesses the vertex positions of the grid mesh
2. For each vertex, calculates its displacement based on all masses
3. Uses an inverse-square relationship (like gravitational force)
4. Adds a small epsilon value to prevent division by zero
5. Updates the grid geometry with new vertex positions

### 5. Gravity Simulation

The gravity simulation creates a simplified orbital motion for the mass objects:

```javascript
function simulateGravity() {
    const time = Date.now() * 0.001;
    
    masses.forEach((mass, index) => {
        // Different radius and speed for each sphere
        const radius = 2 + index * 2;
        const speed = 0.5 - index * 0.1;
        
        // Circular orbital motion
        mass.x = radius * Math.cos(time * speed);
        mass.z = radius * Math.sin(time * speed);
        
        // Update sphere position
        updateSpherePosition(index);
    });
}
```

### 6. Light Path Visualization

The light path visualization demonstrates gravitational lensing by showing how light rays bend around massive objects:

```javascript
function createLightPaths() {
    // Create light paths around the perimeter
    for (let i = 0; i < LIGHT_PATH_COUNT; i++) {
        const angle = (i / LIGHT_PATH_COUNT) * Math.PI * 2;
        const startX = Math.cos(angle) * (GRID_SIZE / 2 - 1);
        const startZ = Math.sin(angle) * (GRID_SIZE / 2 - 1);
        
        // Create path geometry
        const points = [];
        for (let j = 0; j < LIGHT_PATH_POINTS; j++) {
            // Linearly interpolate across the grid
            const t = j / (LIGHT_PATH_POINTS - 1);
            const pathX = startX * (1 - t) + -startX * t;
            const pathZ = startZ * (1 - t) + -startZ * t;
            
            // Calculate y-position (height) based on spacetime curvature
            // Similar to deformGrid logic
            let y = 0;
            masses.forEach(mass => {
                const dx = pathX - mass.x;
                const dz = pathZ - mass.z;
                const distance2 = dx * dx + dz * dz + EPSILON;
                const displacement = -GRAVITY_STRENGTH * mass.mass / distance2;
                y += displacement;
            });
            
            // Add point to path (with slight elevation)
            points.push(new THREE.Vector3(pathX, y + 0.1, pathZ));
        }
        
        // Create visible line for the path
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        lightPaths.push(line);
    }
}
```

## User Interface Implementation

The UI is implemented using dat.GUI for controls and HTML/CSS for informational elements:

```javascript
function setupGUI() {
    gui = new dat.GUI();
    
    // Create folders for each mass
    masses.forEach((mass, index) => {
        const folder = gui.addFolder(`Mass ${index + 1}`);
        
        // Add mass value controller
        folder.add(mass, 'mass', 1, 100).name('Mass Value').onChange(() => {
            updateSphereSize(index);
            deformGrid();
            updateLightPaths();
        });
        
        // Add position controllers
        folder.add(mass, 'x', -10, 10).name('X Position').onChange(() => {
            updateSpherePosition(index);
            deformGrid();
            updateLightPaths();
        });
        
        folder.add(mass, 'z', -10, 10).name('Z Position').onChange(() => {
            updateSpherePosition(index);
            deformGrid();
            updateLightPaths();
        });
        
        folder.open();
    });
}
```

## Physics Simplifications

For educational and performance purposes, this simulator uses several simplifications:

1. **2D vs 4D Spacetime**: Real spacetime is 4-dimensional, but we visualize using a 2D grid in 3D space
2. **Simplified Gravity Formula**: The displacement calculation uses an inverse-square relationship that approximates gravitational effects visually but is not a complete implementation of Einstein's field equations
3. **Simplified Orbital Motion**: Objects follow predetermined circular paths rather than being dynamically calculated based on the spacetime curvature
4. **No Relativistic Effects**: Time dilation and length contraction are not modeled

## Performance Optimizations

The most performance-intensive aspects have been optimized:

1. **Efficient Grid Updates**: Grid deformation calculations only run when parameters change or during gravity simulation
2. **Optimized Distance Calculations**: Squared distances are used to avoid expensive square root operations
3. **Appropriate Grid Density**: The segment count is balanced for visual quality and performance

## Future Development Considerations

1. **WebGL Shaders**: Move deformation calculations to GPU using vertex shaders
2. **Physics Accuracy**: Implement more accurate gravitational equations
3. **Dynamic Orbital Paths**: Calculate object trajectories based on spacetime curvature
4. **Educational Elements**: Add more explanatory overlays and guided tutorials 