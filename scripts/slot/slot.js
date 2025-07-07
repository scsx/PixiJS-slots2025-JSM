// slot.js
// Este ficheiro contém toda a lógica do jogo de slot PixiJS.

// Importa as classes necessárias do PixiJS.
import {
  Application,
  Assets,
  Container,
  Sprite,
  Text,
  TextStyle,
  Graphics,
  BlurFilter
} from 'pixi.js' // Adicionado BlurFilter

// Variáveis globais para armazenar a instância da aplicação PixiJS e o centro do canvas.
let _app
let _canvasCenter

// --- Variáveis do Jogo e Elementos da UI (Serão acedidos a partir do HTML) ---
let spinButton
let autoWinButton // Novo: Referência para o botão "Win"
let winMessageDisplay // Referência para o div#result
let winMessageText // NOVO: Referência para o p#resultMessage
let balanceDisplay // Adicionado para atualizar o saldo
let betCostDisplay // Adicionado para exibir o custo da aposta
let messageBox // Adicionado para mensagens de aviso
let messageText
let messageOkButton
let spinning = false // Variável de estado do jogo para controlar o giro.

// --- Configuração Específica do Jogo de Slot ---

const symbolImagePaths = [
  'assets/fruits/apple.png',
  'assets/fruits/coconut.png',
  'assets/fruits/kiwi.png',
  'assets/fruits/avocado.png',
  'assets/fruits/corn.png'
]
let slotTextures = [] // Este array será preenchido após o carregamento dos assets.

const REEL_WIDTH = 280 // Largura definida para cada rolo individual. Mantido para espaçamento horizontal.
const SYMBOL_SIZE = 160 // Tamanho real das imagens dos símbolos (160x160 pixels).
const CELL_HEIGHT = 200 // A altura efetiva de cada "célula" na bobina, ditando o espaçamento vertical.
// Este valor é maior que SYMBOL_SIZE para criar a distância vertical.
const NUM_VISIBLE_SYMBOLS = 3 // Número de símbolos visíveis por bobina na área de jogo.
const NUM_SYMBOLS_PER_REEL_STRIP = 10 // Número total de símbolos na "tira" de cada bobina para um loop suave.
// Deve ser maior que NUM_VISIBLE_SYMBOLS para o efeito de rolagem.
const SPIN_DURATION_BASE = 2000 // Duração base do giro em milissegundos.
const SPIN_COST = 100
let balance = 1000 // Saldo inicial do jogador.

// Array para guardar os objetos dos rolos. Cada rolo será um PixiJS Container.
const reels = []
// Contentor principal para todos os rolos, permitindo que sejam posicionados como um grupo.
const reelContainer = new Container() // Usar Container diretamente

// --- Funções Utilitárias para Tweening (Animação) ---

/**
 * Uma função básica de interpolação linear.
 * @param {number} a - Valor inicial.
 * @param {number} b - Valor final.
 * @param {number} t - Fator de interpolação (0.0 a 1.0).
 * @returns {number} Valor interpolado.
 */
const lerp = (a, b, t) => a + (b - a) * t

/**
 * Uma função de easing para criar um efeito de "backout" (ultrapassar e assentar).
 * Usado para os rolos pararem suavemente com um ligeiro salto.
 * @param {number} amount - A força do overshoot (por exemplo, 0.5 para um salto padrão).
 * @returns {function(number): number} Uma função de easing que recebe o tempo `t` (0.0 a 1.0) e retorna o valor suavizado.
 */
const backout = (amount) => (t) => {
  t = t - 1 // Ajusta t para ser de -1 a 0
  return t * t * ((amount + 1) * t + amount) + 1
}

/**
 * Anima uma propriedade numérica de um objeto ao longo do tempo usando uma função de easing.
 * Esta é uma implementação de tweening simplificada para esta demonstração.
 * Para produção, considere uma biblioteca de tweening dedicada como GSAP.
 * @param {object} object - O objeto cuja propriedade será animada.
 * @param {string} property - O nome da propriedade a animar (ex: 'x', 'y', 'alpha').
 * @param {number} target - O valor alvo para a propriedade.
 * @param {number} time - A duração da animação em milissegundos.
 * @param {function(number): void} func - A função de easing a aplicar (ex: `lerp`, `backout`).
 * @param {function(): void} onComplete - Função de callback a ser executada quando a animação terminar.
 */
const tweenTo = (object, property, target, time, func, onComplete) => {
  const start = object[property]
  const startTime = Date.now()
  const endTime = startTime + time

  const animate = () => {
    const now = Date.now()
    if (now < endTime) {
      const t = (now - startTime) / time // Tempo normalizado (0 a 1)
      object[property] = lerp(start, target, func(t)) // Aplica easing
      requestAnimationFrame(animate) // Continua a animação
    } else {
      object[property] = target // Garante que termina exatamente no alvo
      if (onComplete) {
        onComplete() // Chama o callback de conclusão
      }
    }
  }
  requestAnimationFrame(animate) // Inicia a animação
}

// --- Funções Utilitárias da UI ---

/**
 * Atualiza o display do saldo.
 */
function updateBalanceDisplay() {
  if (balanceDisplay) {
    balanceDisplay.textContent = balance
  }
}

/**
 * Exibe uma mensagem numa caixa de diálogo personalizada.
 * @param {string} message - A mensagem a ser exibida.
 */
function showMessage(message) {
  if (messageText && messageBox) {
    messageText.textContent = message
    messageBox.style.display = 'block'
  }
}

/**
 * Esconde a caixa de diálogo de mensagem.
 */
function hideMessageBox() {
  if (messageBox) {
    messageBox.style.display = 'none'
  }
}

// --- Funções Essenciais do Jogo ---

/**
 * Inicia a animação do giro da máquina de slot.
 * Esta função lida com a desativação do botão, ocultação de mensagens e início dos movimentos dos rolos.
 * @param {boolean} forceWin - Se verdadeiro, garante uma combinação vencedora.
 */
function startSpin(forceWin = false) {
  if (spinning) return // Impede um novo giro se já estiver a girar.

  if (balance < SPIN_COST) {
    showMessage('Saldo insuficiente para girar!')
    return
  }

  balance -= SPIN_COST
  updateBalanceDisplay()

  spinning = true // Define o estado de giro como verdadeiro.
  spinButton.disabled = true // Desativa o botão de giro.
  if (autoWinButton) autoWinButton.disabled = true // Desativa o botão "Win" também
  winMessageDisplay.style.opacity = '0' // Oculta quaisquer mensagens de vitória anteriores.
  winMessageDisplay.classList.remove('win-bg', 'lose-bg') // Remove classes de background anteriores

  // Aplica o efeito de blur ao iniciar o giro
  reels.forEach((reel) => {
    reel.blurFilter.blur = 5 // Valor de blur inicial
  })

  // Determina os resultados para cada bobina.
  const results = []
  if (forceWin) {
    // Garante uma vitória: todos os símbolos serão o mesmo (o primeiro da lista de texturas)
    const winningSymbolIndex = Math.floor(Math.random() * slotTextures.length)
    for (let i = 0; i < 3; i++) {
      results.push(winningSymbolIndex)
    }
  } else {
    // Resultados aleatórios normais
    for (let i = 0; i < 3; i++) {
      results.push(Math.floor(Math.random() * slotTextures.length))
    }
  }

  let reelsStopping = 0 // Contador para rolos que terminaram de girar.

  reels.forEach((reel, index) => {
    const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT // Usa CELL_HEIGHT

    // Determine a posição Y alvo para o *símbolo vencedor* dentro da tira da bobina.
    // O símbolo vencedor deve aparecer no centro da área visível (índice 1 de 3 símbolos visíveis).
    // Então, o topo do seu slot deve estar em CELL_HEIGHT * 1.
    const winningSymbolTargetYInStrip = results[index] * CELL_HEIGHT // Usa CELL_HEIGHT
    const offsetToCenterVisibleArea = CELL_HEIGHT * 1 // Para o segundo símbolo (índice 1) em 3 visíveis. Usa CELL_HEIGHT

    // Calcula a `reel.position` final desejada (deslocamento de rolagem)
    // de forma que o topo do símbolo vencedor esteja em `offsetToCenterVisibleArea`.
    // `reel.position` = `offsetToCenterVisibleArea - winningSymbolTargetYInStrip`
    let finalDesiredReelPosition = offsetToCenterVisibleArea - winningSymbolTargetYInStrip

    // Para garantir que o tween sempre se move para a frente (aumenta reel.position) e faz várias rotações completas,
    // precisamos adicionar alturas de tira completas ao `finalDesiredReelPosition`.
    // Adiciona um número mínimo de rotações completas para garantir uma animação visível.
    const minFullSpins = 5
    let spinDistance = minFullSpins * totalStripHeight

    // Ajusta a distância para alinhar o símbolo final corretamente.
    // Pega a posição atual normalizada dentro de um ciclo da tira.
    let currentReelPositionNormalized = reel.position % totalStripHeight
    if (currentReelPositionNormalized < 0) {
      currentReelPositionNormalized += totalStripHeight // Normaliza para positivo
    }

    // Calcula a distância extra necessária para alinhar ao `finalDesiredReelPosition`.
    let distanceToAlign = finalDesiredReelPosition - currentReelPositionNormalized
    if (distanceToAlign < 0) {
      distanceToAlign += totalStripHeight // Se já passou do alvo no ciclo atual, adiciona um ciclo completo.
    }
    spinDistance += distanceToAlign

    const targetPosition = reel.position + spinDistance

    reel.spinTween = tweenTo(
      reel,
      'position',
      targetPosition,
      SPIN_DURATION_BASE + index * 500, // Duração do giro (efeito de paragem em cascata).
      backout(0.5), // Função de easing para um ligeiro efeito de salto no final do giro.
      () => {
        // Função de callback executada quando um rolo termina o seu giro.
        reelsStopping++ // Incrementa o contador de rolos parados.
        reel.spinTween = null // Limpa o tween para indicar que o rolo parou.

        // Anima o blur de volta para 0 quando o rolo para
        tweenTo(reel.blurFilter, 'blur', 0, 300, lerp, null)

        // --- LÓGICA PARA FORÇAR VITÓRIA APÓS O GIRO ---
        if (forceWin) {
          const winningTexture = slotTextures[results[index]] // A textura vencedora para este rolo

          // Encontra os símbolos que estão visíveis na área de jogo e define suas texturas.
          // O objetivo é que o símbolo do meio seja o vencedor, e os outros dois sejam aleatórios.
          const visibleSymbols = []
          // Coleta os símbolos que estão atualmente dentro da área visível da bobina
          // A área visível é de Y=0 a Y=NUM_VISIBLE_SYMBOLS * CELL_HEIGHT (relativo ao contêiner do rolo)
          // Consideramos uma pequena margem para garantir que pegamos os símbolos corretos.
          const visibleAreaMinY = -CELL_HEIGHT / 2 // Um pouco acima do topo para capturar o símbolo que "entra"
          const visibleAreaMaxY = (NUM_VISIBLE_SYMBOLS + 0.5) * CELL_HEIGHT // Um pouco abaixo da base

          for (const symbol of reel.symbols) {
            // Verifica se alguma parte do símbolo está dentro da área visível
            if (
              symbol.y + SYMBOL_SIZE / 2 > visibleAreaMinY &&
              symbol.y - SYMBOL_SIZE / 2 < visibleAreaMaxY
            ) {
              visibleSymbols.push(symbol)
            }
          }

          // Ordena os símbolos visíveis pela sua posição Y para garantir a ordem (topo para baixo)
          visibleSymbols.sort((a, b) => a.y - b.y)

          if (visibleSymbols.length >= NUM_VISIBLE_SYMBOLS) {
            // Define a textura do símbolo do meio para a textura vencedora
            visibleSymbols[1].texture = winningTexture // Índice 1 é o símbolo do meio (0-indexado)

            // Define as texturas dos símbolos superior e inferior para texturas aleatórias
            visibleSymbols[0].texture =
              slotTextures[Math.floor(Math.random() * slotTextures.length)]
            visibleSymbols[2].texture =
              slotTextures[Math.floor(Math.random() * slotTextures.length)]
          }
        }
        // --- FIM DA LÓGICA PARA FORÇAR VITÓRIA ---

        if (reelsStopping === reels.length) {
          // Se todos os rolos pararam, procede para verificar a vitória.
          spinning = false // Reinicia o estado de giro.
          checkWin() // Chama checkWin sem passar results, para que ela leia o estado visual.
          spinButton.disabled = false // Reativa o botão de giro para a próxima ronda.
          if (autoWinButton) autoWinButton.disabled = false // Reativa o botão "Win"
        }
      }
    )
  })
}

/**
 * Verifica por uma combinação vencedora nos rolos.
 * Não recebe `finalResults` diretamente, mas lê os símbolos visíveis.
 */
function checkWin() {
  const actualVisibleTextures = []
  reels.forEach((reel) => {
    let middleSymbolTexture = null
    // O meio da área visível para o símbolo é CELL_HEIGHT * 1 (para o 2º símbolo de 3 visíveis)
    // A posição Y do centro do símbolo no meio da área visível é CELL_HEIGHT * 1 + CELL_HEIGHT / 2.
    const targetCenterY = CELL_HEIGHT * 1 + CELL_HEIGHT / 2 // Usa CELL_HEIGHT
    const tolerance = 5 // Uma pequena tolerância para comparações de ponto flutuante

    // Encontra o símbolo que está mais próximo do centro da linha de vitória
    for (const symbol of reel.symbols) {
      if (Math.abs(symbol.y - targetCenterY) < tolerance) {
        middleSymbolTexture = symbol.texture
        break
      }
    }
    actualVisibleTextures.push(middleSymbolTexture)
  })

  // Agora, verifica se todas as texturas visíveis reais são as mesmas e não nulas
  const firstActualTexture = actualVisibleTextures[0]
  const allMatch = actualVisibleTextures.every(
    (texture) => texture !== null && texture === firstActualTexture
  )

  if (allMatch) {
    const winAmount = 500 // Exemplo de valor de vitória
    balance += winAmount
    updateBalanceDisplay()
    showWinMessage(`GANHOU ${winAmount}!`, true) // Passa true para indicar vitória
  } else {
    showWinMessage('Tente novamente!', false) // Passa false para indicar derrota
  }
}

/**
 * Exibe uma mensagem de vitória/derrota no elemento HTML.
 * A mensagem aparecerá gradualmente devido às transições CSS.
 * @param {string} message - O texto da mensagem a exibir.
 * @param {boolean} isWin - True se for uma vitória, false se for uma derrota.
 */
function showWinMessage(message, isWin) {
  winMessageText.textContent = message

  // Remove classes de background anteriores
  winMessageDisplay.classList.remove('win-bg', 'lose-bg')

  // Adiciona a classe de background apropriada
  if (isWin) {
    winMessageDisplay.classList.add('win-bg')
  } else {
    winMessageDisplay.classList.add('lose-bg')
  }

  winMessageDisplay.style.opacity = '1' // Torna a mensagem visível (aciona o fade-in CSS).

  // Oculta automaticamente após 3 segundos e remove as classes de background
  setTimeout(() => {
    winMessageDisplay.style.opacity = '0'
    winMessageDisplay.classList.remove('win-bg', 'lose-bg') // Remove a imagem também
  }, 3000)
}

/**
 * Inicializa o jogo de slot. Esta função deve ser chamada uma vez que a Aplicação PixiJS
 * esteja configurada e os elementos HTML estejam prontos.
 * @param {Application} appInstance - A instância principal da Aplicação PixiJS.
 * @param {{x: number, y: number}} canvasCenterInstance - Objeto contendo as coordenadas x, y do centro do canvas.
 */
export async function initSlotGame(appInstance, canvasCenterInstance) {
  _app = appInstance
  _canvasCenter = canvasCenterInstance

  // Obtém referências aos elementos da UI HTML agora que o DOM está pronto.
  spinButton = document.getElementById('spinButton')
  autoWinButton = document.getElementById('autoWin') // Novo: Referência para o botão "Win"
  winMessageDisplay = document.getElementById('result') // ATUALIZADO: Referência ao div#result
  winMessageText = document.getElementById('resultMessage') // NOVO: Referência ao p#resultMessage
  balanceDisplay = document.getElementById('balance') // Referência ao display do saldo
  betCostDisplay = document.getElementById('bet-cost') // Adicionado para exibir o custo da aposta
  messageBox = document.getElementById('message-box')
  messageText = document.getElementById('message-text')
  messageOkButton = document.getElementById('message-ok-button')

  // Define o custo da aposta e atualiza o saldo inicial
  if (betCostDisplay) {
    betCostDisplay.textContent = SPIN_COST
  }
  updateBalanceDisplay() // Atualiza o saldo inicial

  // Event listener para o botão OK da caixa de mensagem
  if (messageOkButton) {
    messageOkButton.addEventListener('click', hideMessageBox)
  }

  // Carrega as texturas das imagens aqui.
  const loadedAssets = await Assets.load(symbolImagePaths)
  slotTextures = symbolImagePaths.map((path) => loadedAssets[path])

  // Adiciona o contentor principal dos rolos ao stage do PixiJS.
  _app.stage.addChild(reelContainer)

  // Ajustes para posicionamento do Reel Container.
  const visibleSlotHeight = CELL_HEIGHT * NUM_VISIBLE_SYMBOLS // Usa CELL_HEIGHT
  const totalReelsWidth = REEL_WIDTH * 3 // Para 3 rolos
  // Ajuste para centralizar o contêiner dos rolos na tela.
  reelContainer.x = (_app.screen.width - totalReelsWidth) / 2
  reelContainer.y = (_app.screen.height - visibleSlotHeight) / 2

  // Cria rolos individuais.
  for (let i = 0; i < 3; i++) {
    // Para uma máquina de slot padrão de 3 rolos.
    const rc = new Container()
    rc.x = i * REEL_WIDTH // Posiciona cada rolo horizontalmente.
    reelContainer.addChild(rc)

    // Cria a máscara para cada bobina.
    // A máscara garante que apenas os símbolos dentro da área visível da bobina são mostrados.
    const reelMask = new Graphics()
    reelMask.beginFill(0x000000) // Cor da máscara não importa, apenas a forma
    // A máscara deve ser desenhada nas coordenadas locais do *rc* (o contêiner do rolo individual)
    reelMask.drawRoundedRect(0, 0, REEL_WIDTH, visibleSlotHeight, 15) // Arredondamento
    reelMask.endFill()
    rc.addChild(reelMask) // Adiciona a máscara como filho do contêiner do rolo individual (rc)
    rc.mask = reelMask // Aplica a máscara diretamente ao contêiner do rolo

    const reel = {
      container: rc,
      symbols: [], // Array para guardar os objetos de Sprite dos símbolos neste rolo.
      position: 0, // Posição de scroll atual do rolo.
      previousPosition: 0, // Posição de scroll anterior para rastreio.
      spinTween: null, // Propriedade para guardar o objeto tween atual para parar o rolo.
      blurFilter: new BlurFilter(0) // Inicializa o filtro de blur
    }
    rc.filters = [reel.blurFilter] // Aplica o filtro ao contêiner do rolo

    // Preenche o rolo com símbolos.
    for (let j = 0; j < NUM_SYMBOLS_PER_REEL_STRIP; j++) {
      // Adiciona mais símbolos para um loop suave.
      const symbol = new Sprite(slotTextures[Math.floor(Math.random() * slotTextures.length)])
      symbol.anchor.set(0.5) // Centra o sprite na sua posição.
      // A escala agora será 1, pois SYMBOL_SIZE (160) corresponde ao tamanho da imagem (160).
      symbol.scale.x = SYMBOL_SIZE / symbol.width
      symbol.scale.y = SYMBOL_SIZE / symbol.height

      symbol.x = REEL_WIDTH / 2 // Centra o símbolo horizontalmente na sua coluna de rolo.
      // A posição inicial do símbolo na tira, antes de qualquer rolagem.
      symbol.y = j * CELL_HEIGHT + CELL_HEIGHT / 2 // Posição inicial visual (centro do símbolo na célula)
      reel.symbols.push(symbol) // Adiciona o símbolo ao array de símbolos do rolo.
      rc.addChild(symbol) // Adiciona o sprite do símbolo ao contentor do rolo.
    }
    reels.push(reel) // Adiciona o objeto de rolo configurado ao array principal de rolos.
  }

  // Adiciona a função de loop do jogo ao ticker do PixiJS.
  // Esta função será chamada a cada frame para atualizar as posições e efeitos dos rolos.
  _app.ticker.add(() => {
    for (let i = 0; i < reels.length; i++) {
      const r = reels[i]

      // Calcula o quanto a bobina rolou neste frame.
      const deltaY = r.position - r.previousPosition
      r.previousPosition = r.position // Atualiza a posição anterior para o próximo frame.

      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * CELL_HEIGHT // Usa CELL_HEIGHT

      for (let j = 0; j < r.symbols.length; j++) {
        const symbol = r.symbols[j]

        // Move o símbolo pela quantidade que a bobina rolou neste frame.
        symbol.y += deltaY

        // Lógica para reciclagem contínua dos símbolos:
        // Se o símbolo saiu completamente pela parte superior da área visível,
        // move-o para a parte inferior da tira e atribui uma nova textura aleatória.
        // `symbol.y - CELL_HEIGHT / 2` é o topo da célula do símbolo.
        if (symbol.y + CELL_HEIGHT / 2 < 0) {
          // Se o centro do símbolo está acima do topo da área visível
          symbol.y += totalStripHeight // Move para a parte inferior da tira
          // Apenas muda a textura se o rolo ainda estiver a girar ativamente
          if (r.spinTween) {
            symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)]
          }
        }
        // Se o símbolo saiu completamente pela parte inferior da área visível,
        // move-o para a parte superior da tira e atribui uma nova textura aleatória.
        // `symbol.y + CELL_HEIGHT / 2` é o fundo da célula do símbolo.
        else if (symbol.y - CELL_HEIGHT / 2 > CELL_HEIGHT * NUM_VISIBLE_SYMBOLS) {
          // Se o centro do símbolo está abaixo do fundo da área visível
          symbol.y -= totalStripHeight // Move para a parte superior da tira
          // Apenas muda a textura se o rolo ainda estiver a girar ativamente
          if (r.spinTween) {
            symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)]
          }
        }
      }
    }
  })

  // Adiciona um event listener ao botão de giro no HTML.
  if (spinButton) {
    spinButton.addEventListener('click', () => startSpin(false)) // Passa false para giro normal
    spinButton.disabled = false // Estado inicial: Ativa o botão de giro assim que o jogo é carregado.
  } else {
    console.error(
      "Botão de giro com ID 'spinButton' não encontrado no HTML. O jogo de slot não pode ser iniciado."
    )
  }

  // Adiciona event listener para o novo botão "Win"
  if (autoWinButton) {
    autoWinButton.addEventListener('click', () => startSpin(true)) // Passa true para forçar vitória
    autoWinButton.disabled = false // Ativa o botão "Win"
  } else {
    console.warn("Botão 'autoWin' não encontrado no HTML.")
  }

  console.log('Módulo PixiJS Slots Demo inicializado e pronto para jogar!')
}
