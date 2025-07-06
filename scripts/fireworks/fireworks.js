import { fountainConfig } from './emitterConfigs.js'
import { explodeRocket } from './explodeRocket.js'
import { ParticleExample } from './ParticleExampleCustom.js' // Assuming ParticleExample is exported from here.

// Import PixiJS components required for fireworks animations.
// Using named imports is the recommended practice for PixiJS v7+ with ES Modules.
import { Sprite, Text } from 'pixi.js'

// Global variables to store the PixiJS Application instance and canvas center.
// These will be passed to `runFireworksLoop` from the main application file (index.js).
let _app
let _canvasCenter

// Canvas size options used by the fireworks demo's UI.
// This logic is specific to the original fireworks demonstration.
const sizeOptions = [
  { width: 1280, height: 720 }, // Option 1: Standard HD
  { width: 1024, height: 768 } // Option 2: Common tablet resolution
]

/**
 * Applies a selected canvas size based on user input (radio buttons).
 * This function is part of the original fireworks demo's UI control.
 */
const applyCanvasSize = () => {
  // Ensure the PixiJS application instance is available before attempting to resize.
  if (!_app) {
    console.error('PixiJS Application not initialized for canvas resizing.')
    return
  }
  const selectedOption = document.querySelector('input[name="canvasSize"]:checked')
  if (selectedOption) {
    const index = parseInt(selectedOption.value, 10)
    const { width, height } = sizeOptions[index]
    _app.renderer.resize(width, height) // Resize the PixiJS renderer to new dimensions
    // Update the cached canvas center coordinates after resizing.
    _canvasCenter.x = _app.renderer.width / 2
    _canvasCenter.y = _app.renderer.height / 2
  }
}

/**
 * Updates the FPS (Frames Per Second) display on the HTML element.
 * This function is used to monitor performance of the animation.
 */
const updateFPS = () => {
  // Ensure the PixiJS application instance is available.
  if (!_app) return
  // Get the FPS display HTML element. This element is expected to be in index.html.
  const fpsDisplay = document.getElementById('fpsDisplay')
  if (fpsDisplay) {
    const fps = _app.ticker.FPS.toFixed(2) // Get current FPS and format to 2 decimal places.
    fpsDisplay.textContent = `FPS: ${fps}` // Update the text content.
  }
}

/**
 * Creates and manages a single firework animation (either Fountain or Rocket).
 * @param {string} type - Type of firework ('Fountain' or 'Rocket').
 * @param {string} colour - Hexadecimal color code for the firework.
 * @param {number} duration - Duration of the firework animation in milliseconds.
 * @param {number} x - X-coordinate for the firework's starting position (relative to canvas center).
 * @param {number} y - Y-coordinate for the firework's starting position (relative to canvas center).
 * @param {number} velocityX - Horizontal velocity for rocket type.
 * @param {number} velocityY - Vertical velocity for rocket type.
 */
const createFirework = (type, colour, duration, x, y, velocityX, velocityY) => {
  // Ensure PixiJS app and canvas center are initialized.
  if (!_app || !_canvasCenter) {
    console.error('PixiJS Application or canvasCenter not initialized for firework creation.')
    return
  }

  // Handle 'Fountain' type firework.
  if (type === 'Fountain') {
    // Adjust fountain particle color based on the provided colour.
    fountainConfig.behaviors[3].config.color.list[1].value = colour

    // Instantiate a new particle emitter for the fountain.
    new ParticleExample(
      _app, // Pass the PixiJS application instance.
      ['assets/fountain.png'], // Texture for the fountain particles.
      fountainConfig, // Configuration for the emitter.
      _canvasCenter.x - x, // Adjust X position relative to canvas center.
      _canvasCenter.y - y, // Adjust Y position relative to canvas center.
      duration // Duration of the fountain effect.
    )

    // Handle 'Rocket' type firework.
  } else if (type === 'Rocket') {
    let rocket
    // Create a sprite for the rocket using the imported Sprite class.
    rocket = Sprite.from('./assets/particle.png')
    rocket.tint = parseInt(colour, 16) // Set rocket color.
    rocket.position.set(_canvasCenter.x - x, _canvasCenter.y - y) // Set initial position.
    _app.stage.addChild(rocket) // Add rocket to the PixiJS stage.

    // Animate the rocket's movement using the PixiJS ticker.
    _app.ticker.add((delta) => loopRocket(delta))

    const loopRocket = (delta) => {
      // Calculate displacement based on velocity and delta time for smooth movement.
      const displacementX = (velocityX * delta) / 1000
      const displacementY = (velocityY * delta) / 100 // Adjusted for visual effect.

      // Update rocket's position.
      rocket.x += displacementX
      rocket.y += displacementY * -1 // Y-axis is inverted in PixiJS (positive is down).
    }

    // Schedule the rocket explosion after its duration.
    setTimeout(() => {
      _app.stage.removeChild(rocket) // Remove rocket sprite from stage.
      explodeRocket(_app, rocket.x, rocket.y, colour) // Call explosion function.
    }, duration)
  }
}

/**
 * Displays an error message as a PixiJS Text object on the stage.
 * @param {string} errorMessage - The error message to display.
 */
const showErrorText = (errorMessage) => {
  // Ensure the PixiJS application instance is available.
  if (!_app) {
    console.error('PixiJS Application not initialized for error text.')
    return
  }
  // Create a new PixiJS Text object using the imported Text class.
  const errorText = new Text(errorMessage, {
    fontFamily: 'Arial',
    fontSize: 30,
    fill: 'white',
    align: 'center'
  })

  // Center the error text on the screen.
  errorText.x = _app.renderer.width / 2
  errorText.y = _app.renderer.height / 2
  errorText.anchor.set(0.5) // Set anchor to center for perfect centering.

  _app.stage.addChild(errorText) // Add error text to the stage.
}

/**
 * Main function to run the fireworks animation sequence.
 * This function fetches fireworks data from an XML file and schedules their creation.
 * It also sets up UI listeners related to the fireworks demo.
 * @param {PIXI.Application} appInstance - The main PixiJS application instance.
 * @param {object} canvasCenterInstance - An object with {x, y} coordinates of the canvas center.
 */
export function runFireworksLoop(appInstance, canvasCenterInstance) {
  _app = appInstance // Store the PixiJS application instance.
  _canvasCenter = canvasCenterInstance // Store the canvas center coordinates.

  // Add the FPS update listener to the PixiJS ticker.
  // This will update the FPS display every frame.
  _app.ticker.add(updateFPS)

  // Add event listener for the 'Apply Size' button from the original demo's HTML.
  const applySizeBtn = document.getElementById('applySizeBtn')
  if (applySizeBtn) {
    // Check if the button element exists in the HTML.
    applySizeBtn.addEventListener('click', applyCanvasSize)
  }

  // Fetch the fireworks configuration from the XML file.
  // The path is relative to the HTML file that loads index.js.
  fetch('./data/fireworks.xml')
    .then((response) => response.text()) // Parse the response as plain text (XML).
    .then((xmlData) => {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlData, 'text/xml') // Parse the XML string into a Document.
      const fireworkElements = xml.getElementsByTagName('Firework') // Get all 'Firework' elements.

      let totalDuration = 0 // Tracks the total duration of the entire sequence.

      // Iterate through each Firework element in the XML.
      for (let i = 0; i < fireworkElements.length; i++) {
        const firework = fireworkElements[i]
        // Extract attributes for each firework.
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

        // Update total duration to ensure all fireworks complete.
        totalDuration = Math.max(totalDuration, beginTime + duration)

        // Schedule the creation of each firework.
        setTimeout(() => {
          createFirework(type, colour, duration, x, y, velocityX, velocityY)
        }, beginTime)
      }

      // DEV: run in loop.
      // setTimeout(() => runFireworksLoop(appInstance, canvasCenterInstance), totalDuration);
    })
    .catch((error) => {
      // Handle any errors during XML fetching or parsing.
      showErrorText(`An error occurred: ${error}`)
      console.error('Error fetching XML file:', error)
    })
}
