// --- Reel Specific Configuration (Constants) ---
const REEL_WIDTH = 280
const SYMBOL_SIZE = 160
const CELL_HEIGHT = 200
const NUM_VISIBLE_SYMBOLS = 3
const NUM_SYMBOLS_PER_REEL_STRIP = 10
const SPIN_DURATION_BASE = 2000

// Internal variables for PixiJS elements
const reels = [] // Array to hold reel objects. Each reel is a PixiJS Container.
const reelContainer = new PIXI.Container() // Main container for all reels.

let _app // Reference to the PixiJS Application instance
let _slotTextures // Array of loaded PixiJS Textures for symbols

// --- Utility Functions for Tweening (kept here as per decision) ---

/**
 * Basic linear interpolation function.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (0.0 to 1.0).
 * @returns {number} Interpolated value.
 */
const lerp = (a, b, t) => a + (b - a) * t

/**
 * Easing function for a "backout" effect (overshoot and settle).
 * Used for reels to stop smoothly with a slight bounce.
 * @param {number} amount - The strength of the overshoot (e.g., 0.5 for a standard bounce).
 * @returns {function(number): number} An easing function that takes time `t` (0.0 to 1.0) and returns the eased value.
 */
const backout = (amount) => (t) => {
  t = t - 1
  return t * t * ((amount + 1) * t + amount) + 1
}

/**
 * Animates a numeric property of an object over time using an easing function.
 * This is a simplified tweening implementation for this demo.
 * @param {object} object - The object whose property will be animated.
 * @param {string} property - The name of the property to animate (e.g., 'x', 'y', 'alpha').
 * @param {number} target - The target value for the property.
 * @param {number} time - The duration of the animation in milliseconds.
 * @param {function(number): number} func - The easing function to apply (e.g., `lerp`, `backout`).
 * @param {function(): void} onComplete - Callback function to be executed when the animation finishes.
 */
const tweenTo = (object, property, target, time, func, onComplete) => {
  const start = object[property]
  const startTime = Date.now()
  const endTime = startTime + time

  const animate = () => {
    const now = Date.now()
    if (now < endTime) {
      const t = (now - startTime) / time
      object[property] = lerp(start, target, func(t))
      requestAnimationFrame(animate)
    } else {
      object[property] = target
      if (onComplete) {
        onComplete()
      }
    }
  }
  requestAnimationFrame(animate)
}

// --- Core Reel Management Functions ---

/**
 * Initiates the spinning animation for all reels.
 * @param {number[]} results - An array of symbol indices, one for each reel, representing the final stop position.
 * @param {boolean} forceWin - If true, applies specific texture changes for forced wins.
 * @returns {Promise<void>} A promise that resolves when all reels have stopped spinning.
 */
export function startReelSpin(results, forceWin) {
  return new Promise((resolve) => {
    let reelsStopping = 0 // Counter for reels that have finished spinning.

    reels.forEach((reel, index) => {
      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT

      // Determine the target Y position for the *winning symbol* within the reel strip.
      // The winning symbol should appear in the center of the visible area (index 1 of 3 visible symbols).
      const winningSymbolTargetYInStrip = results[index] * CELL_HEIGHT
      const offsetToCenterVisibleArea = CELL_HEIGHT * 1 // For the second symbol (index 1) in 3 visible.

      // Calculate the desired final `reel.position` (scroll offset)
      // so that the top of the winning symbol is at `offsetToCenterVisibleArea`.
      let finalDesiredReelPosition = offsetToCenterVisibleArea - winningSymbolTargetYInStrip

      // To ensure the tween always moves forward (increases reel.position) and makes several full rotations,
      // we need to add full strip heights to the `finalDesiredReelPosition`.
      const minFullSpins = 5
      let spinDistance = minFullSpins * totalStripHeight

      // Adjust the distance to align the final symbol correctly.
      let currentReelPositionNormalized = reel.position % totalStripHeight
      if (currentReelPositionNormalized < 0) {
        currentReelPositionNormalized += totalStripHeight
      }

      let distanceToAlign = finalDesiredReelPosition - currentReelPositionNormalized
      if (distanceToAlign < 0) {
        distanceToAlign += totalStripHeight
      }
      spinDistance += distanceToAlign

      const targetPosition = reel.position + spinDistance

      reel.spinTween = tweenTo(
        reel,
        'position',
        targetPosition,
        SPIN_DURATION_BASE + index * 500, // Spin duration (cascading stop effect).
        backout(0.5), // Easing function for a slight bounce effect at the end of the spin.
        () => {
          // Callback function executed when a reel finishes its spin.
          reelsStopping++
          reel.spinTween = null // Clear the tween to indicate the reel has stopped.

          // --- LOGIC TO FORCE WIN AFTER SPIN (visually adjust symbols) ---
          // This section visually "snaps" symbols if forceWin is active,
          // ensuring the middle symbol is the winning one and others are random.
          if (forceWin) {
            const winningTexture = _slotTextures[results[index]]

            const visibleSymbols = []
            const visibleAreaMinY = 0
            const visibleAreaMaxY = NUM_VISIBLE_SYMBOLS * CELL_HEIGHT

            for (const symbol of reel.symbols) {
              if (
                symbol.y + SYMBOL_SIZE / 2 > visibleAreaMinY &&
                symbol.y - SYMBOL_SIZE / 2 < visibleAreaMaxY
              ) {
                visibleSymbols.push(symbol)
              }
            }

            visibleSymbols.sort((a, b) => a.y - b.y)

            if (visibleSymbols.length >= NUM_VISIBLE_SYMBOLS) {
              visibleSymbols[1].texture = winningTexture

              // Ensure other symbols are random and not the winning one
              const otherTextures = _slotTextures.filter((t) => t !== winningTexture)
              visibleSymbols[0].texture =
                otherTextures[Math.floor(Math.random() * otherTextures.length)]
              visibleSymbols[2].texture =
                otherTextures[Math.floor(Math.random() * otherTextures.length)]
            }
          }
          // --- END OF FORCE WIN LOGIC ---

          if (reelsStopping === reels.length) {
            resolve() // Resolve the promise when all reels have stopped.
          }
        }
      )
    })
  })
}

/**
 * Gets the textures of the symbols visible at the win line (middle row) for each reel.
 * @returns {PIXI.Texture[]} An array of textures from the middle symbol of each reel.
 */
export function getVisibleTexturesAtWinLine() {
  const actualVisibleTextures = []
  reels.forEach((reel) => {
    let middleSymbolTexture = null
    const targetCenterY = CELL_HEIGHT * 1 + CELL_HEIGHT / 2 // Center of the middle visible symbol slot
    const tolerance = 5 // A small tolerance for float comparisons

    // Find the symbol closest to the center of the win line
    for (const symbol of reel.symbols) {
      if (Math.abs(symbol.y - targetCenterY) < tolerance) {
        middleSymbolTexture = symbol.texture
        break
      }
    }
    actualVisibleTextures.push(middleSymbolTexture)
  })
  return actualVisibleTextures
}

/**
 * Initializes the reel manager, setting up the PixiJS display objects for the reels.
 * @param {Application} appInstance - The main PixiJS Application instance.
 * @param {PIXI.Texture[]} slotTexturesArray - An array of pre-loaded PixiJS Textures for the symbols.
 */
export function initReelManager(appInstance, slotTexturesArray) {
  _app = appInstance
  _slotTextures = slotTexturesArray

  // Add the main reel container to the PixiJS stage.
  _app.stage.addChild(reelContainer)

  // Adjust for positioning the Reel Container.
  const visibleSlotHeight = CELL_HEIGHT * NUM_VISIBLE_SYMBOLS
  const totalReelsWidth = REEL_WIDTH * 3 // For 3 reels
  // Adjust to center the reel container on the screen.
  reelContainer.x = (_app.screen.width - totalReelsWidth) / 2
  reelContainer.y = (_app.screen.height - visibleSlotHeight) / 2

  // Create individual reels.
  for (let i = 0; i < 3; i++) {
    const rc = new PIXI.Container() // Reel Container for individual reel
    rc.x = i * REEL_WIDTH // Position each reel horizontally.
    reelContainer.addChild(rc)

    // Create the mask for each reel.
    const reelMask = new PIXI.Graphics()
    reelMask.beginFill(0x000000) // Mask color doesn't matter, only shape
    // The mask should be drawn in the local coordinates of the *rc* (the individual reel container)
    reelMask.drawRoundedRect(0, 0, REEL_WIDTH, visibleSlotHeight, 15) // Rounded corners
    reelMask.endFill()
    rc.addChild(reelMask)
    rc.mask = reelMask // Apply the mask directly to the individual reel container

    const reel = {
      container: rc,
      symbols: [], // Array to hold Sprite objects for symbols in this reel.
      position: 0, // Current scroll position of the reel.
      previousPosition: 0, // Previous scroll position for tracking delta.
      spinTween: null // Property to hold the current tween object to stop the reel.
    }

    // Populate the reel with symbols.
    for (let j = 0; j < NUM_SYMBOLS_PER_REEL_STRIP; j++) {
      const symbol = new PIXI.Sprite(
        _slotTextures[Math.floor(Math.random() * _slotTextures.length)]
      )
      symbol.anchor.set(0.5) // Center the sprite on its position.
      symbol.scale.x = SYMBOL_SIZE / symbol.width
      symbol.scale.y = SYMBOL_SIZE / symbol.height

      symbol.x = REEL_WIDTH / 2 // Center the symbol horizontally in its reel column.
      symbol.y = j * CELL_HEIGHT + CELL_HEIGHT / 2 // Initial visual position (center of symbol in cell)
      reel.symbols.push(symbol) // Add the symbol to the reel's symbols array.
      rc.addChild(symbol) // Add the symbol sprite to the reel container.
    }
    reels.push(reel) // Add the configured reel object to the main reels array.
  }

  // Add the game loop function to the PixiJS ticker.
  // This function will be called every frame to update reel positions and effects.
  _app.ticker.add(() => {
    for (let i = 0; i < reels.length; i++) {
      const r = reels[i]

      // Calculate how much the reel has scrolled this frame.
      const deltaY = r.position - r.previousPosition
      r.previousPosition = r.position // Update previous position for the next frame.

      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT

      for (let j = 0; j < r.symbols.length; j++) {
        const symbol = r.symbols[j]

        // Move the symbol by the amount the reel scrolled this frame.
        symbol.y += deltaY

        // Logic for continuous symbol recycling:
        // If the symbol has moved completely off the top of the visible area,
        // move it to the bottom of the strip and assign a new random texture.
        if (symbol.y + CELL_HEIGHT / 2 < 0) {
          symbol.y += totalStripHeight
          // Only change texture if the reel is still actively spinning
          if (r.spinTween) {
            symbol.texture = _slotTextures[Math.floor(Math.random() * _slotTextures.length)]
          }
        }
        // If the symbol has moved completely off the bottom of the visible area,
        // move it to the top of the strip and assign a new random texture.
        else if (symbol.y - CELL_HEIGHT / 2 > CELL_HEIGHT * NUM_VISIBLE_SYMBOLS) {
          symbol.y -= totalStripHeight
          // Only change texture if the reel is still actively spinning
          if (r.spinTween) {
            symbol.texture = _slotTextures[Math.floor(Math.random() * _slotTextures.length)]
          }
        }
      }
    }
  })
}
