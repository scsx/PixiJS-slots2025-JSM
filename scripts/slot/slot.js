// slot.js
// This file contains all the PixiJS slot game logic.

import { Application, Assets, Container, Sprite, Graphics } from 'pixi.js'

let _app
let _canvasCenter

// --- Game Variables and UI Elements ---
let spinButton
let autoWinButton
let winMessageDisplay
let winMessageText
let balanceDisplay
let betCostDisplay
let messageBox
let messageText
let messageOkButton
let spinning = false

// --- Slot Game Specific Configuration ---
const symbolImagePaths = [
  'assets/fruits/apple.png',
  'assets/fruits/coconut.png',
  'assets/fruits/kiwi.png',
  'assets/fruits/avocado.png',
  'assets/fruits/corn.png'
]
let slotTextures = []

const REEL_WIDTH = 280
const SYMBOL_SIZE = 160
const CELL_HEIGHT = 200
const NUM_VISIBLE_SYMBOLS = 3
const NUM_SYMBOLS_PER_REEL_STRIP = 10
const SPIN_DURATION_BASE = 2000
const SPIN_COST = 100
let balance = 1000

const reels = []
const reelContainer = new Container()

// --- Utility Functions for Tweening ---
const lerp = (a, b, t) => a + (b - a) * t

const backout = (amount) => (t) => {
  t = t - 1
  return t * t * ((amount + 1) * t + amount) + 1
}

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

// --- UI Utility Functions ---
function updateBalanceDisplay() {
  if (balanceDisplay) {
    balanceDisplay.textContent = balance
  }
}

function showMessage(message) {
  if (messageText && messageBox) {
    messageText.textContent = message
    messageBox.style.display = 'block'
  }
}

function hideMessageBox() {
  if (messageBox) {
    messageBox.style.display = 'none'
  }
}

// --- Core Game Functions ---
function startSpin(forceWin = false) {
  if (spinning) return

  if (balance < SPIN_COST) {
    showMessage('Saldo insuficiente para girar!')
    return
  }

  balance -= SPIN_COST
  updateBalanceDisplay()

  spinning = true
  spinButton.disabled = true
  if (autoWinButton) autoWinButton.disabled = true
  winMessageDisplay.style.opacity = '0'
  winMessageDisplay.classList.remove('win-bg', 'lose-bg')

  const results = []
  if (forceWin) {
    const winningSymbolIndex = Math.floor(Math.random() * slotTextures.length)
    for (let i = 0; i < 3; i++) {
      results.push(winningSymbolIndex)
    }
  } else {
    for (let i = 0; i < 3; i++) {
      results.push(Math.floor(Math.random() * slotTextures.length))
    }
  }

  let reelsStopping = 0

  reels.forEach((reel, index) => {
    const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT

    const winningSymbolTargetYInStrip = results[index] * CELL_HEIGHT
    const offsetToCenterVisibleArea = CELL_HEIGHT * 1

    let finalDesiredReelPosition = offsetToCenterVisibleArea - winningSymbolTargetYInStrip

    const minFullSpins = 5
    let spinDistance = minFullSpins * totalStripHeight

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
      SPIN_DURATION_BASE + index * 500,
      backout(0.5),
      () => {
        reelsStopping++
        reel.spinTween = null

        // --- LOGIC TO FORCE WIN AFTER SPIN ---
        if (forceWin) {
          const winningTexture = slotTextures[results[index]]

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

            const otherTextures = slotTextures.filter((t) => t !== winningTexture)
            visibleSymbols[0].texture =
              otherTextures[Math.floor(Math.random() * otherTextures.length)]
            visibleSymbols[2].texture =
              otherTextures[Math.floor(Math.random() * otherTextures.length)]
          }
        }
        // --- END OF FORCE WIN LOGIC ---

        if (reelsStopping === reels.length) {
          spinning = false
          checkWin()
          spinButton.disabled = false
          if (autoWinButton) autoWinButton.disabled = false
        }
      }
    )
  })
}

function checkWin() {
  const actualVisibleTextures = []
  reels.forEach((reel) => {
    let middleSymbolTexture = null
    const targetCenterY = CELL_HEIGHT * 1 + CELL_HEIGHT / 2
    const tolerance = 5

    for (const symbol of reel.symbols) {
      if (Math.abs(symbol.y - targetCenterY) < tolerance) {
        middleSymbolTexture = symbol.texture
        break
      }
    }
    actualVisibleTextures.push(middleSymbolTexture)
  })

  const firstActualTexture = actualVisibleTextures[0]
  const allMatch = actualVisibleTextures.every(
    (texture) => texture !== null && texture === firstActualTexture
  )

  if (allMatch) {
    const winAmount = 500
    balance += winAmount
    updateBalanceDisplay()
    showWinMessage(`GANHASTE ${winAmount}!`, true)
  } else {
    showWinMessage('AZAR!', false)
  }
}

function showWinMessage(message, isWin) {
  winMessageText.textContent = message

  winMessageDisplay.classList.remove('win-bg', 'lose-bg')

  if (isWin) {
    winMessageDisplay.classList.add('win-bg')
  } else {
    winMessageDisplay.classList.add('lose-bg')
  }

  winMessageDisplay.style.opacity = '1'

  setTimeout(() => {
    winMessageDisplay.style.opacity = '0'
    winMessageDisplay.classList.remove('win-bg', 'lose-bg')
  }, 3000)
}

export async function initSlotGame(appInstance, canvasCenterInstance) {
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  spinButton = document.getElementById('spinButton')
  autoWinButton = document.getElementById('autoWin')
  winMessageDisplay = document.getElementById('result')
  winMessageText = document.getElementById('resultMessage')
  balanceDisplay = document.getElementById('balance')
  betCostDisplay = document.getElementById('bet-cost')
  messageBox = document.getElementById('message-box')
  messageText = document.getElementById('message-text')
  messageOkButton = document.getElementById('message-ok-button')

  if (betCostDisplay) {
    betCostDisplay.textContent = SPIN_COST
  }
  updateBalanceDisplay()

  if (messageOkButton) {
    messageOkButton.addEventListener('click', hideMessageBox)
  }

  const loadedAssets = await Assets.load(symbolImagePaths)
  slotTextures = symbolImagePaths.map((path) => loadedAssets[path])

  _app.stage.addChild(reelContainer)

  const visibleSlotHeight = CELL_HEIGHT * NUM_VISIBLE_SYMBOLS
  const totalReelsWidth = REEL_WIDTH * 3
  reelContainer.x = (_app.screen.width - totalReelsWidth) / 2
  reelContainer.y = (_app.screen.height - visibleSlotHeight) / 2

  for (let i = 0; i < 3; i++) {
    const rc = new Container()
    rc.x = i * REEL_WIDTH
    reelContainer.addChild(rc)

    const reelMask = new Graphics()
    reelMask.beginFill(0x000000)
    reelMask.drawRoundedRect(0, 0, REEL_WIDTH, visibleSlotHeight, 15)
    reelMask.endFill()
    rc.addChild(reelMask)
    rc.mask = reelMask

    const reel = {
      container: rc,
      symbols: [],
      position: 0,
      previousPosition: 0,
      spinTween: null
    }

    for (let j = 0; j < NUM_SYMBOLS_PER_REEL_STRIP; j++) {
      const symbol = new Sprite(slotTextures[Math.floor(Math.random() * slotTextures.length)])
      symbol.anchor.set(0.5)
      symbol.scale.x = SYMBOL_SIZE / symbol.width
      symbol.scale.y = SYMBOL_SIZE / symbol.height

      symbol.x = REEL_WIDTH / 2
      symbol.y = j * CELL_HEIGHT + CELL_HEIGHT / 2
      reel.symbols.push(symbol)
      rc.addChild(symbol)
    }
    reels.push(reel)
  }

  _app.ticker.add(() => {
    for (let i = 0; i < reels.length; i++) {
      const r = reels[i]

      const deltaY = r.position - r.previousPosition
      r.previousPosition = r.position

      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT

      for (let j = 0; j < r.symbols.length; j++) {
        const symbol = r.symbols[j]

        symbol.y += deltaY

        if (symbol.y + CELL_HEIGHT / 2 < 0) {
          symbol.y += totalStripHeight
          if (r.spinTween) {
            symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)]
          }
        } else if (symbol.y - CELL_HEIGHT / 2 > CELL_HEIGHT * NUM_VISIBLE_SYMBOLS) {
          symbol.y -= totalStripHeight
          if (r.spinTween) {
            symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)]
          }
        }
      }
    }
  })

  if (spinButton) {
    spinButton.addEventListener('click', () => startSpin(false))
    spinButton.disabled = false
  } else {
    console.error(
      "Spin button with ID 'spinButton' not found in HTML. Slot game cannot be started."
    )
  }

  if (autoWinButton) {
    autoWinButton.addEventListener('click', () => startSpin(true))
    autoWinButton.disabled = false
  } else {
    console.warn("'autoWin' button not found in HTML.")
  }

  console.log('PixiJS Slots Demo module initialized and ready to play!')
}
