// References to DOM elements.
// They will be initialized in the initUIManager function.
let spinButton
let autoWinButton
let winMessageDisplay
let winMessageText
let balanceDisplay
let betCostDisplay
let messageBox
let messageText
let messageOkButton

/**
 * Updates the balance display.
 * @param {number} newBalance - The new balance value to display.
 */
export function updateBalanceDisplay(newBalance) {
  if (balanceDisplay) {
    balanceDisplay.textContent = newBalance
  }
}

/**
 * Displays the bet cost.
 * @param {number} cost - The bet cost to display.
 */
export function setBetCostDisplay(cost) {
  if (betCostDisplay) {
    betCostDisplay.textContent = cost
  }
}

/**
 * Displays a message in a custom dialog box.
 * @param {string} message - The message to be displayed.
 */
export function showGameMessage(message) {
  if (messageText && messageBox) {
    messageText.textContent = message
    messageBox.style.display = 'block'
  }
}

/**
 * Hides the message dialog box.
 */
export function hideGameMessage() {
  if (messageBox) {
    messageBox.style.display = 'none'
  }
}

/**
 * Displays a win/loss message on the HTML element.
 * The message will fade in due to CSS transitions.
 * @param {string} message - The text message to display.
 * @param {boolean} isWin - True if it's a win, false if it's a loss.
 */
export function showWinLossMessage(message, isWin) {
  winMessageText.textContent = message

  // Remove previous background classes
  winMessageDisplay.classList.remove('win-bg', 'lose-bg')

  // Add the appropriate background class
  if (isWin) {
    winMessageDisplay.classList.add('win-bg')
  } else {
    winMessageDisplay.classList.add('lose-bg')
  }

  winMessageDisplay.style.opacity = '1' // Make the message visible (triggers CSS fade-in).

  // Automatically hide after 3 seconds and remove background classes
  setTimeout(() => {
    winMessageDisplay.style.opacity = '0'
    winMessageDisplay.classList.remove('win-bg', 'lose-bg')
  }, 3000)
}

/**
 * Sets the enabled state of the spin buttons.
 * @param {boolean} enable - If true, buttons will be enabled; if false, they will be disabled.
 */
export function setSpinButtonsEnabled(enable) {
  if (spinButton) spinButton.disabled = !enable
  if (autoWinButton) autoWinButton.disabled = !enable
}

/**
 * Hides any previous win/loss messages and removes background classes.
 */
export function hideWinLossMessage() {
  if (winMessageDisplay) {
    winMessageDisplay.style.opacity = '0'
    winMessageDisplay.classList.remove('win-bg', 'lose-bg')
  }
}

/**
 * Initializes the UI Manager, getting DOM references and setting up event listeners.
 * @param {function(): void} onSpinClick - Callback for the regular spin button.
 * @param {function(): void} onAutoWinClick - Callback for the forced win button.
 */
export function initUIManager(onSpinClick, onAutoWinClick) {
  // Get references to HTML UI elements
  spinButton = document.getElementById('spinButton')
  autoWinButton = document.getElementById('autoWin')
  winMessageDisplay = document.getElementById('result')
  winMessageText = document.getElementById('resultMessage')
  balanceDisplay = document.getElementById('balance')
  betCostDisplay = document.getElementById('bet-cost')
  messageBox = document.getElementById('message-box')
  messageText = document.getElementById('message-text')
  messageOkButton = document.getElementById('message-ok-button')

  // Event listener for the message box OK button
  if (messageOkButton) {
    messageOkButton.addEventListener('click', hideGameMessage)
  }

  // Add event listeners to spin buttons
  if (spinButton) {
    spinButton.addEventListener('click', onSpinClick)
    setSpinButtonsEnabled(true) // Initial state: Enable spin button once game is loaded.
  } else {
    console.error(
      "Spin button with ID 'spinButton' not found in HTML. Slot game cannot be started."
    )
  }

  if (autoWinButton) {
    autoWinButton.addEventListener('click', onAutoWinClick)
    setSpinButtonsEnabled(true) // Enable "Win" button
  } else {
    console.warn("'autoWin' button not found in HTML.")
  }
}
