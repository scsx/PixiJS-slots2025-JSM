// index.js

// Import the Application class from PixiJS.
// IMPORTANT: For PixiJS v7+ and ES Modules, it's recommended to import components this way,
// instead of relying on the global PIXI object (e.g., PIXI.Application, PIXI.Sprite).
import { Application } from 'pixi.js'

// Import the main function for the fireworks animations.
// This module will be called to trigger the fireworks animation upon a win.
// REMINDER FOR DEVELOPER: This import and the direct call to `runFireworksLoop` below
// will be removed once the main slots game logic is fully implemented,
// and the fireworks animation should only be triggered as part of a win condition.
import { runFireworksLoop } from './scripts/fireworks.js'

// --- PixiJS Application Setup ---

/**
 * Creates the main PixiJS application instance.
 * This application manages the rendering canvas, the game loop (ticker),
 * and the visual hierarchy (stage).
 * @type {PIXI.Application}
 */
const app = new Application({
  width: 1280, // Width of the rendering area for the game
  height: 720, // Height of the rendering area for the game
  backgroundColor: 0x000000, // Background color of the canvas (black)
  antialias: true, // Enables anti-aliasing for smoother edges of rendered graphics
  resolution: window.devicePixelRatio || 1, // Adjusts resolution for high-DPI (retina) screens
  autoDensity: true // PixiJS automatically adjusts the CSS size of the canvas based on its resolution
})

// Append the PixiJS canvas to the main document body.
// The canvas will be the primary element where your game content is drawn.
document.body.appendChild(app.view)

/**
 * Calculates and stores the center coordinates of the PixiJS canvas.
 * This is often useful for positioning elements centrally on the screen.
 * @type {{x: number, y: number}}
 */
const canvasCenter = {
  x: app.renderer.width / 2,
  y: app.renderer.height / 2
}

// ------------------------------------------------------------------------------------
// MAIN ENTRY POINT FOR CURRENT DEMO:
// INITIAL CALL TO FIREWORKS.
// ------------------------------------------------------------------------------------

// TEMPORARY CALL: Currently, we are calling the fireworks function directly to test its modularization.
// DEVELOPER INSTRUCTION: WHEN STARTING TO IMPLEMENT THE SLOTS GAME, REMOVE THIS DIRECT CALL.
// The `runFireworksLoop` function should ONLY be called when a player wins in the slots game.
/**
 * Initiates the fireworks animation sequence.
 * Passes the PixiJS application instance and the canvas center to the fireworks module.
 * @param {PIXI.Application} app - The PixiJS application instance.
 * @param {{x: number, y: number}} canvasCenter - The canvas center coordinates.
 */
runFireworksLoop(app, canvasCenter)

// ------------------------------------------------------------------------------------
// FUTURE DEVELOPMENT AREA: SLOTS GAME LOGIC
// ------------------------------------------------------------------------------------

// THIS IS WHERE ALL THE MAIN LOGIC FOR YOUR SLOTS GAME WILL BE ADDED.
// For example, this section will include:
// - Loading of slot symbol assets.
// - Creation of reels and individual symbols.
// - Logic for spinning and stopping the reels.
// - Checking for winning lines/combinations.
// - Handling UI interactions (e.g., the "Spin" button).
// - Integrating the `runFireworksLoop` animation ONLY AFTER a win condition is met.
