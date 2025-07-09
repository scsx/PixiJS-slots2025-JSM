import { Sprite } from 'pixi.js'

/**
 * Creates a visual explosion effect at a specified location.
 * Generates a burst of particles that expand and fade.
 * @param {PIXI.Application} app - The main PixiJS application instance.
 * @param {number} x - X-coordinate for the center of the explosion.
 * @param {number} y - Y-coordinate for the center of the explosion.
 * @param {string} colour - Hexadecimal color code for the explosion particles.
 */
export const explodeRocket = (app, x, y, colour) => {
  const explosionSize = 500 // Number of particles to generate for the explosion.
  const explosionSpeed = 7 // Maximum initial speed of particles.
  let explosionLife = 200 // Duration of the explosion animation in frames.
  const particleTexture = PIXI.Texture.from('assets/rocket.png')

  // Array to manage all active particles within this explosion.
  const particles = []

  // Particle generation loop.
  for (let i = 0; i < explosionSize; i++) {
    const particle = new Sprite(particleTexture)
    particle.tint = parseInt(colour, 16) // Apply specified color.
    particle.anchor.set(0.5) // Center the particle's origin.
    particle.scale.set(0.5) // Initial size of particles.

    // Initialize particle position at the explosion center.
    particle.x = x
    particle.y = y

    // Assign random velocity for radial expansion.
    const speed = Math.random() * explosionSpeed
    const angle = Math.random() * Math.PI * 2 // Random angle in radians (0 to 360 degrees).
    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed

    app.stage.addChild(particle) // Add particle to the stage.
    particles.push(particle) // Track the particle.
  }

  let animationFrameId // To store the ID returned by requestAnimationFrame.

  /**
   * Update function for the explosion animation, called per frame.
   * Manages particle movement, scaling, and eventual removal.
   */
  const update = () => {
    // Update each particle's position and scale.
    particles.forEach((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.scale.x *= 0.95 // Gradually shrink particles.
      particle.scale.y *= 0.95
      // particle.alpha *= 0.99; // Optional: uncomment to make particles fade out.
    })

    explosionLife-- // Decrement explosion duration counter.

    // Remove particles when explosion life ends.
    // Iterating backwards ensures safe removal during loop.
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]
      if (explosionLife <= 0) {
        // Particles are removed collectively when explosionLife reaches zero.
        app.stage.removeChild(particle)
        particle.destroy() // Clean up PixiJS resources.
        particles.splice(i, 1) // Remove from tracking array.
      }
    }

    // Continue animation if there are still active particles.
    if (particles.length > 0) {
      animationFrameId = requestAnimationFrame(update)
    }
  }

  // Start the explosion animation loop.
  animationFrameId = requestAnimationFrame(update)
}
