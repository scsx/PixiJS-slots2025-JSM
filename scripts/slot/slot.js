// slot.js
// Este ficheiro contém toda a lógica do jogo de slot PixiJS.

// Importa as classes necessárias do PixiJS.
// Certifique-se de que o seu importmap no index.html aponta corretamente para 'pixi.js'.
import { Application, Assets, Container, Sprite, Text, TextStyle } from 'pixi.js' // Adicione TextStyle aqui, pois é usado

// SE QUISERES REINTEGRAR OS FIREWORKS MAIS TARDE, DESCOMENTA A LINHA ABAIXO.
// E TERÁS DE MUDAR runFireworksLoop(_app, _canvasCenter); para PIXI.runFireworksLoop(_app, _canvasCenter);
// OU TERÁS DE FAZER runFireworksLoop um metodo dentro do teu ficheiro fireworks.js.
// Por agora, está comentado.
// import { runFireworksLoop } from './fireworks.js'; // Path relative to /scripts/

// Variáveis globais para armazenar a instância da aplicação PixiJS e o centro do canvas.
// Estas serão passadas para `initSlotGame` a partir do ficheiro principal da aplicação (index.js).
let _app
let _canvasCenter

// --- Variáveis do Jogo e Elementos da UI (Serão acedidos a partir do HTML) ---
let spinButton
let winMessageDisplay
let spinning = false // Variável de estado do jogo para controlar o giro.

// --- Configuração Específica do Jogo de Slot ---

// *** NOVO: ARRAY DE TEXTURAS PARA AS IMAGENS DOS SÍMBOLOS ***
// Assumindo que as suas imagens estão em 'assets/fruits/'
const symbolImagePaths = [
  'assets/fruits/apple.png',
  'assets/fruits/coconut.png',
  'assets/fruits/kiwi.png',
  'assets/fruits/avocado.png',
  'assets/fruits/corn.png'
]
let slotTextures = [] // Este array será preenchido após o carregamento dos assets.

// ESTILO PARA OS SÍMBOLOS DE TEXTO - REMOVIDO OU APENAS PARA DEBUG/Fallback
// const symbolTextStyle = new TextStyle({ // Usar TextStyle diretamente
//   fontFamily: 'Arial',
//   fontSize: 70, // Ajusta o tamanho para caber na área SYMBOL_SIZE
//   fill: 'white',
//   align: 'center',
//   fontWeight: 'bold',
//   stroke: '#4a4a4a',
//   strokeThickness: 5,
//   dropShadow: true,
//   dropShadowColor: '#000000',
//   dropShadowBlur: 4,
//   dropShadowAngle: Math.PI / 6,
//   dropShadowDistance: 6
// })

const REEL_WIDTH = 250 // Largura definida para cada rolo individual.
const SYMBOL_SIZE = 220 // Tamanho uniforme para cada símbolo, agora influenciando o espaçamento do texto.

// Array para guardar os objetos dos rolos. Cada rolo será um PixiJS Container.
const reels = []
// Contentor principal para todos os rolos, permitindo que sejam posicionados como um grupo.
const reelContainer = new Container() // AGORA USA Container diretamente

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
 * @param {number} amount - A força do overshoot (por exemplo, 1.7 para um salto padrão).
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
 * @param {function(number): number} func - A função de easing a aplicar (ex: `lerp`, `backout`).
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

// --- Funções Essenciais do Jogo ---

/**
 * Inicia a animação do giro da máquina de slot.
 * Esta função lida com a desativação do botão, ocultação de mensagens e início dos movimentos dos rolos.
 */
function startSpin() {
  if (spinning) return // Impede um novo giro se já estiver a girar.
  spinning = true // Define o estado de giro como verdadeiro.
  spinButton.disabled = true // Desativa o botão de giro.
  winMessageDisplay.style.opacity = '0' // Oculta quaisquer mensagens de vitória anteriores. // Define os pontos de paragem para cada rolo. // Para uma slot real, isto seria determinado pela lógica do jogo (ex: cálculos do lado do servidor). // Aqui, é simplificado para um índice de símbolo aleatório para cada rolo. // *** MODIFICADO PARA USAR O LENGTH DE slotTextures ***

  const results = reels.map(() => Math.floor(Math.random() * slotTextures.length)) // Obtém um índice aleatório para cada rolo.

  let reelsStopping = 0 // Contador para rolos que terminaram de girar. // Inicia o giro de cada rolo e programa a sua paragem usando um efeito em cascata.

  reels.forEach((reel, index) => {
    // Calcula a posição alvo para o rolo parar precisamente num símbolo específico.
    // `extraSpins` garante que o rolo gira por uma duração visível antes de parar.
    const extraSpins = Math.random() * 5 + 10 // Número de giros completos extra antes de parar (aleatório para variedade).
    const targetSymbolPosition = SYMBOL_SIZE * results[index] // Posição para o símbolo alvo. // A posição alvo final inclui a posição atual + giros completos + posição do símbolo alvo.
    const targetPosition =
      reel.position + SYMBOL_SIZE * reel.symbols.length * extraSpins + targetSymbolPosition // Usa a utilidade `tweenTo` para uma desaceleração suave e animação de paragem.

    reel.spinTween = tweenTo(
      reel,
      'position',
      targetPosition,
      2000 + index * 500, // Duração do giro (efeito de paragem em cascata: 1º para em 2s, 2º em 2.5s, 3º em 3s).
      backout(0.5), // Função de easing para um ligeiro efeito de salto no final do giro.
      () => {
        // Função de callback executada quando um rolo termina o seu giro.
        reelsStopping++ // Incrementa o contador de rolos parados.
        if (reelsStopping === reels.length) {
          // Se todos os rolos pararam, procede para verificar a vitória.
          spinning = false // Reinicia o estado de giro.
          checkWin() // Realiza a verificação de vitória.
          spinButton.disabled = false // Reativa o botão de giro para a próxima ronda.
        }
      }
    )
  })
}

/**
 * Verifica por uma combinação vencedora nos rolos.
 * MUDA ESTA LÓGICA PARA UMA VERIFICAÇÃO DE VITÓRIA REAL E MAIS COMPLEXA.
 * Esta é uma verificação de vitória muito básica para fins de demonstração:
 * atualmente verifica se todos os símbolos na linha visível do meio são os mesmos.
 */
function checkWin() {
  // Determina o conteúdo de TEXTURA dos símbolos atualmente visíveis na "linha de vitória" (ex: linha do meio).
  const visibleSymbolsTexture = reels.map((reel) => {
    let centralSymbolTexture = null // Itera pelos símbolos para encontrar aquele localizado na área central de visualização. // Assumindo que queremos o símbolo que se alinha com a linha do meio dos 3 símbolos visíveis. // O SYMBOL_SIZE * 1 é a posição Y para o segundo símbolo (índice 1) numa exibição de 3.
    for (const symbol of reel.symbols) {
      // Ajuste de tolerância para a verificação de vitória devido à animação/posicionamento flutuante.
      // Verificamos se o centro do símbolo (symbol.y) está perto da posição central esperada.
      const expectedCenterY = SYMBOL_SIZE * 1 // Posição Y para o centro do segundo símbolo.
      if (Math.abs(symbol.y - expectedCenterY) < SYMBOL_SIZE / 4) {
        // Tolerância de 1/4 do tamanho do símbolo
        centralSymbolTexture = symbol.texture // *** AGORA COMPARA A TEXTURA ***
        break
      }
    }
    return centralSymbolTexture
  }) // Condição de vitória simples: todos os símbolos visíveis na linha do meio devem ter a mesma textura (e não ser nulo).

  const isWin = visibleSymbolsTexture.every(
    (texture) => texture !== null && texture === visibleSymbolsTexture[0]
  )

  if (isWin) {
    showWinMessage('BIG WIN!') // MUDA ESTA LINHA: AQUI É ONDE VAIS CHAMAR runFireworksLoop(_app, _canvasCenter) // QUANDO QUISERES ATIVAR A ANIMAÇÃO DE FIREWORKS NA VITÓRIA. // Para já, está comentado. Para ativar, descomenta a importação no topo deste ficheiro também. // runFireworksLoop(_app, _canvasCenter); // CONSIDERAR: Adicionar mais animações visuais aos símbolos vencedores (ex: brilho, pulsação).
  } else {
    showWinMessage('Try Again!') // Ou "No Win", dependendo da mensagem desejada.
  }
}

/**
 * Exibe uma mensagem de vitória/derrota no elemento HTML.
 * A mensagem aparecerá gradualmente devido às transições CSS.
 * @param {string} message - O texto da mensagem a exibir.
 */
function showWinMessage(message) {
  winMessageDisplay.textContent = message // Define o conteúdo de texto da mensagem.
  winMessageDisplay.style.opacity = '1' // Torna a mensagem visível (aciona o fade-in CSS). // Opcional: Adicionar um `setTimeout` aqui para ocultar automaticamente a mensagem após alguns segundos. // Exemplo: setTimeout(() => winMessageDisplay.style.opacity = '0', 3000);
}

/**
 * Inicializa o jogo de slot. Esta função deve ser chamada uma vez que a Aplicação PixiJS
 * esteja configurada e os elementos HTML estejam prontos.
 * @param {Application} appInstance - A instância principal da Aplicação PixiJS.
 * @param {{x: number, y: number}} canvasCenterInstance - Objeto contendo as coordenadas x, y do centro do canvas.
 */
export async function initSlotGame(appInstance, canvasCenterInstance) {
  _app = appInstance // Armazena a instância da aplicação PixiJS globalmente neste módulo.
  _canvasCenter = canvasCenterInstance // Armazena as coordenadas do centro do canvas globalmente neste módulo. // Obtém referências aos elementos da UI HTML agora que o DOM está pronto.

  spinButton = document.getElementById('spinButton')
  winMessageDisplay = document.getElementById('winMessage') // *** NOVO: CARREGAR AS TEXTURAS DAS IMAGENS AQUI *** // Assets.load retorna um objeto onde as chaves são os aliases (ou os próprios caminhos se não houver alias) // e os valores são as Texturas carregadas.

  const loadedAssets = await Assets.load(symbolImagePaths) // Usar Assets diretamente
  slotTextures = symbolImagePaths.map((path) => loadedAssets[path]) // Adiciona o contentor principal dos rolos ao stage do PixiJS.

  _app.stage.addChild(reelContainer) // *** AJUSTES AQUI PARA POSICIONAMENTO DO REEL CONTAINER *** // Queremos 3 rolos, cada um mostrando 3 símbolos. // A altura total visível dos símbolos será SYMBOL_SIZE * 3.

  const visibleSlotHeight = SYMBOL_SIZE * 3
  const totalReelsWidth = REEL_WIDTH * 3 // Para 3 rolos

  reelContainer.x = (_app.screen.width - totalReelsWidth) / 2 // Centra 3 rolos horizontalmente // Posiciona verticalmente para que os 3 símbolos visíveis estejam centrados no ecrã.
  reelContainer.y = (_app.screen.height - visibleSlotHeight) / 2 // Cria rolos individuais.

  for (let i = 0; i < 3; i++) {
    // Para uma máquina de slot padrão de 3 rolos.
    const rc = new Container() // AGORA USA Container diretamente
    rc.x = i * REEL_WIDTH // Posiciona cada rolo horizontalmente.
    reelContainer.addChild(rc) // Define um objeto de rolo para guardar o seu estado e propriedades.

    const reel = {
      container: rc,
      symbols: [], // Array para guardar os objetos de texto dos símbolos neste rolo.
      position: 0, // Posição de scroll atual do rolo.
      previousPosition: 0, // Posição de scroll anterior para rastreio. // REMOVIDO: O filtro de blur não será mais usado, então não o inicializamos // blur: new PIXI.filters.BlurFilter(0),
      spinTween: null // Propriedade para guardar o objeto tween atual para parar o rolo.
    } // REMOVIDO: A linha que aplicava o filtro ao contentor do rolo // rc.filters = [reel.blur]; // Preenche o rolo com símbolos. // Adicionamos símbolos extra (ex: 5) para criar um efeito de loop contínuo durante o giro. // Mantive 5 símbolos para ter alguma folga para o loop, mesmo que 3 sejam visíveis.
    for (let j = 0; j < 5; j++) {
      // *** AGORA CRIA UM Sprite com uma textura aleatória ***
      const symbol = new Sprite(slotTextures[Math.floor(Math.random() * slotTextures.length)]) // Usar Sprite diretamente
      symbol.anchor.set(0.5) // Centra o sprite na sua posição. // Como todas as imagens têm 160x160 e SYMBOL_SIZE é 220, vamos dimensionar para preencher o espaço. // Isso fará com que as imagens sejam ligeiramente esticadas/comprimidas para 220x220 se o tamanho original não corresponder. // Ou simplesmente escalamos para SYMBOL_SIZE/width se assumirmos que 160x160 são a referência. // Se SYMBOL_SIZE for 220, e a imagem 160x160, para preencher a área de 220, o fator de escala é 220/160 = 1.375
      symbol.scale.x = SYMBOL_SIZE / symbol.width
      symbol.scale.y = SYMBOL_SIZE / symbol.height

      symbol.y = j * SYMBOL_SIZE + SYMBOL_SIZE / 2 // Posiciona símbolos, compensando âncora 0.5.
      symbol.x = REEL_WIDTH / 2 // Centra o símbolo horizontalmente na sua coluna de rolo.
      reel.symbols.push(symbol) // Adiciona o símbolo ao array de símbolos do rolo.
      rc.addChild(symbol) // Adiciona o objeto de texto do símbolo ao contentor do rolo.
    }
    reels.push(reel) // Adiciona o objeto de rolo configurado ao array principal de rolos.
  } // Adiciona a função de loop do jogo ao ticker do PixiJS. // Esta função será chamada a cada frame para atualizar as posições e efeitos dos rolos.

  _app.ticker.add(() => {
    // Só atualiza as posições dos rolos se o jogo estiver atualmente a girar.
    if (!spinning) return // Se não está a girar, sai daqui e não atualiza os rolos.

    for (let i = 0; i < reels.length; i++) {
      const r = reels[i]
      const delta = _app.ticker.deltaTime

      r.position += 20 * delta // Velocidade de exemplo, ajusta conforme necessário. // Certifica-te que a posição é sempre positiva para o cálculo do módulo // Esta é a altura total de TODOS os símbolos na tira de símbolos.

      const totalSymbolsHeight = r.symbols.length * SYMBOL_SIZE
      r.position = r.position % totalSymbolsHeight
      if (r.position < 0) {
        r.position += totalSymbolsHeight
      } // Aplica posições aos símbolos

      for (let j = 0; j < r.symbols.length; j++) {
        const symbol = r.symbols[j]
        const prevY = symbol.y // Armazena a posição Y anterior para a lógica de reset // *** AJUSTE PRINCIPAL AQUI para o cálculo da posição Y *** // A posição Y de cada símbolo é baseada na sua posição inicial 'j * SYMBOL_SIZE', // somada ao offset de scroll do rolo 'r.position'. // O módulo garante o loop dentro da 'tira' de símbolos. // A subtração de SYMBOL_SIZE é para compensar o fato de os símbolos começarem // 1 SYMBOL_SIZE acima do topo da área visível para "cair" para a posição 0. // Lembre-se que `symbol.anchor.set(0.5)` significa que `symbol.y` é o centro.

        symbol.y = (j * SYMBOL_SIZE + r.position) % totalSymbolsHeight // Se o símbolo passou completamente acima da área visível (o topo do seu corpo, não o centro da âncora). // Assumimos que a área visível do rolo começa em y=0 do `rc` (contentor do rolo).

        if (symbol.y < -SYMBOL_SIZE / 2 && prevY >= -SYMBOL_SIZE / 2) {
          // Move-o para a parte inferior da tira de símbolos para reaparecer
          symbol.y += totalSymbolsHeight // *** AGORA MUDA A TEXTURA DO SPRITE ***
          symbol.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)] // Já que todas as imagens têm o mesmo tamanho original (160x160) e são escaladas para SYMBOL_SIZE (220), // a escala não precisa de ser recalculada aqui, pois é constante.
        }
      }
      r.previousPosition = r.position // Atualiza a posição anterior do rolo para o cálculo do blur (se reativado)
    }
  }) // Adiciona um event listener ao botão de giro no HTML.

  if (spinButton) {
    spinButton.addEventListener('click', startSpin) // Estado inicial: Ativa o botão de giro assim que o jogo é carregado.
    spinButton.disabled = false
  } else {
    console.error(
      "Botão de giro com ID 'spinButton' não encontrado no HTML. O jogo de slot não pode ser iniciado."
    )
  }

  console.log('Módulo PixiJS Slots Demo inicializado e pronto para jogar!')
}
