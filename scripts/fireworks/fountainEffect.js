import { Sprite, Container } from 'pixi.js'

// Variáveis globais (a serem definidas externamente por initFountainEffect)
let _app
let _canvasCenter
let _fountainParticleTexture = null // Textura da partícula da fonte, carregada uma vez.

/**
 * Representa uma única partícula de uma fonte manual.
 */
class FountainParticle extends Sprite {
  constructor(texture, color, initialX, initialY, initialVX, initialVY, lifetime) {
    super(texture)
    this.tint = color
    this.anchor.set(0.5) // Centro do sprite
    this.x = initialX
    this.y = initialY
    this.vx = initialVX
    this.vy = initialVY
    this.lifetime = lifetime // Tempo total de vida da partícula
    this.timeAlive = 0 // Tempo de vida atual da partícula
    this.gravity = 0.5 // Força da gravidade (ajusta conforme necessário)
    this.initialAlpha = 1 // Alpha inicial
    this.scale.set(0.5) // Size
  }

  /**
   * Atualiza a posição e o estado da partícula.
   * @param {number} deltaMs - O tempo decorrido desde a última atualização em milissegundos.
   */
  update(deltaMs) {
    this.timeAlive += deltaMs

    // Aplica a gravidade à velocidade vertical
    this.vy += this.gravity * (deltaMs / 16.66) // Ajusta a gravidade para delta time (16.66ms para 60fps)

    // Atualiza a posição
    this.x += this.vx * (deltaMs / 16.66)
    this.y += this.vy * (deltaMs / 16.66)

    // Atualiza o alpha (desvanecer a partícula no final da sua vida)
    const fadeStartTime = this.lifetime * 0.7 // Começa a desvanecer nos últimos 30% da vida da partícula
    if (this.timeAlive > fadeStartTime) {
      this.alpha =
        this.initialAlpha * (1 - (this.timeAlive - fadeStartTime) / (this.lifetime - fadeStartTime))
    } else {
      this.alpha = this.initialAlpha
    }

    // Se a partícula exceder o seu tempo de vida, marca-a para remoção
    return this.timeAlive >= this.lifetime
  }
}

/**
 * Representa uma única fonte manual ativa.
 */
export class ManualFountain {
  // Exporta a classe para ser instanciada externamente
  constructor(app, colour, duration, x, y) {
    this.app = app
    this.colour = parseInt(colour, 16)
    this.duration = duration // Duração total de emissão da fonte
    this.fountainBaseX = _canvasCenter.x - x
    this.fountainBaseY = _canvasCenter.y - y

    this.particles = [] // Array de partículas desta fonte
    this.emissionTimer = 0 // Tempo até a próxima emissão
    this.emissionInterval = 10 // Intervalo entre a criação de novas partículas (em ms). Um valor menor significa que são criadas mais partículas por segundo.

    this.fountainActiveTime = 0 // Quanto tempo a fonte esteve ativa (para a duração)
    this.isEmitting = true // Se a fonte ainda deve emitir partículas

    this.particleContainer = new Container() // Usamos Container para agrupar as partículas
    this.app.stage.addChild(this.particleContainer)

    this.updateFn = this.update.bind(this)
    this.app.ticker.add(this.updateFn)

    setTimeout(() => {
      this.isEmitting = false
    }, this.duration)
  }

  update(delta) {
    // Usa `app.ticker.deltaMS` para um delta em milissegundos mais preciso,
    // se a versão do PixiJS o suportar. Caso contrário, a conversão é aproximada.
    const deltaMs =
      this.app.ticker.deltaMS !== undefined ? this.app.ticker.deltaMS : delta * (1000 / 60)

    this.fountainActiveTime += deltaMs

    if (this.isEmitting) {
      this.emissionTimer += deltaMs
      while (this.emissionTimer >= this.emissionInterval) {
        // Usa while para lidar com grandes deltas
        this.spawnParticle()
        this.emissionTimer -= this.emissionInterval
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      const shouldRemove = particle.update(deltaMs)

      if (shouldRemove) {
        this.particleContainer.removeChild(particle)
        particle.destroy()
        this.particles.splice(i, 1)
      }
    }

    if (!this.isEmitting && this.particles.length === 0) {
      this.destroy()
    }
  }

  spawnParticle() {
    if (!_fountainParticleTexture) {
      console.warn('Fountain particle texture not loaded for fountainEffect.')
      return
    }

    const initialSpeedY = -(Math.random() * 5 + 10) // Velocidade para cima (ajusta valores)
    const initialSpeedX = (Math.random() - 0.5) * 5 // Pequena variação horizontal

    const particle = new FountainParticle(
      _fountainParticleTexture,
      this.colour,
      this.fountainBaseX,
      this.fountainBaseY,
      initialSpeedX,
      initialSpeedY,
      1500 // Tempo de vida de cada partícula em ms (1.5 segundos)
    )
    this.particleContainer.addChild(particle)
    this.particles.push(particle)
  }

  destroy() {
    this.app.ticker.remove(this.updateFn)
    this.particles.forEach((p) => p.destroy())
    this.particles = []
    if (this.particleContainer.parent) {
      this.particleContainer.parent.removeChild(this.particleContainer)
    }
    this.particleContainer.destroy()
    console.log('ManualFountain instance destroyed.')
  }
}

/**
 * Inicializa o módulo fountainEffect, carregando a textura e armazenando as referências da app.
 * Deve ser chamado UMA VEZ no início.
 * @param {PIXI.Application} appInstance - A instância principal da aplicação PixiJS.
 * @param {object} canvasCenterInstance - Um objeto com coordenadas {x, y} do centro do canvas.
 */
export async function initFountainEffect(appInstance, canvasCenterInstance) {
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  try {
    _fountainParticleTexture = await PIXI.Assets.load('./assets/particle.png')
    console.log('Textura da partícula da fonte carregada com sucesso para fountainEffect!')
  } catch (error) {
    console.error('Erro ao carregar a textura da partícula da fonte para fountainEffect:', error)
    // Não temos showErrorText aqui, mas podes passá-lo ou gerir de outra forma.
  }
}
