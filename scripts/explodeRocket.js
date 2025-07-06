export const explodeRocket = (app, x, y, colour) => {
  const explosionSize = 500 // Number of particles in the explosion
  const explosionSpeed = 7 // Maximum speed of particles in pixels per frame
  let explosionLife = 200 // Duration of the explosion in frames
  const particleTexture = PIXI.Texture.from('assets/rocket.png')

  // Create an array to store the explosion particles
  const particles = []

  // Create particles for the explosion
  for (let i = 0; i < explosionSize; i++) {
    // Create a particle sprite
    const particle = new PIXI.Sprite(particleTexture)
    particle.tint = colour
    particle.anchor.set(0.5)
    particle.scale.x = 0.5
    particle.scale.y = 0.5

    // Randomize particle position
    particle.x = x
    particle.y = y

    // Randomize particle velocity
    const speed = Math.random() * explosionSpeed
    const angle = Math.random() * Math.PI * 2
    particle.vx = Math.cos(angle) * speed
    particle.vy = Math.sin(angle) * speed

    // Add particle to the stage
    app.stage.addChild(particle)

    // Add particle to the particles array
    particles.push(particle)
  }

  // Update function for the explosion animation
  const update = () => {
    // Update each particle's position
    particles.forEach((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.scale.x *= 0.95
      particle.scale.y *= 0.95
      //particle.alpha *= 0.99
    })

    // Decrease the life of the explosion
    explosionLife--

    // Remove particles that have reached the end of their life
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i]
      if (explosionLife <= 0) {
        app.stage.removeChild(particle)
        particles.splice(i, 1)
      }
    }

    // If there are still particles remaining, continue the animation
    if (particles.length > 0) {
      requestAnimationFrame(update)
    }
  }

  // Start the explosion animation
  update()
}
