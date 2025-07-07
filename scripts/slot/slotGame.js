import { Assets } from 'pixi.js'
import * as UIManager from './uiManager.js'
import * as ReelManager from './reelManager.js'

// --- Game Variables ---
const symbolImagePaths = [
  'assets/fruits/apple.png',
  'assets/fruits/coconut.png',
  'assets/fruits/kiwi.png',
  'assets/fruits/avocado.png',
  'assets/fruits/corn.png'
]
let slotTextures = [] // Will be populated after assets load

const SPIN_COST = 100
let balance = 1000 // Initial player balance

let spinning = false // Game state variable to control spinning.

// --- Core Game Functions ---

/**
 * Initiates the slot machine spin animation.
 * This function handles disabling buttons, hiding messages, and starting reel movements.
 * @param {boolean} forceWin - If true, ensures a winning combination.
 */
async function startSpin(forceWin = false) {
  if (spinning) return // Prevent new spin if already spinning.

  if (balance < SPIN_COST) {
    UIManager.showGameMessage('Saldo insuficiente para girar!')
    return
  }

  balance -= SPIN_COST
  UIManager.updateBalanceDisplay(balance) // Update balance display via UIManager

  spinning = true // Set spinning state to true.
  UIManager.setSpinButtonsEnabled(false) // Disable spin buttons via UIManager
  UIManager.hideWinLossMessage() // Hide any previous win messages via UIManager

  // Determine results for each reel.
  const results = []
  if (forceWin) {
    // Ensure a win: all symbols will be the same (the first one in the texture list)
    const winningSymbolIndex = Math.floor(Math.random() * slotTextures.length)
    for (let i = 0; i < 3; i++) {
      results.push(winningSymbolIndex)
    }
  } else {
    // Normal random results
    for (let i = 0; i < 3; i++) {
      results.push(Math.floor(Math.random() * slotTextures.length))
    }
  }

  // Start reel spin and wait for it to complete
  await ReelManager.startReelSpin(results, forceWin)

  // Once all reels have stopped, proceed to check for a win.
  spinning = false // Reset spinning state.
  checkWin() // Call checkWin.
  UIManager.setSpinButtonsEnabled(true) // Re-enable spin buttons via UIManager.
}

/**
 * Checks for a winning combination on the reels.
 * Reads the currently visible symbols from ReelManager.
 */
function checkWin() {
  const actualVisibleTextures = ReelManager.getVisibleTexturesAtWinLine()

  // Now, check if all actual visible textures are the same and not null
  const firstActualTexture = actualVisibleTextures[0]
  const allMatch = actualVisibleTextures.every(
    (texture) => texture !== null && texture === firstActualTexture
  )

  if (allMatch) {
    const winAmount = 500 // Example win value
    balance += winAmount
    UIManager.updateBalanceDisplay(balance) // Update balance via UIManager
    UIManager.showWinLossMessage(`GANHASTE ${winAmount}!`, true) // Pass true for win
  } else {
    UIManager.showWinLossMessage('AZAR!', false) // Pass false for loss
  }
}

/**
 * Initializes the slot game. This function should be called once the PixiJS Application
 * is set up and HTML elements are ready.
 * @param {Application} appInstance - The main PixiJS Application instance.
 * @param {{x: number, y: number}} canvasCenterInstance - Object containing the x, y coordinates of the canvas center.
 */
export async function initSlotGame(appInstance, canvasCenterInstance) {
  // Load symbol textures here.
  const loadedAssets = await Assets.load(symbolImagePaths)
  slotTextures = symbolImagePaths.map((path) => loadedAssets[path])

  // Initialize UIManager, passing callbacks for spin buttons
  UIManager.initUIManager(
    () => startSpin(false), // Callback for regular spin
    () => startSpin(true) // Callback for forced win spin
  )

  // Initialize ReelManager with PixiJS app and loaded textures
  ReelManager.initReelManager(appInstance, slotTextures)

  // Set initial bet cost and balance displays
  UIManager.setBetCostDisplay(SPIN_COST)
  UIManager.updateBalanceDisplay(balance)

  console.log('PixiJS Slots Demo module initialized and ready to play!')
}
