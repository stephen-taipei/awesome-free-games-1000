# Game 232 - Conveyor Factory (傳送帶工廠)

A fast-paced arcade sorting game where items roll down from a conveyor belt and players must sort them into correct containers at the right timing.

## Game Features

- **Dynamic Gameplay**: Items continuously roll down the conveyor belt
- **Color Matching**: Sort items by matching them to the correct colored container
- **Progressive Difficulty**: Speed increases as you level up
- **Combo System**: Build combos for bonus points
- **Lives System**: Wrong sorting or dropped items cost lives
- **High Score Tracking**: Compete with your best scores

## Controls

- **Keyboard**: Press number keys 1-5 to sort items to corresponding containers
  - 1: Red Container
  - 2: Blue Container
  - 3: Green Container
  - 4: Yellow Container
  - 5: Purple Container
  - P/Esc: Pause game

- **Mouse/Touch**: Click on containers to sort items

## Game Mechanics

1. Items spawn from the top and move down the conveyor belt
2. When items are near the bottom (sorting zone), click the matching colored container
3. Correct sorting gives points and builds combo
4. Wrong sorting or dropped items lose a life
5. Every 20 items sorted increases the level and speed
6. Game ends when all lives are lost

## Scoring System

- Correct sort: 10 points × level
- Combo bonus: +5 points per combo (after first)
- Level up bonus: 50 points × new level

## Multi-language Support

The game supports the following languages:
- 繁體中文 (Traditional Chinese)
- 简体中文 (Simplified Chinese)
- English
- 日本語 (Japanese)
- 한국어 (Korean)

## Technical Details

- Built with TypeScript
- Canvas-based rendering
- Responsive design for mobile and desktop
- Local storage for high score persistence
- Touch and keyboard input support
- 60 FPS game loop

## Files Structure

```
game-232-conveyor-factory/
├── game.ts        # Core game logic
├── i18n.ts        # Multi-language translations
├── main.ts        # Main entry point and rendering
├── index.html     # HTML structure
├── styles.css     # Responsive styles
└── README.md      # This file
```

## Development

To run this game locally, ensure you have the shared utilities available:
- `../../../shared/analytics`
- `../../../shared/utils`
- `../../../shared/i18n`

## Credits

Game #232 - Awesome Free Games 1000 Collection
