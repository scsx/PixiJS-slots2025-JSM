import * as PIXI_NAMESPACE from 'pixi.js'
// Expose PIXI globally for broader compatibility, especially with non-module PixiJS plugins.
window.PIXI = PIXI_NAMESPACE

import { initSlotGame } from './scripts/slot/slotGame.js'

/**
 * Initializes the main PixiJS application instance.
 * Configures rendering dimensions, background, and anti-aliasing.
 */
const app = new PIXI_NAMESPACE.Application({
  width: 1280,
  height: 720,
  backgroundColor: '#0f3461',
  antialias: true // Smooths rendered graphics edges
})

// Attaches the PixiJS canvas to the designated game area in the DOM.
const gameArea = document.getElementById('game-area')
if (gameArea) {
  gameArea.appendChild(app.view)
} else {
  // Fallback if the specific game area element is not found.
  document.body.appendChild(app.view)
  console.error("Element with ID 'game-area' not found. Appending PixiJS view to body.")
}

/**
 * Stores the calculated center coordinates of the PixiJS canvas.
 * Useful for positioning game elements relative to the stage center.
 * @type {{x: number, y: number}}
 */
const canvasCenter = {
  x: app.renderer.width / 2,
  y: app.renderer.height / 2
}

/**
 * Asynchronous entry point for initializing the slot game module.
 * Ensures the PixiJS application and canvas dimensions are ready before game setup.
 * @param {PIXI_NAMESPACE.Application} app - The PixiJS application instance.
 * @param {{x: number, y: number}} canvasCenter - The canvas center coordinates.
 */
async function startApp() {
  await initSlotGame(app, canvasCenter) // Delegates game-specific initialization.
}

// Begin application setup.
startApp()
