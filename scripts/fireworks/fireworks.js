// scripts/fireworks/fireworks.js

// IMPORTAÇÕES FINAIS - REMOVE QUALQUER OUTRA IMPORTAÇÃO DE EMITTER
import { Sprite, Texture, Text } from 'pixi.js'
import { explodeRocket } from './explodeRocket.js'
import { ManualFountain, initFountainEffect } from './fountainEffect.js' // ESTA É A IMPORTAÇÃO CHAVE

// Variáveis PixiJS globais para o módulo fireworks.
let _app
let _canvasCenter

// Lista de fontes manuais ativas (para poder parar todas)
const activeManualFountains = new Set()

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
  if (!_app || !_canvasCenter) {
    console.error('PixiJS Application or canvasCenter not initialized for firework creation.')
    return
  }

  if (type === 'Fountain') {
    // AQUI USAMOS A CLASSE ManualFountain IMPORTADA DO fountainEffect.js
    const newFountain = new ManualFountain(_app, colour, duration, x, y)
    activeManualFountains.add(newFountain)
  } else if (type === 'Rocket') {
    // Lógica existente para o Rocket (mantida inalterada)
    let rocket
    // Certifica-te que ./assets/particle.png está acessível e é uma imagem válida
    rocket = Sprite.from('./assets/particle.png')
    rocket.tint = parseInt(colour, 16)
    rocket.position.set(_canvasCenter.x - x, _canvasCenter.y - y)
    _app.stage.addChild(rocket)

    const loopRocket = (delta) => {
      const displacementX = (velocityX * delta) / 1000
      const displacementY = (velocityY * delta) / 100 // Ajusta isto se achares que a velocidade Y é estranha

      rocket.x += displacementX
      rocket.y += displacementY * -1 // -1 para subir
    }
    _app.ticker.add(loopRocket)

    setTimeout(() => {
      _app.stage.removeChild(rocket)
      _app.ticker.remove(loopRocket) // IMPORTANT: Remover o listener do ticker para evitar fugas de memória
      explodeRocket(_app, rocket.x, rocket.y, colour) // Chama explodeRocket (de explodeRocket.js)
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
 * Initializes the Fireworks module. This function should be called once by the main game logic.
 * @param {PIXI.Application} appInstance - The main PixiJS application instance.
 * @param {object} canvasCenterInstance - An object with {x, y} coordinates of the canvas center.
 */
export async function initFireworks(appInstance, canvasCenterInstance) {
  // PRECISA SER ASYNC
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  // CHAMA A FUNÇÃO DE INICIALIZAÇÃO DO MÓDULO DA FONTE MANUAL PARA CARREGAR A TEXTURA
  await initFountainEffect(_app, _canvasCenter)
  console.log('Fireworks module and FountainEffect initialized.')
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

      // PARA ASSEGURAR QUE FOUNTAINS ANTERIORES SÃO PARADAS QUANDO UMA NOVA SEQUÊNCIA COMEÇA
      stopAllFireworks()

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

    })
    .catch((error) => {
      showErrorText(`Ocorreu um erro ao carregar os fogos de artifício: ${error.message}`)
      console.error('Error fetching XML file for fireworks:', error)
    })
}

/**
 * Função para parar todas as animações de fogos de artifício (incluindo as fontes).
 * Pode ser útil se precisares de limpar o palco rapidamente (ex: no fim de um jogo).
 */
export function stopAllFireworks() {
  // Destrói todas as fontes manuais ativas
  activeManualFountains.forEach((fountain) => fountain.destroy())
  activeManualFountains.clear() // Garante que o Set está vazio
  // TODO: Adicionar lógica para parar foguetes ativos se necessário (eles já se limpam com o timeout)
  console.log('Todos os fogos de artifício (fontes) foram interrompidos e limpos.')
}
