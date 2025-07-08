import * as PIXI_NAMESPACE from 'pixi.js'
window.PIXI = PIXI_NAMESPACE

import { initSlotGame } from './scripts/slot/slotGame.js'

// --- PixiJS Application Setup ---

/**
 * Creates the main PixiJS application instance using the imported Application class.
 * @type {Application}
 */
const app = new PIXI_NAMESPACE.Application({
  width: 1280, // Width of the rendering area for the game
  height: 720, // Height of the rendering area for the game
  backgroundColor: '#0f3461',
  antialias: true // Enables anti-aliasing for smoother edges of rendered graphics
})

// Find the game container in the HTML and append the PixiJS canvas to it.
const gameArea = document.getElementById('game-area')
if (gameArea) {
  gameArea.appendChild(app.view)
} else {
  document.body.appendChild(app.view)
  console.warn("Element with ID 'game-area' not found. Appending PixiJS view to body.")
}

/**
 * Calculates and stores the center coordinates of the PixiJS canvas.
 * @type {{x: number, y: number}}
 */
const canvasCenter = {
  x: app.renderer.width / 2,
  y: app.renderer.height / 2
}

// ------------------------------------------------------------------------------------
// MAIN ENTRY POINT FOR THE SLOTS GAME:
// Initializes the slot game module.
// ------------------------------------------------------------------------------------

/**
 * Initializes the slot game by calling its main setup function.
 * @param {Application} app - The PixiJS application instance.
 * @param {{x: number, y: number}} canvasCenter - The canvas center coordinates.
 */
async function startApp() {
  await initSlotGame(app, canvasCenter) // initSlotGame is internally async.
}

startApp()
