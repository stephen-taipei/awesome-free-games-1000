# Game 233 - Space Walk (太空漫步)

A zero-gravity space exploration arcade game where players control an astronaut to survive, collect energy, and avoid obstacles.

## Game Features

### Core Mechanics
- **Zero Gravity Physics**: Momentum-based movement with realistic space physics
- **Oxygen System**: Depleting oxygen that must be replenished by collecting tanks
- **Score System**: Points awarded for collecting energy orbs and stars
- **Survival Mode**: The longer you survive, the harder it gets

### Collectibles
- **Energy Orbs (Blue)**: +10 points
- **Stars (Yellow)**: +50 points
- **Oxygen Tanks (Green)**: +30 oxygen

### Obstacles
- **Space Debris (Grey)**: Rotating angular fragments
- **Meteors (Brown)**: Dangerous space rocks with craters
- Collision damage: -20 oxygen
- Invulnerability period after hit: 1 second

### Controls
- **Keyboard**: Arrow keys or WASD to move in 4 directions
- **Mobile**: Touch D-pad buttons for directional control

### Game Progression
- Difficulty increases over time
- More obstacles spawn as game progresses
- Objects spawn from screen edges with random velocities
- Screen wrapping for astronaut and objects

### Visual Features
- Animated starfield background
- Particle effects for thrusters, collections, and explosions
- Pulsing energy orbs
- Rotating obstacles
- Oxygen bar indicator with color coding:
  - Green: >60%
  - Orange: 30-60%
  - Red: <30%

### Persistence
- High score saved to localStorage
- Survival time tracking

## Technical Implementation

### Files
- `game.ts` - Core game engine with physics and collision detection
- `i18n.ts` - Multi-language support (zh-TW, zh-CN, en, ja, ko)
- `main.ts` - Game initialization and UI management
- `index.html` - HTML structure with responsive layout
- `styles.css` - Styling with gradient backgrounds and animations

### Performance
- 60 FPS gameplay
- Efficient particle system
- Object pooling for collectibles and obstacles
- Canvas-based rendering

### Responsive Design
- Desktop: Keyboard controls
- Mobile: Touch D-pad interface
- Adaptive canvas sizing
- Modal instructions panel

## Game Balance
- Starting oxygen: 100%
- Oxygen decay: 0.1% per frame
- Maximum speed: 8 units
- Movement force: 0.3 units
- Friction: 0.98
- Spawn rate increases with difficulty

## Languages Supported
- Traditional Chinese (zh-TW)
- Simplified Chinese (zh-CN)
- English (en)
- Japanese (ja)
- Korean (ko)

Auto-detects browser language on first load.
