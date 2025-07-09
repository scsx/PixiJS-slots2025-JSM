import { Container, Sprite, Graphics } from 'pixi.js'

// --- Reel Configuration Constants ---
const REEL_WIDTH = 280
const SYMBOL_SIZE = 160
const CELL_HEIGHT = 200
const NUM_VISIBLE_SYMBOLS = 3
const NUM_SYMBOLS_PER_REEL_STRIP = 10 // Total symbols in a reel strip.
const SPIN_DURATION_BASE = 2000 // Base duration for a reel spin in milliseconds.

const reels = [] // Stores reel objects, each containing its PixiJS Container and symbols.
const reelContainer = new Container() // Main container holding all individual reel containers.

let _app // Reference to the main PixiJS Application instance.
let _slotTextures // Array of pre-loaded PIXI.Texture objects for slot symbols.

// --- Utility Functions for Tweening ---

/**
 * Performs linear interpolation between two values.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (0.0 to 1.0).
 * @returns {number} The interpolated value.
 */
const lerp = (a, b, t) => a + (b - a) * t

/**
 * Implements a "backout" easing function, providing an overshoot and settle effect.
 * Ideal for reel stops to add a subtle bounce.
 * @param {number} amount - The magnitude of the overshoot.
 * @returns {function(number): number} An easing function taking time `t` (0.0-1.0).
 */
const backout = (amount) => (t) => {
  t = t - 1
  return t * t * ((amount + 1) * t + amount) + 1
}

/**
 * Animates a numeric property of a given object over a specified duration.
 * Utilizes `requestAnimationFrame` for smooth, browser-optimized animation.
 * @param {object} object - The target object for animation.
 * @param {string} property - The property name to animate (e.g., 'y' for vertical position).
 * @param {number} target - The final value for the animated property.
 * @param {number} time - Animation duration in milliseconds.
 * @param {function(number): number} func - Easing function to control animation progression.
 * @param {function(): void} onComplete - Callback executed upon animation completion.
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
      object[property] = target // Ensure final value is exact.
      if (onComplete) {
        onComplete() // Execute completion callback.
      }
    }
  }
  requestAnimationFrame(animate)
}

// --- Core Reel Management Functions ---

/**
 * Initiates the spinning animation for all reels.
 * Each reel spins for a base duration plus an index-based delay for a cascading stop.
 * @param {number[]} results - Array of target symbol indices for each reel's final stop.
 * @param {boolean} forceWin - Flag to visually adjust symbols for a forced win (for demo purposes).
 * @returns {Promise<void>} Resolves when all reels have completed their spin animation.
 */
export function startReelSpin(results, forceWin) {
  return new Promise((resolve) => {
    let reelsStopping = 0 // Tracks the number of reels that have finished spinning.

    reels.forEach((reel, index) => {
      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT

      // Calculate the precise target Y position for the winning symbol within the reel strip.
      // The winning symbol should align with the center visible slot (index 1 of 3).
      const winningSymbolTargetYInStrip = results[index] * CELL_HEIGHT
      const offsetToCenterVisibleArea = CELL_HEIGHT * 1 // Offset for the middle visible symbol.

      // Determine the desired final scroll offset of the reel container.
      let finalDesiredReelPosition = offsetToCenterVisibleArea - winningSymbolTargetYInStrip

      // To ensure the reel always spins forward and completes multiple full rotations,
      // calculate the necessary additional spin distance.
      const minFullSpins = 5 // Minimum number of full strip rotations.
      let spinDistance = minFullSpins * totalStripHeight

      // Adjust `spinDistance` to precisely align the target symbol.
      let currentReelPositionNormalized = reel.position % totalStripHeight
      if (currentReelPositionNormalized < 0) {
        currentReelPositionNormalized += totalStripHeight // Normalize negative positions.
      }

      let distanceToAlign = finalDesiredReelPosition - currentReelPositionNormalized
      if (distanceToAlign < 0) {
        distanceToAlign += totalStripHeight // Ensure positive distance if target is "behind".
      }
      spinDistance += distanceToAlign

      const targetPosition = reel.position + spinDistance

      // Start the tween animation for the current reel.
      reel.spinTween = tweenTo(
        reel,
        'position', // Animating the 'position' property of the reel object.
        targetPosition,
        SPIN_DURATION_BASE + index * 500, // Cascading stop: reels stop sequentially.
        backout(0.5), // Easing function for a subtle bounce.
        () => {
          // Callback when an individual reel finishes its spin.
          reelsStopping++
          reel.spinTween = null // Clear tween reference.

          // --- Force Win Visual Adjustment (for demo/testing) ---
          // This logic visually "snaps" symbols to ensure the middle one is the winning symbol,
          // and others are random, overriding the natural stop if `forceWin` is true.
          if (forceWin) {
            const winningTexture = _slotTextures[results[index]]
            const visibleSymbols = []
            const visibleAreaMinY = 0
            const visibleAreaMaxY = NUM_VISIBLE_SYMBOLS * CELL_HEIGHT

            // Collect symbols currently within the visible reel area.
            for (const symbol of reel.symbols) {
              if (
                symbol.y + SYMBOL_SIZE / 2 > visibleAreaMinY &&
                symbol.y - SYMBOL_SIZE / 2 < visibleAreaMaxY
              ) {
                visibleSymbols.push(symbol)
              }
            }

            visibleSymbols.sort((a, b) => a.y - b.y) // Sort by Y position (top to bottom).

            if (visibleSymbols.length >= NUM_VISIBLE_SYMBOLS) {
              visibleSymbols[1].texture = winningTexture // Set middle symbol to winning texture.

              // Randomize top and bottom visible symbols, ensuring they are not the winning one.
              const otherTextures = _slotTextures.filter((t) => t !== winningTexture)
              visibleSymbols[0].texture =
                otherTextures[Math.floor(Math.random() * otherTextures.length)]
              visibleSymbols[2].texture =
                otherTextures[Math.floor(Math.random() * otherTextures.length)]
            }
          }
          // --- End of Force Win Logic ---

          // Resolve the main promise only when ALL reels have stopped.
          if (reelsStopping === reels.length) {
            resolve()
          }
        }
      )
    })
  })
}

/**
 * Retrieves the PIXI.Texture objects of the symbols currently visible at the win line (middle row) for each reel.
 * @returns {PIXI.Texture[]} An array containing the texture of the middle symbol from each reel.
 */
export function getVisibleTexturesAtWinLine() {
  const actualVisibleTextures = []
  reels.forEach((reel) => {
    let middleSymbolTexture = null
    // Calculate the target Y-center for the middle visible symbol slot.
    const targetCenterY = CELL_HEIGHT * 1 + CELL_HEIGHT / 2
    const tolerance = 5 // Pixel tolerance for float comparison of symbol positions.

    // Find the symbol whose center is closest to the win line's center.
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
 * Initializes the reel management system.
 * Sets up the PixiJS display objects for the reels, their masks, and populates them with symbols.
 * Attaches the main reel update loop to the PixiJS ticker.
 * @param {PIXI.Application} appInstance - The main PixiJS Application instance.
 * @param {PIXI.Texture[]} slotTexturesArray - An array of pre-loaded PixiJS Textures for the symbols.
 */
export function initReelManager(appInstance, slotTexturesArray) {
  _app = appInstance
  _slotTextures = slotTexturesArray

  // Add the main reel container to the PixiJS stage.
  _app.stage.addChild(reelContainer)

  // Position the entire reel container to be centered on the screen.
  const visibleSlotHeight = CELL_HEIGHT * NUM_VISIBLE_SYMBOLS
  const totalReelsWidth = REEL_WIDTH * 3 // Assuming 3 reels.
  reelContainer.x = (_app.screen.width - totalReelsWidth) / 2
  reelContainer.y = (_app.screen.height - visibleSlotHeight) / 2

  // Dynamically create and configure each individual reel.
  for (let i = 0; i < 3; i++) {
    // Loop for 3 reels.
    const rc = new Container() // Container for the current reel's symbols.
    rc.x = i * REEL_WIDTH // Horizontal positioning for each reel.
    reelContainer.addChild(rc)

    // Create a mask for the current reel to hide symbols outside the visible area.
    const reelMask = new Graphics()
    reelMask.beginFill(0x000000) // Mask color is irrelevant, only its shape.
    reelMask.drawRoundedRect(0, 0, REEL_WIDTH, visibleSlotHeight, 15) // Rounded corners for aesthetics.
    reelMask.endFill()
    rc.addChild(reelMask)
    rc.mask = reelMask // Apply the mask to the individual reel container.

    // Define the reel object structure.
    const reel = {
      container: rc, // The PixiJS container holding the reel's symbols.
      symbols: [], // Array of PIXI.Sprite objects representing symbols in this reel.
      position: 0, // Current vertical scroll position of the reel strip.
      previousPosition: 0, // Used to calculate delta movement per frame.
      spinTween: null // Holds the active tween instance during a spin.
    }

    // Populate the current reel with symbols.
    for (let j = 0; j < NUM_SYMBOLS_PER_REEL_STRIP; j++) {
      // Create a symbol sprite with a random texture from the loaded set.
      const symbol = new Sprite(_slotTextures[Math.floor(Math.random() * _slotTextures.length)])
      symbol.anchor.set(0.5) // Center the sprite's origin for easier positioning.
      // Scale the symbol to fit the defined SYMBOL_SIZE while maintaining aspect ratio.
      symbol.scale.x = SYMBOL_SIZE / symbol.width
      symbol.scale.y = SYMBOL_SIZE / symbol.height

      symbol.x = REEL_WIDTH / 2 // Center horizontally within its reel column.
      symbol.y = j * CELL_HEIGHT + CELL_HEIGHT / 2 // Initial vertical position within the strip.
      reel.symbols.push(symbol) // Add to reel's symbol array.
      rc.addChild(symbol) // Add to the reel's PixiJS container.
    }
    reels.push(reel) // Add the fully configured reel to the global reels array.
  }

  // Attach the main reel update loop to the PixiJS ticker.
  // This function ensures continuous scrolling and symbol recycling during spins.
  _app.ticker.add(() => {
    for (let i = 0; i < reels.length; i++) {
      const r = reels[i]

      // Calculate vertical displacement of the reel since the last frame.
      const deltaY = r.position - r.previousPosition
      r.previousPosition = r.position // Update for next frame's calculation.

      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT

      for (let j = 0; j < r.symbols.length; j++) {
        const symbol = r.symbols[j]

        // Move the symbol vertically based on the reel's scroll delta.
        symbol.y += deltaY

        // Implement continuous symbol recycling:
        // If a symbol moves off the top, reposition it to the bottom of the strip.
        if (symbol.y + CELL_HEIGHT / 2 < 0) {
          symbol.y += totalStripHeight
          // Only assign a new random texture if the reel is actively spinning.
          if (r.spinTween) {
            symbol.texture = _slotTextures[Math.floor(Math.random() * _slotTextures.length)]
          }
        }
        // If a symbol moves off the bottom, reposition it to the top of the strip.
        else if (symbol.y - CELL_HEIGHT / 2 > CELL_HEIGHT * NUM_VISIBLE_SYMBOLS) {
          symbol.y -= totalStripHeight
          // Only assign a new random texture if the reel is actively spinning.
          if (r.spinTween) {
            symbol.texture = _slotTextures[Math.floor(Math.random() * _slotTextures.length)]
          }
        }
      }
    }
  })
}
