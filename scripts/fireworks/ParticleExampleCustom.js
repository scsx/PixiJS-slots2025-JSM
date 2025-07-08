// TODO: cleanup, translate

import { Sprite, Texture, Container, ParticleContainer, Assets } from 'pixi.js'

class ParticleExample {
  constructor(app, imagePaths, config, emitterPosX, emitterPosY, duration) {
    this.app = app
    this.stage = app.stage
    this.emitter = null
    this.bg = null
    this.updateHook = null
    this.containerHook = null
    this.duration = duration
    this.destroyTimeout = null

    let elapsed = Date.now()
    let updateId

    const update = () => {
      updateId = requestAnimationFrame(update)

      const now = Date.now()
      if (this.emitter) {
        this.emitter.update((now - elapsed) * 0.001)
      }

      if (this.updateHook) {
        this.updateHook(now - elapsed)
      }

      elapsed = now
    }

    // REMOVIDO: window.onresize(). O redimensionamento do canvas é tratado pelo index.js/app.

    this.destroyTimeout = setTimeout(() => {
      this.destroyEmitter()
    }, this.duration)

    let urls
    if (imagePaths.spritesheet) {
      urls = [imagePaths.spritesheet]
    } else if (imagePaths.textures) {
      urls = imagePaths.textures.slice()
    } else {
      urls = imagePaths.slice()
    }

    // Use Assets.load para carregar as texturas. Isso é assíncrono.
    Assets.load(urls)
      .then((loadedTextures) => {
        this.emitter = new PIXI.particles.Emitter(emitterContainer, texturesForEmitter, config)
        this.bg = new Sprite(Texture.WHITE)
        this.bg.tint = 0x000000
        this.bg.scale.x = this.app.renderer.width // Escala o bg para o tamanho do canvas
        this.bg.scale.y = this.app.renderer.height
        this.stage.addChild(this.bg)

        let parentType = 0
        function getContainer() {
          switch (parentType) {
            case 1:
              // Use ParticleContainer importado
              const pc = new ParticleContainer()
              pc.setProperties({
                scale: true,
                position: true,
                rotation: true,
                uvs: true,
                alpha: true
              })
              return [pc, 'ParticleContainer'] // Nome para debug
            // Caso 2 (LinkedListContainer) removido/simplificado para Container,
            // pois LinkedListContainer não é padrão no PixiJS moderno.
            default:
              // Use Container importado
              return [new Container(), 'Container'] // Nome para debug
          }
        }
        let [emitterContainer, containerName] = getContainer()
        this.stage.addChild(emitterContainer)

        // Converta o objeto de texturas carregadas num array de Textures
        // que o Emitter espera.
        const texturesForEmitter = urls.map((url) => loadedTextures[url])

        // Use Emitter importado
        this.emitter = new Emitter(emitterContainer, texturesForEmitter, config)

        // Posiciona o emitter
        this.emitter.updateOwnerPos(emitterPosX, emitterPosY)

        // Inicia o loop de atualização DO EMITTER
        // O `update()` local gere `requestAnimationFrame` para o loop da animação do emitter.
        update()
      })
      .catch((error) => {
        console.error('Error loading particle assets for ParticleExample:', error)
        // Se houver um erro no carregamento, destruir o emitter para evitar problemas.
        this.destroyEmitter()
      })
  }

  destroyEmitter() {
    if (this.emitter) {
      this.emitter.destroy()
      this.emitter = null
      clearTimeout(this.destroyTimeout)
      // Remove o container do emitter do stage
      if (this.emitter.parent) {
        this.emitter.parent.removeChild(this.emitter)
      }
    }
    // Remove também o background sprite
    if (this.bg && this.bg.parent) {
      this.bg.parent.removeChild(this.bg)
      this.bg.destroy()
      this.bg = null
    }
  }
}

export default ParticleExample
