# Spacetime Curvature Simulator

![Spacetime Curvature Visualization](screenshot.png) <!-- TODO: Add screenshot image -->

## Overview
An interactive web-based visualization demonstrating Einstein's General Theory of Relativity concepts. This simulator allows users to observe and interact with how mass curves spacetime, creating what we experience as gravity.

## Key Features
- Interactive 3D visualization of spacetime curvature
- Three configurable masses with adjustable properties
- Real-time deformation of the spacetime grid
- Gravity simulation showing orbital motion
- Light path visualization demonstrating gravitational lensing
- Educational tooltips explaining key physics concepts

## Physics Concepts Demonstrated
- Spacetime as a fabric that can be curved
- Mass-energy relationship to spacetime curvature
- Gravity as geometry rather than force
- Objects following geodesics through curved spacetime
- Gravitational lensing of light paths

## Technologies Used
- Three.js - JavaScript 3D library
- dat.GUI - Controller library for GUI elements
- HTML5/CSS3 for structure and styling
- Vanilla JavaScript for simulation logic

## Live Demo
[View the Live Demo](#) <!-- TODO: Add live demo link -->

## Usage Instructions
1. **Navigation:**
   - Drag to rotate the view
   - Scroll to zoom in/out
   - Right-click and drag to pan

2. **Controls:**
   - Use GUI sliders to adjust each sphere's mass and position
   - "Start Gravity" toggles orbital motion simulation
   - "Reset Simulation" returns to default configuration
   - "Show Light Paths" toggles gravitational lensing visualization
   - "Show Explanations" displays educational overlay

## Setup and Installation
1. Clone this repository:
   ```
   git clone https://github.com/yourusername/spacetime-curvature-simulator.git
   ```
2. Open `index.html` in any modern web browser
3. No build process or dependencies to install - just plain HTML, CSS, and JavaScript

## Project Structure
```
spacetime-curvature-simulator/
├── index.html           # Main HTML page
├── styles.css           # CSS styles
├── js/
│   └── simulator.js     # Main simulation code
├── README.md            # This file
├── IMPLEMENTATION.md    # Technical implementation details
└── concept.md           # Physics concepts explanation
```

## Limitations
This simulator uses simplified physics for educational visualization rather than precise scientific calculation. The grid deformation approximates gravitational effects but does not implement Einstein's full field equations.

## Future Enhancements
- More accurate physics calculations
- Additional visualization modes
- Mobile device optimization
- Interactive tutorials

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
[MIT License](LICENSE) <!-- TODO: Add license file -->

## Acknowledgments
- Inspired by PBS Space Time and other educational physics visualizations
- Built with [Three.js](https://threejs.org/) 