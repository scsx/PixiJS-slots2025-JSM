import { Assets } from 'pixi.js'
import * as UIManager from './uiManager.js'
import * as ReelManager from './reelManager.js'
import * as Fireworks from '../fireworks/fireworks.js'

// Symbol images.
const symbolImagePaths = [
  'assets/fruits/apple.png',
  'assets/fruits/coconut.png',
  'assets/fruits/kiwi.png',
  'assets/fruits/avocado.png',
  'assets/fruits/corn.png'
]
let slotTextures = [] // Populated with PIXI.Texture objects after asset load.

const SPIN_COST = 100
let balance = 1000 // Player's current balance.

let spinning = false // Controls active spin state to prevent re-triggering.

// Cached PixiJS Application and canvas center references, passed from main entry.
let _appInstance
let _canvasCenterInstance

/**
 * Initiates a slot machine spin.
 * Manages game state, balance deduction, UI updates, and reel animation.
 * @param {boolean} forceWin - If true, guarantees a winning combination for testing/demo.
 */
async function startSpin(forceWin = false) {
  if (spinning) return // Prevent concurrent spins.

  if (balance < SPIN_COST) {
    UIManager.showGameMessage('Saldo insuficiente para girar!')
    return
  }

  balance -= SPIN_COST
  UIManager.updateBalanceDisplay(balance) // Reflects balance change in UI.

  spinning = true // Lock spin state.
  UIManager.setSpinButtonsEnabled(false) // Disable UI interaction during spin.
  UIManager.hideWinLossMessage() // Clear previous result messages.

  // Determines the stopping positions for each reel.
  const results = []
  if (forceWin) {
    // Forces all reels to land on the same random symbol for a guaranteed win.
    const winningSymbolIndex = Math.floor(Math.random() * slotTextures.length)
    for (let i = 0; i < 3; i++) {
      results.push(winningSymbolIndex)
    }
  } else {
    // Randomly selects a stopping symbol for each reel.
    for (let i = 0; i < 3; i++) {
      results.push(Math.floor(Math.random() * slotTextures.length))
    }
  }

  // Awaits completion of all reel animations.
  await ReelManager.startReelSpin(results, forceWin)

  // After reels stop, evaluate outcome and reset state.
  spinning = false // Unlock spin state.
  checkWin() // Determine if the spin resulted in a win.
  UIManager.setSpinButtonsEnabled(true) // Re-enable UI interaction.
}

/**
 * Evaluates the outcome of a spin by comparing visible symbols on the win line.
 * Triggers win/loss UI feedback and fireworks for wins.
 */
function checkWin() {
  // Retrieves the textures currently aligned on the win line from ReelManager.
  const actualVisibleTextures = ReelManager.getVisibleTexturesAtWinLine()

  // Checks if all visible symbols match (indicating a win).
  const firstActualTexture = actualVisibleTextures[0]
  const allMatch = actualVisibleTextures.every(
    (texture) => texture !== null && texture === firstActualTexture
  )

  if (allMatch) {
    const winAmount = 500 // Example payout for a winning combination.
    balance += winAmount
    UIManager.updateBalanceDisplay(balance) // Update balance with winnings.
    UIManager.showWinLossMessage(`GANHASTE ${winAmount}!`, true) // Display win message.

    // Triggers the celebratory fireworks sequence.
    Fireworks.triggerFireworksSequence()
  } else {
    UIManager.showWinLossMessage('AZAR!', false) // Display loss message.
  }
}

/**
 * Asynchronously initializes the slot game module.
 * Loads assets, sets up UI handlers, and initializes sub-modules (ReelManager, Fireworks).
 * @param {PIXI.Application} app - The main PixiJS Application instance.
 * @param {object} canvasCenter - Object containing the x, y coordinates of the canvas center.
 */
export async function initSlotGame(app, canvasCenter) {
  _appInstance = app // Store reference to PixiJS app.
  _canvasCenterInstance = canvasCenter // Store reference to canvas center.

  // Loads all symbol textures required for the reels.
  const loadedAssets = await Assets.load(symbolImagePaths)
  slotTextures = symbolImagePaths.map((path) => loadedAssets[path])

  // Initializes the UI manager with callbacks for spin actions.
  UIManager.initUIManager(
    () => startSpin(false), // Callback for a regular spin.
    () => startSpin(true) // Callback for a forced win spin.
  )

  // Initializes the reel management system with PixiJS app and loaded textures.
  ReelManager.initReelManager(_appInstance, slotTextures)

  // Initializes the fireworks module, ensuring its assets are loaded and ready.
  await Fireworks.initFireworks(_appInstance, _canvasCenterInstance)

  // Sets initial display value for player balance.
  UIManager.updateBalanceDisplay(balance)
}
