import { Sprite, Container } from 'pixi.js'

// Global references for PixiJS application, canvas center, and shared particle texture.
// These are initialized once via `initFountainEffect`.
let _app
let _canvasCenter
let _fountainParticleTexture = null

/**
 * Represents a single particle within a manual fountain effect.
 * Extends PIXI.Sprite to leverage PixiJS rendering capabilities.
 */
class FountainParticle extends Sprite {
  /**
   * @param {PIXI.Texture} texture - The texture for the particle.
   * @param {number} color - Tint color for the particle (hexadecimal).
   * @param {number} initialX - Starting X position.
   * @param {number} initialY - Starting Y position.
   * @param {number} initialVX - Initial horizontal velocity.
   * @param {number} initialVY - Initial vertical velocity.
   * @param {number} lifetime - Total duration the particle will exist (ms).
   */
  constructor(texture, color, initialX, initialY, initialVX, initialVY, lifetime) {
    super(texture)
    this.tint = color
    this.anchor.set(0.5) // Centers the sprite's origin.
    this.x = initialX
    this.y = initialY
    this.vx = initialVX
    this.vy = initialVY
    this.lifetime = lifetime
    this.timeAlive = 0
    this.gravity = 0.5 // Configurable gravity strength.
    this.initialAlpha = 1
    this.scale.set(0.5) // Initial particle size.
  }

  /**
   * Updates the particle's position, velocity, and alpha based on elapsed time.
   * Applies gravity and a fade-out effect towards the end of its life.
   * @param {number} deltaMs - Milliseconds since the last update.
   * @returns {boolean} True if the particle has exceeded its lifetime and should be removed.
   */
  update(deltaMs) {
    this.timeAlive += deltaMs

    // Apply gravity to vertical velocity, scaled by delta for frame-rate independence.
    this.vy += this.gravity * (deltaMs / 16.66) // 16.66ms is approx. frame time at 60fps.

    // Update position based on current velocities.
    this.x += this.vx * (deltaMs / 16.66)
    this.y += this.vy * (deltaMs / 16.66)

    // Implement a fade-out effect for the last 30% of the particle's lifetime.
    const fadeStartTime = this.lifetime * 0.7
    if (this.timeAlive > fadeStartTime) {
      this.alpha =
        this.initialAlpha * (1 - (this.timeAlive - fadeStartTime) / (this.lifetime - fadeStartTime))
    } else {
      this.alpha = this.initialAlpha
    }

    return this.timeAlive >= this.lifetime
  }
}

/**
 * Manages the emission and lifecycle of particles for a single fountain effect.
 */
export class ManualFountain {
  /**
   * @param {PIXI.Application} app - The PixiJS application instance.
   * @param {string} colour - Hexadecimal color for fountain particles.
   * @param {number} duration - Total duration for which the fountain emits particles (ms).
   * @param {number} x - X-coordinate of the fountain's base (relative to canvas center).
   * @param {number} y - Y-coordinate of the fountain's base (relative to canvas center).
   */
  constructor(app, colour, duration, x, y) {
    this.app = app
    this.colour = parseInt(colour, 16)
    this.duration = duration
    // Calculate absolute position on stage based on canvas center and XML offset.
    this.fountainBaseX = _canvasCenter.x - x
    this.fountainBaseY = _canvasCenter.y - y

    this.particles = [] // Collection of active particles for this fountain.
    this.emissionTimer = 0 // Accumulator for emission interval.
    this.emissionInterval = 10 // Time between new particle spawns (ms). Lower value = more particles.

    this.fountainActiveTime = 0 // Tracks how long the fountain has been emitting.
    this.isEmitting = true // Flag to control active particle spawning.

    // PIXI.Container to group all particles for this fountain, simplifying stage management.
    this.particleContainer = new Container()
    this.app.stage.addChild(this.particleContainer)

    // Bind and add update method to PixiJS ticker for continuous animation.
    this.updateFn = this.update.bind(this)
    this.app.ticker.add(this.updateFn)

    // Schedule the cessation of particle emission after the specified duration.
    setTimeout(() => {
      this.isEmitting = false
    }, this.duration)
  }

  /**
   * Updates all particles managed by this fountain instance.
   * Spawns new particles, updates existing ones, and removes expired particles.
   * @param {number} delta - PixiJS ticker delta time (frame-rate independent multiplier).
   */
  update(delta) {
    // Prefer `app.ticker.deltaMS` for precise millisecond delta if available (PixiJS v6+).
    // Fallback to approximate conversion for older PixiJS versions.
    const deltaMs =
      this.app.ticker.deltaMS !== undefined ? this.app.ticker.deltaMS : delta * (1000 / 60)

    this.fountainActiveTime += deltaMs

    // Emit new particles if the fountain is active and enough time has passed.
    // Uses a `while` loop to handle potential large `deltaMs` values (e.g., after tab switch).
    if (this.isEmitting) {
      this.emissionTimer += deltaMs
      while (this.emissionTimer >= this.emissionInterval) {
        this.spawnParticle()
        this.emissionTimer -= this.emissionInterval
      }
    }

    // Iterate backwards to safely remove particles during iteration.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      const shouldRemove = particle.update(deltaMs) // Update particle and check if it's dead.

      if (shouldRemove) {
        this.particleContainer.removeChild(particle)
        particle.destroy() // Properly destroy PixiJS sprite to free memory.
        this.particles.splice(i, 1) // Remove from tracking array.
      }
    }

    // If emission has stopped and all particles have expired, destroy the fountain instance.
    if (!this.isEmitting && this.particles.length === 0) {
      this.destroy()
    }
  }

  /**
   * Creates and adds a new particle to the fountain.
   */
  spawnParticle() {
    if (!_fountainParticleTexture) {
      console.error(
        'Fountain particle texture not loaded for fountainEffect. Cannot spawn particle.'
      )
      return
    }

    // Randomize initial vertical and horizontal speeds for a natural spread.
    const initialSpeedY = -(Math.random() * 5 + 10) // Negative for upward movement.
    const initialSpeedX = (Math.random() - 0.5) * 5 // Centered around 0 for horizontal spread.

    const particle = new FountainParticle(
      _fountainParticleTexture,
      this.colour,
      this.fountainBaseX,
      this.fountainBaseY,
      initialSpeedX,
      initialSpeedY,
      1500 // Individual particle lifetime (ms).
    )
    this.particleContainer.addChild(particle)
    this.particles.push(particle)
  }

  /**
   * Cleans up the fountain instance, removing it from the ticker and destroying all associated resources.
   */
  destroy() {
    this.app.ticker.remove(this.updateFn) // Deregister from PixiJS ticker.
    this.particles.forEach((p) => p.destroy()) // Destroy all remaining particle sprites.
    this.particles = [] // Clear particle array.
    if (this.particleContainer.parent) {
      this.particleContainer.parent.removeChild(this.particleContainer)
    }
    this.particleContainer.destroy() // Destroy the container itself.
  }
}

/**
 * Asynchronously initializes the fountain effect module.
 * Loads the common particle texture and stores global PixiJS references.
 * Must be called once before any `ManualFountain` instances are created.
 * @param {PIXI.Application} appInstance - The main PixiJS application instance.
 * @param {object} canvasCenterInstance - Object with {x, y} coordinates of the canvas center.
 */
export async function initFountainEffect(appInstance, canvasCenterInstance) {
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  try {
    // Loads the texture used by all fountain particles.
    _fountainParticleTexture = await PIXI.Assets.load('./assets/particle.png')
  } catch (error) {
    console.error('Error loading particle texture:', error)
    // Additional error handling (e.g., displaying a fallback message) could be implemented here.
  }
}
