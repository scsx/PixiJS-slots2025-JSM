import { Sprite, Text } from 'pixi.js'
import { explodeRocket } from './explodeRocket.js'
import { ManualFountain, initFountainEffect } from './fountainEffect.js'

// Global PixiJS references, injected during initialization.
let _app
let _canvasCenter

// Tracks active ManualFountain instances for global control (e.g., stopping all).
const activeManualFountains = new Set()

/**
 * Creates and manages a single firework animation (Fountain or Rocket type).
 * This internal function abstracts the specific firework implementation details.
 * @param {string} type - 'Fountain' or 'Rocket'.
 * @param {string} colour - Hexadecimal color code for the firework.
 * @param {number} duration - Animation duration in milliseconds.
 * @param {number} x - X-coordinate (relative to canvas center).
 * @param {number} y - Y-coordinate (relative to canvas center).
 * @param {number} velocityX - Horizontal velocity for rocket.
 * @param {number} velocityY - Vertical velocity for rocket.
 */
const createFirework = (type, colour, duration, x, y, velocityX, velocityY) => {
  if (!_app || !_canvasCenter) {
    console.error('PixiJS Application or canvasCenter not initialized for firework creation.')
    return
  }

  if (type === 'Fountain') {
    const newFountain = new ManualFountain(_app, colour, duration, x, y)
    activeManualFountains.add(newFountain)
  } else if (type === 'Rocket') {
    const rocket = Sprite.from('./assets/particle.png') // Assumes 'particle.png' is the rocket texture.
    rocket.tint = parseInt(colour, 16)
    // Position rockets relative to canvas center, adjusting for coordinate system.
    rocket.position.set(_canvasCenter.x - x, _canvasCenter.y - y)
    _app.stage.addChild(rocket)

    // Ticker loop for continuous rocket movement.
    const loopRocket = (delta) => {
      // Converts delta (from PixiJS ticker, usually ~1 for 60fps) to a time in ms.
      // Adjusting divisors (1000 for X, 100 for Y) to tune velocity scaling.
      const displacementX = (velocityX * delta) / 1000
      const displacementY = (velocityY * delta) / 100

      rocket.x += displacementX
      rocket.y += displacementY * -1 // -1 to move upwards on Y-axis.
    }
    _app.ticker.add(loopRocket)

    // Schedules rocket explosion and cleanup after its duration.
    setTimeout(() => {
      _app.stage.removeChild(rocket)
      _app.ticker.remove(loopRocket) // Critical for preventing memory leaks from orphaned ticker listeners.
      explodeRocket(_app, rocket.x, rocket.y, colour) // Triggers the explosion effect.
    }, duration)
  }
}

/**
 * Displays an on-screen error message for critical module failures.
 * Used as a fallback if XML loading or initialization fails.
 * @param {string} errorMessage - The error message to display.
 */
const showErrorText = (errorMessage) => {
  if (!_app) {
    console.error('PixiJS Application not initialized for error text.')
    return
  }
  const errorText = new Text(errorMessage, {
    fontFamily: 'Arial',
    fontSize: 30,
    fill: 'white',
    align: 'center'
  })

  errorText.x = _app.renderer.width / 2
  errorText.y = _app.renderer.height / 2
  errorText.anchor.set(0.5) // Centers the text's origin.

  _app.stage.addChild(errorText)
}

/**
 * Asynchronously initializes the Fireworks module.
 * Must be called once before triggering any firework sequences.
 * @param {PIXI.Application} appInstance - The main PixiJS application instance.
 * @param {object} canvasCenterInstance - An object with {x, y} coordinates of the canvas center.
 */
export async function initFireworks(appInstance, canvasCenterInstance) {
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  // Initializes the ManualFountain sub-module, primarily for texture loading.
  await initFountainEffect(_app, _canvasCenter)
  // console.log('Fireworks module and FountainEffect initialized.'); // Removed per request
}

/**
 * Fetches and processes fireworks data from fireworks.xml, then schedules each firework's creation.
 * This is the primary external function to call to start a firework display.
 */
export function triggerFireworksSequence() {
  if (!_app || !_canvasCenter) {
    console.error('Fireworks module not initialized. Call initFireworks() first.')
    return
  }

  fetch('./data/fireworks.xml')
    .then((response) => {
      if (!response.ok) {
        // Throws an error for HTTP issues (e.g., 404, 500).
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.text()
    })
    .then((xmlData) => {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlData, 'text/xml')
      const fireworkElements = xml.getElementsByTagName('Firework')

      // Clears any active fountains from previous sequences to prevent overlap.
      stopAllFireworks()

      for (let i = 0; i < fireworkElements.length; i++) {
        const firework = fireworkElements[i]
        // Parses attributes for firework type, timing, color, and position/velocity.
        const beginTime = parseInt(firework.getAttribute('begin'))
        const type = firework.getAttribute('type')
        const colour = firework.getAttribute('colour')
        const duration = parseInt(firework.getAttribute('duration'))
        const position = firework.getElementsByTagName('Position')[0]
        const x = parseFloat(position.getAttribute('x'))
        const y = parseFloat(position.getAttribute('y'))
        const velocityElement = firework.getElementsByTagName('Velocity')[0]
        let velocityX = 0
        let velocityY = 0
        if (velocityElement) {
          velocityX = parseFloat(velocityElement.getAttribute('x'))
          velocityY = parseFloat(velocityElement.getAttribute('y'))
        }

        // Schedules the creation of each firework.
        setTimeout(() => {
          createFirework(type, colour, duration, x, y, velocityX, velocityY)
        }, beginTime)
      }
    })
    .catch((error) => {
      // Displays an error if XML fetching or parsing fails.
      showErrorText(`Ocorreu um erro ao carregar os fogos de artifício: ${error.message}`)
      console.error('Error fetching XML file for fireworks:', error)
    })
}

/**
 * Stops and cleans up all active firework animations managed by this module,
 * particularly for active ManualFountain instances.
 */
export function stopAllFireworks() {
  // Destroys all active manual fountain instances and clears the tracking set.
  activeManualFountains.forEach((fountain) => fountain.destroy())
  activeManualFountains.clear()
  // Rockets are self-cleaning via setTimeout and ticker.remove, so no explicit stop needed here.
}
