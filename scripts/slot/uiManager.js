// Cached references to core DOM elements.
// These are initialized once during `initUIManager`.
let spinButton
let autoWinButton
let winMessageDisplay
let winMessageText
let balanceDisplay
let messageBox
let messageText
let messageOkButton

/**
 * Updates the displayed player balance.
 * @param {number} newBalance - The balance value to render.
 */
export function updateBalanceDisplay(newBalance) {
  if (balanceDisplay) {
    balanceDisplay.textContent = newBalance
  }
}

/**
 * Displays a modal game message to the user.
 * @param {string} message - Text content for the message box.
 */
export function showGameMessage(message) {
  if (messageText && messageBox) {
    messageText.textContent = message
    messageBox.style.display = 'block' // Makes the message box visible.
  }
}

/**
 * Hides the modal game message.
 */
export function hideGameMessage() {
  if (messageBox) {
    messageBox.style.display = 'none' // Hides the message box.
  }
}

/**
 * Displays and styles a win/loss outcome message with a fade-out.
 * @param {string} message - The text message indicating outcome.
 * @param {boolean} isWin - True for win styling, false for loss.
 */
export function showWinLossMessage(message, isWin) {
  winMessageText.textContent = message

  // Resets previous background styles.
  winMessageDisplay.classList.remove('win-bg', 'lose-bg')

  // Applies context-specific styling.
  if (isWin) {
    winMessageDisplay.classList.add('win-bg')
  } else {
    winMessageDisplay.classList.add('lose-bg')
  }

  winMessageDisplay.style.opacity = '1' // CSS fade-in.

  // Auto-hides message after a set duration and removes styling.
  setTimeout(() => {
    winMessageDisplay.style.opacity = '0' // CSS fade-out.
    winMessageDisplay.classList.remove('win-bg', 'lose-bg') // Cleans up styling.
  }, 3000) // Message visible for 3 seconds.
}

/**
 * Toggles the enabled state of the primary spin buttons.
 * @param {boolean} enable - If true, buttons are enabled; otherwise, disabled.
 */
export function setSpinButtonsEnabled(enable) {
  if (spinButton) spinButton.disabled = !enable
  if (autoWinButton) autoWinButton.disabled = !enable
}

/**
 * Ensures the win/loss message is hidden and its styling is reset.
 */
export function hideWinLossMessage() {
  if (winMessageDisplay) {
    winMessageDisplay.style.opacity = '0'
    winMessageDisplay.classList.remove('win-bg', 'lose-bg')
  }
}

/**
 * Initializes the UI manager by caching DOM element references and attaching event listeners.
 * @param {function(): void} onSpinClick - Callback invoked on regular spin button click.
 * @param {function(): void} onAutoWinClick - Callback invoked on forced win button click.
 */
export function initUIManager(onSpinClick, onAutoWinClick) {
  // Cache DOM element references by ID.
  spinButton = document.getElementById('spinButton')
  autoWinButton = document.getElementById('autoWin')
  winMessageDisplay = document.getElementById('result')
  winMessageText = document.getElementById('resultMessage')
  balanceDisplay = document.getElementById('balance')
  messageBox = document.getElementById('message-box')
  messageText = document.getElementById('message-text')
  messageOkButton = document.getElementById('message-ok-button')

  // Attach event listener for the modal message's OK button.
  if (messageOkButton) {
    messageOkButton.addEventListener('click', hideGameMessage)
  }

  // Configure main spin button.
  if (spinButton) {
    spinButton.addEventListener('click', onSpinClick)
    setSpinButtonsEnabled(true) // Initial state set to enabled.
  } else {
    console.error(
      "Spin button with ID 'spinButton' not found in HTML. Slot game cannot be started."
    )
  }

  // Configure auto-win (debug/demo) button.
  if (autoWinButton) {
    autoWinButton.addEventListener('click', onAutoWinClick)
    setSpinButtonsEnabled(true) // Initial state set to enabled.
  } else {
    // This button is optional for core game functionality, hence a softer error.
    console.error("'autoWin' button not found in HTML. Auto-win feature will be unavailable.")
  }
}
