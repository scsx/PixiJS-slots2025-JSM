;(function (window) {
  /* global PIXI */
  /* eslint-disable newline-after-var,prefer-template */
  /**
   *  Basic example setup
   *  @class ParticleExample
   *  @constructor
   *  @param {PIXI.Application} app The PIXI Application instance
   *  @param {String[]} imagePaths The local path to the image source
   *  @param {Object} config The emitter configuration
   *  @param {Number} emitterPosX The x position of the emitter
   *  @param {Number} emitterPosY The y position of the emitter
   */
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

      // Calculate the current time
      let elapsed = Date.now()
      let updateId

      // Update function every frame
      const update = () => {
        // Update the next frame
        updateId = requestAnimationFrame(update)

        const now = Date.now()
        if (this.emitter) {
          // update emitter (convert to seconds)
          this.emitter.update((now - elapsed) * 0.001)
        }

        // call update hook for specialist examples
        if (this.updateHook) {
          this.updateHook(now - elapsed)
        }

        elapsed = now

        // render the stage
        this.app.renderer.render(this.stage)
      }

      // Resize the canvas to the size of the window
      window.onresize = () => {
        // this.app.renderer.resize(window.innerWidth, window.innerHeight)
        if (this.bg) {
          // bg is a 1px by 1px image
          this.bg.scale.x = this.app.renderer.width
          this.bg.scale.y = this.app.renderer.height
        }
      }
      window.onresize()

      // Destroy after duration
      this.destroyTimeout = setTimeout(() => {
        this.destroyEmitter()
      }, this.duration)

      // Preload the particle images and create PIXI textures from it
      let urls
      if (imagePaths.spritesheet) {
        urls = [imagePaths.spritesheet]
      } else if (imagePaths.textures) {
        urls = imagePaths.textures.slice()
      } else {
        urls = imagePaths.slice()
      }
      const loader = PIXI.Loader.shared
      for (let i = 0; i < urls.length; ++i) {
        loader.add(`img${i}_${Date.now()}` + i, urls[i])
      }
      loader.load(() => {
        this.bg = new PIXI.Sprite(PIXI.Texture.WHITE)
        // bg is a 1px by 1px image
        /* this.bg.scale.x = this.app.renderer.width
        this.bg.scale.y = this.app.renderer.height */
        this.bg.tint = 0x000000
        this.stage.addChild(this.bg)
        // Create the new emitter and attach it to the stage
        let parentType = 0
        function getContainer() {
          switch (parentType) {
            case 1:
              const pc = new PIXI.ParticleContainer()
              pc.setProperties({
                scale: true,
                position: true,
                rotation: true,
                uvs: true,
                alpha: true
              })

              return [pc, 'PIXI.ParticleContainer']
            case 2:
              return [
                new PIXI.particles.LinkedListContainer(),
                'PIXI.particles.LinkedListContainer'
              ]
            default:
              return [new PIXI.Container(), 'PIXI.Container']
          }
        }
        let [emitterContainer, containerName] = getContainer()
        this.stage.addChild(emitterContainer)

        window.emitter = this.emitter = new PIXI.particles.Emitter(emitterContainer, config)

        // Pos on the stage
        this.emitter.updateOwnerPos(emitterPosX, emitterPosY)

        // Start the update
        update()
      })
    }

    destroyEmitter() {
      if (this.emitter) {
        this.emitter.destroy()
        this.emitter = null
        clearTimeout(this.destroyTimeout)
      }
    }
  }

  // Assign to global space
  window.ParticleExample = ParticleExample
})(window)
