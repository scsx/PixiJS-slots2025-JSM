// slot.js
// Este ficheiro contém toda a lógica do jogo de slot PixiJS.

// Importa as classes necessárias do PixiJS.
import { Application, Assets, Container, Sprite, Text, TextStyle, Graphics } from 'pixi.js'

// Variáveis globais para armazenar a instância da aplicação PixiJS e o centro do canvas.
let _app
let _canvasCenter

// --- Variáveis do Jogo e Elementos da UI (Serão acedidos a partir do HTML) ---
let spinButton
let winMessageDisplay
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

const REEL_WIDTH = 250 // Largura definida para cada rolo individual.
const SYMBOL_SIZE = 160 // Tamanho uniforme para cada símbolo, agora influenciando o espaçamento do texto.
// Ajustado de 220 para 160, correspondendo ao tamanho das imagens.
const NUM_VISIBLE_SYMBOLS = 3 // Número de símbolos visíveis por bobina na área de jogo.
const NUM_SYMBOLS_PER_REEL_STRIP = 5 // Aumentado para 10 para um loop mais suave e evitar lacunas visuais.
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
 */
function startSpin() {
  if (spinning) return // Impede um novo giro se já estiver a girar.

  if (balance < SPIN_COST) {
    showMessage('Saldo insuficiente para girar!')
    return
  }

  balance -= SPIN_COST
  updateBalanceDisplay()

  spinning = true // Define o estado de giro como verdadeiro.
  spinButton.disabled = true // Desativa o botão de giro.
  winMessageDisplay.style.opacity = '0' // Oculta quaisquer mensagens de vitória anteriores.

  // Determina os resultados aleatórios para cada bobina.
  const results = reels.map(() => Math.floor(Math.random() * slotTextures.length))

  let reelsStopping = 0 // Contador para rolos que terminaram de girar.

  reels.forEach((reel, index) => {
    const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * SYMBOL_SIZE

    // Determine a posição Y alvo para o *símbolo vencedor* dentro da tira da bobina.
    // O símbolo vencedor deve aparecer no centro da área visível (índice 1 de 3 símbolos visíveis).
    // Então, o topo do seu slot deve estar em SYMBOL_SIZE * 1.
    const winningSymbolTargetYInStrip = results[index] * SYMBOL_SIZE
    const offsetToCenterVisibleArea = SYMBOL_SIZE * 1 // Para o segundo símbolo (índice 1) em 3 visíveis.

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

        // A posição da bobina já foi definida para `targetPosition` pelo tweenTo.
        // O ticker continuará a usar esta posição.
        // Não é necessário destruir e recriar símbolos aqui.
        // O loop do ticker irá posicioná-los corretamente com base na reel.position final.

        if (reelsStopping === reels.length) {
          // Se todos os rolos pararam, procede para verificar a vitória.
          spinning = false // Reinicia o estado de giro.
          checkWin(results) // Realiza a verificação de vitória, passando os resultados.
          spinButton.disabled = false // Reativa o botão de giro para a próxima ronda.
        }
      }
    )
  })
}

/**
 * Verifica por uma combinação vencedora nos rolos.
 * @param {Array<number>} finalResults - Os índices das texturas resultantes para cada bobina.
 */
function checkWin(finalResults) {
  // Condição de vitória simples: todos os símbolos visíveis na linha do meio devem ser os mesmos.
  const firstSymbolId = finalResults[0]
  const allMatch = finalResults.every((symbolId) => symbolId === firstSymbolId)

  if (allMatch) {
    // Para uma slot real, você teria um mapa de pagamentos para cada símbolo.
    // Aqui, apenas um pagamento fixo por combinação.
    const winAmount = 500 // Exemplo de valor de vitória
    balance += winAmount
    updateBalanceDisplay()
    showWinMessage(`GANHOU ${winAmount}!`)
    // Se quiseres ativar animações de fogos de artifício, descomenta a linha abaixo
    // e a importação no topo do ficheiro (e garante que fireworks.js existe e exporta runFireworksLoop)
    // runFireworksLoop(_app, _canvasCenter);
  } else {
    showWinMessage('Tente novamente!')
  }
}

/**
 * Exibe uma mensagem de vitória/derrota no elemento HTML.
 * A mensagem aparecerá gradualmente devido às transições CSS.
 * @param {string} message - O texto da mensagem a exibir.
 */
function showWinMessage(message) {
  winMessageDisplay.textContent = message // Define o conteúdo de texto da mensagem.
  winMessageDisplay.style.opacity = '1' // Torna a mensagem visível (aciona o fade-in CSS).
  setTimeout(() => (winMessageDisplay.style.opacity = '0'), 3000) // Oculta automaticamente após 3 segundos.
}

/**
 * Inicializa o jogo de slot. Esta função deve ser chamada uma vez que a Aplicação PixiJS
 * esteja configurada e os elementos HTML estejam prontos.
 * @param {Application} appInstance - A instância principal da Aplicação PixiJS.
 * @param {{x: number, y: number}} canvasCenterInstance - Objeto contendo as coordenadas x, y do centro do canvas.
 */
export async function initSlotGame(appInstance, canvasCenterInstance) {
  _app = appInstance // Armazena a instância da aplicação PixiJS globalmente neste módulo.
  _canvasCenter = canvasCenterInstance // Armazena as coordenadas do centro do canvas globalmente neste módulo.

  // Obtém referências aos elementos da UI HTML agora que o DOM está pronto.
  spinButton = document.getElementById('spinButton')
  winMessageDisplay = document.getElementById('winMessage')
  balanceDisplay = document.getElementById('balance') // Referência ao display do saldo
  betCostDisplay = document.getElementById('bet-cost') // Referência ao display do custo da aposta
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
  const visibleSlotHeight = SYMBOL_SIZE * NUM_VISIBLE_SYMBOLS
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
      spinTween: null // Propriedade para guardar o objeto tween atual para parar o rolo.
    }

    // Preenche o rolo com símbolos.
    for (let j = 0; j < NUM_SYMBOLS_PER_REEL_STRIP; j++) {
      // Adiciona mais símbolos para um loop suave.
      const symbol = new Sprite(slotTextures[Math.floor(Math.random() * slotTextures.length)])
      symbol.anchor.set(0.5) // Centra o sprite na sua posição.
      // A escala agora será 1, pois SYMBOL_SIZE (160) corresponde ao tamanho da imagem (160).
      symbol.scale.x = SYMBOL_SIZE / symbol.width
      symbol.scale.y = SYMBOL_SIZE / symbol.height

      symbol.x = REEL_WIDTH / 2 // Centra o símbolo horizontalmente na sua coluna de rolo.
      symbol.originalY = j * SYMBOL_SIZE // Guarda a posição Y base do símbolo na tira
      symbol.y = symbol.originalY + SYMBOL_SIZE / 2 // Posição inicial visual (centro do símbolo)
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

      // A posição 'r.position' é atualizada pela função 'tweenTo' durante o giro.
      // Este loop do ticker é responsável por renderizar os símbolos com base na 'reel.position'.
      // A animação de "giro" acontece porque r.position está a mudar ao longo do tempo.

      const totalStripHeight = NUM_SYMBOLS_PER_REEL_STRIP * SYMBOL_SIZE

      for (let j = 0; j < r.symbols.length; j++) {
        const symbol = r.symbols[j]

        // Calcula a posição Y atual do símbolo dentro da tira da bobina,
        // considerando o deslocamento de rolagem da bobina (r.position).
        // `symbol.originalY` é a posição base do símbolo no strip (topo da sua célula).
        // `r.position` é o deslocamento de rolagem da bobina.
        let currentSymbolTopY = symbol.originalY + r.position

        // Lógica para reciclagem contínua dos símbolos:
        // Se o símbolo saiu completamente pela parte superior da área visível,
        // move-o para a parte inferior da tira e atribui uma nova textura aleatória.
        // `currentSymbolTopY` é a posição do topo do símbolo.
        // Se o topo do símbolo está acima de -SYMBOL_SIZE, significa que o símbolo inteiro está fora do topo.
        if (currentSymbolTopY + SYMBOL_SIZE < 0) {
          // Check if bottom of symbol is above 0
          currentSymbolTopY += totalStripHeight
          symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)]
          // Update originalY for its new place in the strip.
          // This ensures the symbol maintains its relative position in the conceptual strip.
          symbol.originalY = currentSymbolTopY - r.position
        }
        // Se o símbolo saiu completamente pela parte inferior da área visível,
        // move-o para a parte superior da tira e atribui uma nova textura aleatória.
        // Esta condição deve verificar se o topo do símbolo está abaixo do fim da tira completa.
        else if (currentSymbolTopY > totalStripHeight) {
          // CORRIGIDO: Condição para reciclagem na parte inferior
          currentSymbolTopY -= totalStripHeight
          symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)]
          symbol.originalY = currentSymbolTopY - r.position
        }

        // Aplica a posição Y calculada ao símbolo, ajustando para a âncora central (0.5).
        symbol.y = currentSymbolTopY + SYMBOL_SIZE / 2
      }
    }
  })

  // Adiciona um event listener ao botão de giro no HTML.
  if (spinButton) {
    spinButton.addEventListener('click', startSpin)
    spinButton.disabled = false // Estado inicial: Ativa o botão de giro assim que o jogo é carregado.
  } else {
    console.error(
      "Botão de giro com ID 'spinButton' não encontrado no HTML. O jogo de slot não pode ser iniciado."
    )
  }

  console.log('Módulo PixiJS Slots Demo inicializado e pronto para jogar!')
}
