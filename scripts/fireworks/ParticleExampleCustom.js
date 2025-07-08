// TODO: cleanup, translate - Manter estas anotações se quiseres fazer o cleanup depois

// Removidas quaisquer importações de PixiJS (ex: import { Assets, Sprite, Texture, Container, ParticleContainer } from 'pixi.js')
// Não precisamos de importar nada do PixiJS, pois está carregado globalmente.

class ParticleExample {
  constructor(app, imagePaths, config, emitterPosX, emitterPosY, duration) {
    this.app = app
    this.stage = app.stage // app.stage já é um PIXI.Container, está ok
    this.emitter = null
    this.bg = null
    this.updateHook = null
    this.containerHook = null
    this.duration = duration
    this.destroyTimeout = null

    let elapsed = Date.now()
    let updateId // Declarado mas o uso para cancelamento não está completo aqui (consideração futura)

    const update = () => {
      updateId = requestAnimationFrame(update) // Continua a loop de animação
      const now = Date.now()
      if (this.emitter) {
        this.emitter.update((now - elapsed) * 0.001) // Atualiza o emitter
      }

      if (this.updateHook) {
        this.updateHook(now - elapsed) // Chama o hook de atualização personalizado
      }

      elapsed = now
    }

    // Configura o timeout para destruir o emitter após a duração especificada
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

    // Usa PIXI.Assets.load para carregar as texturas. Isso é assíncrono.
    PIXI.Assets.load(urls) // <-- CORRIGIDO: Usa PIXI.Assets
      .then((loadedTextures) => {
        // --- INÍCIO DAS CORREÇÕES LÓGICAS E DE REFERÊNCIA ---

        // As variáveis emitterContainer e texturesForEmitter precisam ser definidas AQUI
        // antes de serem usadas para criar o emitter.

        let parentType = 0
        function getContainer() {
          switch (parentType) {
            case 1:
              // Usa PIXI.ParticleContainer
              const pc = new PIXI.ParticleContainer() // <-- CORRIGIDO: Usa PIXI.ParticleContainer
              pc.setProperties({
                scale: true,
                position: true,
                rotation: true,
                uvs: true,
                alpha: true
              })
              return [pc, 'ParticleContainer']
            default:
              // Usa PIXI.Container
              return [new PIXI.Container(), 'Container'] // <-- CORRIGIDO: Usa PIXI.Container
          }
        }
        let [emitterContainer, containerName] = getContainer() // containerName não é usado, mas ok
        this.stage.addChild(emitterContainer)

        // Converte o objeto de texturas carregadas num array de Textures
        const texturesForEmitter = urls.map((url) => loadedTextures[url])

        // Cria o sprite de background
        this.bg = new PIXI.Sprite(PIXI.Texture.WHITE) // <-- CORRIGIDO: Usa PIXI.Sprite e PIXI.Texture
        this.bg.tint = 0x000000
        this.bg.scale.x = this.app.renderer.width
        this.bg.scale.y = this.app.renderer.height
        this.stage.addChild(this.bg)

        // Cria o emitter. **Esta é a ÚNICA criação do emitter.**
        // A linha "this.emitter = new Emitter(...)" que estava mais abaixo deve ser removida.
        this.emitter = new PIXI.particles.Emitter(emitterContainer, texturesForEmitter, config) // <-- CORRIGIDO: Usa PIXI.particles.Emitter

        // Posiciona o emitter
        this.emitter.updateOwnerPos(emitterPosX, emitterPosY)

        // Inicia o loop de atualização principal (do requestAnimationFrame)
        update()
        // --- FIM DAS CORREÇÕES LÓGICAS E DE REFERÊNCIA ---
      })
      .catch((error) => {
        console.error('Error loading particle assets for ParticleExample:', error)
        // Se houver um erro no carregamento, destruir o emitter para evitar problemas.
        this.destroyEmitter()
      })
  }

  /**
   * Destroi o emitter de partículas e remove os elementos do stage.
   */
  destroyEmitter() {
    if (this.emitter) {
      this.emitter.destroy()
      this.emitter = null
      clearTimeout(this.destroyTimeout)
      // Remove o container do emitter do stage (se ainda tiver um pai)
      if (this.emitter.parent) {
        // NOTE: this.emitter.parent pode ser undefined se emitter for null ou destruído
        this.emitter.parent.removeChild(this.emitter) // Esta linha pode dar erro se this.emitter for null
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
