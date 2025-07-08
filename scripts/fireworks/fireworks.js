import { fountainConfig } from './emitterConfigs.js'
import { explodeRocket } from './explodeRocket.js'
import ParticleExample from './ParticleExampleCustom.js'

// Import PixiJS components required for fireworks animations.
import { Sprite, Text } from 'pixi.js'

// Global variables to store the PixiJS Application instance and canvas center.
// These will be passed once during initialization.
let _app
let _canvasCenter

/**
 * Creates and manages a single firework animation (either Fountain or Rocket).
 * This function is now internal to this module, not directly exposed.
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

  if (type === 'Fountain') {
    fountainConfig.behaviors[3].config.color.list[1].value = colour

    new ParticleExample(
      _app,
      ['assets/fountain.png'],
      fountainConfig,
      _canvasCenter.x - x,
      _canvasCenter.y - y,
      duration
    )
  } else if (type === 'Rocket') {
    let rocket
    rocket = Sprite.from('./assets/particle.png')
    rocket.tint = parseInt(colour, 16)
    rocket.position.set(_canvasCenter.x - x, _canvasCenter.y - y)
    _app.stage.addChild(rocket)

    const loopRocket = (delta) => {
      const displacementX = (velocityX * delta) / 1000
      const displacementY = (velocityY * delta) / 100

      rocket.x += displacementX
      rocket.y += displacementY * -1
    }
    _app.ticker.add(loopRocket)

    setTimeout(() => {
      _app.stage.removeChild(rocket)
      _app.ticker.remove(loopRocket) // IMPORTANT: Remove ticker listener to prevent memory leaks
      explodeRocket(_app, rocket.x, rocket.y, colour)
    }, duration)
  }
}

/**
 * Displays a simple error message as a PixiJS Text object on the stage.
 * This is a fallback for critical errors during fireworks loading, not for game errors.
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
  errorText.anchor.set(0.5)

  _app.stage.addChild(errorText)
}

/**
 * Initializes the Fireworks module and starts the sequence defined in fireworks.xml.
 * This function is designed to be called once by the main game logic.
 * @param {PIXI.Application} appInstance - The main PixiJS application instance.
 * @param {object} canvasCenterInstance - An object with {x, y} coordinates of the canvas center.
 */
export function initFireworks(appInstance, canvasCenterInstance) {
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  // No longer adding updateFPS to ticker here as it's UI specific for the demo.
  // No longer attaching event listeners for 'applySizeBtn'.
  // The main game (slotGame.js) will dictate when fireworks are triggered.
}

/**
 * Triggers the fireworks sequence defined in fireworks.xml.
 * This function fetches the XML and schedules the fireworks.
 * It's now the primary function to call from slotGame.js when a win occurs.
 */
export function triggerFireworksSequence() {
  if (!_app || !_canvasCenter) {
    console.error('Fireworks module not initialized. Call initFireworks() first.')
    return
  }

  fetch('./data/fireworks.xml')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.text()
    })
    .then((xmlData) => {
      const parser = new DOMParser()
      const xml = parser.parseFromString(xmlData, 'text/xml')
      const fireworkElements = xml.getElementsByTagName('Firework')

      let totalDuration = 0

      for (let i = 0; i < fireworkElements.length; i++) {
        const firework = fireworkElements[i]
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

        totalDuration = Math.max(totalDuration, beginTime + duration)

        setTimeout(() => {
          createFirework(type, colour, duration, x, y, velocityX, velocityY)
        }, beginTime)
      }

      // Apenas para DEV, se quiseres que o ciclo se repita, mas provavelmente não para o jogo de slot
      // setTimeout(() => triggerFireworksSequence(), totalDuration);
    })
    .catch((error) => {
      showErrorText(`Ocorreu um erro ao carregar os fogos de artifício: ${error.message}`)
      console.error('Error fetching XML file for fireworks:', error)
    })
}
