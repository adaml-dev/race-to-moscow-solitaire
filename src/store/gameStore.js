import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import initialMap from '../data/map.json';
import cardsData from '../data/cards.json';

// Helper function to shuffle an array using Fisher-Yates algorithm
const shuffle = (array) => {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex > 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

// Helper function to get logistics limits based on level (Rule 4.5)
const getLogisticsLimits = (level) => {
  if (level === 1) {
    return { take: 6, place: 3, possess: 9 };
  } else if (level === 2) {
    return { take: 8, place: 4, possess: 12 };
  }
  return { take: 6, place: 3, possess: 9 }; // Default to level 1
};

// Helper function to create formatted log entries with timestamp
const createLogEntry = (message, location = null, armyName = null) => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
  let prefix = timestamp;
  
  if (location || armyName) {
    let context = [];
    if (location) context.push(location);
    if (armyName) context.push(armyName);
    prefix += ` {${context.join(' - ')}}`;
  }
  
  return `${prefix} ${message}`;
};

const useGameStore = create(persist((set, get) => ({
  
  // --- STAN UI (PERSISTED) ---
  // Przeniesione z App.jsx, aby zapamiętywać po odświeżeniu
  viewState: { scale: 0.6, x: -100, y: -500 },
  spacing: 1.0,

  // Akcje do zmiany UI
  setViewState: (newView) => set({ viewState: newView }),
  setSpacing: (newSpacing) => set({ spacing: newSpacing }),

  // --- STAN GRY ---
  nodes: initialMap.nodes,
  edges: initialMap.edges.map((e, i) => ({ ...e, id: i, hasTruck: false, hasTrain: false })), 
  armies: initialMap.armies.map(a => ({ ...a, isGrounded: false })),
  
  playerResources: {
    trucks: 5,
    trains: 3,
    supplyStock: { fuel: 20, ammo: 20, food: 20 },
    medals: 0,
    hand: [] // For retaining cards like Recon and Axis Auxiliaries
  },

  gameState: 'IDLE', 
  gameStatus: 'CHOOSE_ARMY_GROUP', 
  victoryMessage: '',

  activeCard: null,
  activeArmyId: null,
  previousLocation: null,
  selectedEdgeIndex: null,
  recentlyCaptured: [],
  
  // Rule 14.2: Track placements during current Transport Supplies action
  // spentAction: false means action not yet spent (user can cancel without cost)
  // spentAction: true means first route selected (action spent, must finish or cancel)
  transportActionState: { placedCount: 0, spentAction: false },
  transportToConfirm: null,
  
  logs: ["Gra rozpoczęta. Cel: Moskwa i Leningrad."],

    // --- SOLITAIRE GAME STATE ---
  solitaire: {
    chosenArmyGroup: null, // 'gray', 'white', or 'brown'
    gameMode: null, // 'normal' (3 markers) or 'test' (20 markers + reshuffle)
    turn: 1,
    actionsLeft: 2,
    sovietMarkerPool: 20,
    transportReserve: 4,
    sovietDeck: [],
    pursuitDeck: [],
    moveCount: 0,
    playedAxisAuxiliaries: false, // Rule 9.10, only one per turn
    logisticsLevel: 1, // Rule 4.5 & 6.6: Logistics Card level (1 or 2)
  },

  // --- AKCJA RESETU GRY ---
  // Zresetuj mechanikę, ale ZACHOWAJ ustawienia widoku (nie nadpisujemy viewState/spacing)
  initializeSolitaireGame: (armyGroup, gameMode) => {
    console.log('initializeSolitaireGame', armyGroup, gameMode);
    const newNodes = initialMap.nodes.map(node => {
      if (node.owner && node.owner !== armyGroup) {
        return { ...node, controller: node.owner }; // Block areas of other army groups
      }
      return { ...node };
    });

    const newArmies = initialMap.armies.map(a => {
      if (a.owner === armyGroup) {
        if (a.type === 'armored') {
          a.supplies = { fuel: 3, ammo: 3, food: 0 };
        } else {
          a.supplies = { fuel: 1, ammo: 3, food: 2 };
        }
      }
      return { ...a, isGrounded: false };
    });

    // Create and shuffle Soviet deck according to rules (6.7)
    const greenCards = cardsData.sovietDeck.filter(c => c.era === 'green');
    const blueCards = cardsData.sovietDeck.filter(c => c.era === 'blue');
    const shuffledSovietDeck = [...shuffle(greenCards), ...shuffle(blueCards)];
    const shuffledPursuitDeck = shuffle(cardsData.pursuitDeck);

    // Set Soviet markers based on game mode
    const sovietMarkers = gameMode === 'normal' ? 3 : 20;
    const modeText = gameMode === 'normal' ? 'Normalny (3 żetony)' : 'Testowy (20 żetonów + przetasowanie)';

    set({
      nodes: newNodes,
      armies: newArmies,
      solitaire: {
        chosenArmyGroup: armyGroup,
        gameMode: gameMode,
        turn: 1,
        actionsLeft: 2,
        sovietMarkerPool: sovietMarkers,
        transportReserve: 4,
        sovietDeck: shuffledSovietDeck,
        pursuitDeck: shuffledPursuitDeck,
        moveCount: 0,
        playedAxisAuxiliaries: false,
        logisticsLevel: 1, // Rule 6.6: Start at logistics level 1
      },
      playerResources: {
        trucks: 5,
        trains: 3,
        supplyStock: { fuel: 20, ammo: 20, food: 20 },
        medals: 0,
        hand: []
      },
      gameState: 'IDLE',
      gameStatus: 'PLAYING',
      logs: [`Gra solo rozpoczęta jako Grupa Armii ${armyGroup}. Tryb: ${modeText}. Poziom logistyczny: 1.`],
      activeCard: null,
      activeArmyId: null,
      previousLocation: null,
      selectedEdgeIndex: null
    });
  },

  resetGame: () => {
      set({
        nodes: initialMap.nodes,
        edges: initialMap.edges.map((e, i) => ({ ...e, id: i, hasTruck: false, hasTrain: false })), 
        armies: initialMap.armies.map(a => ({ ...a, isGrounded: false })),
        playerResources: { trucks: 5, trains: 3, supplyStock: { fuel: 20, ammo: 20, food: 20 }, medals: 0 },
        gameState: 'IDLE',
        gameStatus: 'CHOOSE_ARMY_GROUP',
        logs: ["Nowa gra rozpoczęta."],
        activeCard: null,
        activeArmyId: null,
        previousLocation: null,
        selectedEdgeIndex: null
      });
  },

  // ... (RESZTA KODU BEZ ZMIAN: awardMedal, checkVictoryCondition, checkEncirclement, triggerSovietReaction, etc.) ...

  resupplyBase: (baseNodeId) => {
    const { spendAction, nodes, playerResources } = get();
    if (spendAction()) {
        const nodeIndex = nodes.findIndex(n => n.id === baseNodeId);
        if (nodeIndex === -1) return;

        const newResources = { 
            ...playerResources,
            supplyStock: { ...playerResources.supplyStock } 
        };
        const newNodes = nodes.map((node, i) => {
            if (i === nodeIndex) {
                return {
                    ...node,
                    resources: { ...node.resources } 
                };
            }
            return node;
        });

        let supplied = false;
        ['fuel', 'ammo', 'food'].forEach(res => {
            if (newResources.supplyStock[res] >= 3) {
                newResources.supplyStock[res] -= 3;
                if (!newNodes[nodeIndex].resources) newNodes[nodeIndex].resources = { fuel: 0, ammo: 0, food: 0 };
                newNodes[nodeIndex].resources[res] = (newNodes[nodeIndex].resources[res] || 0) + 3;
                supplied = true;
            }
        });

        if (supplied) {
            set(state => ({
                nodes: newNodes, 
                playerResources: newResources,
                logs: [...state.logs, `📦 Uzupełniono zapasy w bazie ${newNodes[nodeIndex].name}. (-1 akcja)`],
                gameState: 'IDLE' // Wychodzimy z trybu uzupełniania
            }));
        } else {
            // Jeśli nie udało się nic pobrać, akcja i tak jest zużyta, ale informujemy
            set(state => ({ 
                logs: [...state.logs, `⚠️ Brak wystarczających zasobów w stocku do uzupełnienia.`],
                gameState: 'IDLE'
            }));
        }
    }
},
  
  awardMedal: (nodeName) => {
      set(state => ({
          playerResources: {
              ...state.playerResources,
              medals: state.playerResources.medals + 1
          },
          logs: [...state.logs, `🎖️ Zdobyto MEDAL za zajęcie: ${nodeName}!`]
      }));
  },

  checkVictoryCondition: (nodeId) => {
      const { nodes } = get();
      const node = nodes.find(n => n.id === nodeId);
      if (node.isVictory) { 
          set({
              gameStatus: 'VICTORY',
              victoryMessage: `GRATULACJE! Zdobyto cel strategiczny: ${node.name}.`
          });
      }
  },

  checkEncirclement: () => {
      const { nodes, edges, logs, armies, activeArmyId, solitaire } = get();
      const victoryNodes = nodes.filter(n => n.isVictory).map(n => n.id);
      
      const activeArmy = armies.find(a => a.id === activeArmyId) || armies[0];
      const capturerColor = activeArmy.owner; 

      const hasSupplyLine = (startNodeId) => {
          let queue = [startNodeId];
          let visited = new Set([startNodeId]);

          while (queue.length > 0) {
              let currentId = queue.shift();
              if (victoryNodes.includes(currentId)) return true; 

              const neighbors = edges
                  .filter(e => e.source === currentId || e.target === currentId)
                  .map(e => e.source === currentId ? e.target : e.source);

              for (let neighborId of neighbors) {
                  const neighborNode = nodes.find(n => n.id === neighborId);
                  if (!visited.has(neighborId) && (neighborNode.controller === null || neighborNode.sovietMarker)) {
                      visited.add(neighborId);
                      queue.push(neighborId);
                  }
              }
          }
          return false;
      };

      let encircledNames = [];
      const newNodes = [...nodes];
      let encirclementOccurred = false;
      let markersReturned = 0;

      newNodes.forEach(node => {
          // BUGFIX: Kocioł powinien przejmować TYLKO miasta ze znacznikiem sowieckim,
          // nie neutralne miasta (controller === null bez sovietMarker).
          // Miasta neutralne po Counter-Attack nie powinny być automatycznie przejmowane.
          if (node.sovietMarker) {
              if (!node.isVictory && node.type !== 'main_supply_base' && !node.isPartisan) {
                  if (!hasSupplyLine(node.id)) {
                      encircledNames.push(node.name);
                      node.sovietMarker = false;
                      node.controller = capturerColor; 
                      encirclementOccurred = true;
                      markersReturned++; // BUGFIX: Count markers returned to pool
                      if (node.medal) get().awardMedal(node.name);
                  }
              }
          }
      });

      if (encirclementOccurred) {
          set({ 
              nodes: newNodes,
              logs: [...logs, `⚔️ KOCIOŁ! Odcięto i przejęto: ${encircledNames.join(', ')}`],
              solitaire: { ...solitaire, sovietMarkerPool: solitaire.sovietMarkerPool + markersReturned }
          });
      }
  },


  transferResource: (armyId, resourceType, direction) => {
    const { armies, nodes, addLog } = get();
    const armyIndex = armies.findIndex(a => a.id === armyId);
    const army = armies[armyIndex];
    const nodeIndex = nodes.findIndex(n => n.id === army.location);
    const node = nodes[nodeIndex];
    const newArmies = [...armies];
    const newNodes = [...nodes];
    const armyLoad = (army.supplies.fuel||0) + (army.supplies.ammo||0) + (army.supplies.food||0);

    const resourceIcons = { fuel: '⛽', ammo: '💣', food: '🍞' };
    const icon = resourceIcons[resourceType] || '';

    if (direction === 'TO_ARMY') {
        if (!node.resources || (node.resources[resourceType] || 0) <= 0) return;
        if (resourceType === 'food' && army.isGrounded) {
            // Rule 17: When food is delivered to a grounded army, it is automatically spent
            newNodes[nodeIndex].resources.food -= 1;
            newArmies[armyIndex].isGrounded = false;
            set({ armies: newArmies, nodes: newNodes });
            addLog(`${icon} Wydano 1 żywność. HALT zdjęty!`, node.name, army.name);
        } else {
            if (armyLoad >= 6) {
                addLog("⛔ Armia pełna! Max 6 żetonów.", node.name, army.name);
                return;
            }
            const oldAmount = newArmies[armyIndex].supplies[resourceType] || 0;
            newNodes[nodeIndex].resources[resourceType] -= 1;
            newArmies[armyIndex].supplies[resourceType] = oldAmount + 1;
            const newAmount = newArmies[armyIndex].supplies[resourceType];
            set({ armies: newArmies, nodes: newNodes });
            addLog(`${icon} Załadowano 1 ${resourceType} (${oldAmount}→${newAmount}).`, node.name, army.name);
        }
    } else if (direction === 'TO_NODE') {
        if ((army.supplies[resourceType] || 0) <= 0) return;
        const oldAmount = newArmies[armyIndex].supplies[resourceType] || 0;
        newArmies[armyIndex].supplies[resourceType] = oldAmount - 1;
        const newAmount = newArmies[armyIndex].supplies[resourceType];
        if (!newNodes[nodeIndex].resources) newNodes[nodeIndex].resources = { fuel:0, ammo:0, food:0 };
        if (!newNodes[nodeIndex].resources[resourceType]) newNodes[nodeIndex].resources[resourceType] = 0;
        newNodes[nodeIndex].resources[resourceType] += 1;
        set({ armies: newArmies, nodes: newNodes });
        addLog(`${icon} Wyładowano 1 ${resourceType} (${oldAmount}→${newAmount}).`, node.name, army.name);
    }
  },

  executeTransport: (transportType, sourceId, targetId, resourcesToMove, confirmed = false) => {
    const { edges, nodes, selectedEdgeIndex, playerResources, solitaire, spendAction, addLog, setGameState } = get();
    const edge = edges[selectedEdgeIndex];

    // Rule 14.2: Track placements during current Transport Supplies action
    const limits = getLogisticsLimits(solitaire.logisticsLevel);
    const transportState = get().transportActionState || { placedCount: 0, spentAction: false };
    
    const isReorg = playerResources.trains === 1 && transportType === 'train' && !confirmed;
    // IMPORTANT: Spend action on FIRST route selection, not when entering transport mode
    if (!transportState.spentAction && !isReorg) {
      if (!spendAction()) {
        addLog("⛔ Brak akcji do rozpoczęcia transportu!");
        set({ 
          gameState: 'IDLE',
          selectedEdgeIndex: null,
          transportActionState: { placedCount: 0, spentAction: false }
        });
        return;
      }
    }
    
    // Rule 14.2: Check placement limit for this action only (not total on board)
    if (transportState.placedCount >= limits.place) {
      addLog(`⛔ BŁĄD: Osiągnięto limit umieszczania transportu (${limits.place}) w tej akcji! (Zasada 4.5 & 14.2)`);
      set({ gameState: 'TRANSPORT_MODE' });
      return;
    }

    if (transportType === 'truck' && playerResources.trucks <= 0) {
        addLog("⛔ BŁĄD: Brak ciężarówek!");
        return;
    }
    if (transportType === 'train' && playerResources.trains <= 0) {
        addLog("⛔ BŁĄD: Brak pociągów!");
        return;
    }

    if (transportType === 'train' && playerResources.trains === 1 && !confirmed) {
      set({
        gameState: 'CONFIRM_REORGANIZATION',
        transportToConfirm: { transportType, sourceId, targetId, resourcesToMove }
      });
      return;
    }

    // Rule 14.6: Check stacking restrictions
    if (transportType === 'truck' && edge.hasTruck) {
        addLog("⛔ BŁĄD: Na tej linii jest już ciężarówka! (Zasada 14.6)");
        return;
    }
    if (transportType === 'train' && edge.hasTrain) {
        addLog("⛔ BŁĄD: Na tej linii jest już pociąg! (Zasada 14.6)");
        return;
    }

    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (transportType === 'train' && (!sourceNode.isRail || !targetNode.isRail)) {
        addLog("⛔ BŁĄD: Pociąg może poruszać się tylko między polami z torami kolejowymi!");
        return;
    }

    const newNodes = [...nodes];
    const newEdges = [...edges];
    const newResources = { ...playerResources };
    const sourceNodeIndex = newNodes.findIndex(n => n.id === sourceId);
    const targetNodeIndex = newNodes.findIndex(n => n.id === targetId);

    if (newNodes[sourceNodeIndex].sovietMarker || newNodes[targetNodeIndex].sovietMarker) {
         addLog("⛔ BŁĄD: Linia przerwana przez wroga! Odbij teren.", `${sourceNode.name} -> ${targetNode.name}`);
         set({ gameState: 'TRANSPORT_MODE' });
         return;
    }

    // Build resource summary
    const resourceSummary = [];
    ['fuel', 'ammo', 'food'].forEach(key => {
        const amount = resourcesToMove[key] || 0;
        if (amount > 0) {
            const icons = { fuel: '⛽', ammo: '💣', food: '🍞' };
            resourceSummary.push(`${amount}${icons[key]}`);
            if (newNodes[sourceNodeIndex].resources && newNodes[sourceNodeIndex].resources[key] >= amount) {
                newNodes[sourceNodeIndex].resources[key] -= amount;
            }
        }
    });

    if (!newNodes[targetNodeIndex].resources) {
        newNodes[targetNodeIndex].resources = { fuel: 0, ammo: 0, food: 0 };
    }

    ['fuel', 'ammo', 'food'].forEach(key => {
        const amount = resourcesToMove[key] || 0;
        newNodes[targetNodeIndex].resources[key] = (newNodes[targetNodeIndex].resources[key] || 0) + amount;
    });

    const transportIcon = transportType === 'truck' ? '🚚' : '🚂';
    if (transportType === 'truck') {
      newResources.trucks -= 1;
      newEdges[selectedEdgeIndex].hasTruck = true;
      newEdges[selectedEdgeIndex].placedTransport = 'truck';
    }
    if (transportType === 'train') {
      newResources.trains -= 1;
      newEdges[selectedEdgeIndex].hasTrain = true;
      newEdges[selectedEdgeIndex].placedTransport = 'train';
    }

    let shouldTriggerReorg = false;
    if (newResources.trains === 0) shouldTriggerReorg = true;

    // Rule 14.2: Increment placement counter and mark action as spent
    const newTransportState = { 
      placedCount: transportState.placedCount + 1, 
      spentAction: true // Action is now spent, can't cancel without cost
    };

    set({
        nodes: newNodes, 
        edges: newEdges, 
        playerResources: newResources, 
        gameState: 'TRANSPORT_MODE',
        selectedEdgeIndex: null, 
        transportActionState: newTransportState
    });
    
    // Log transport with resources
    const resourceText = resourceSummary.length > 0 ? ` [${resourceSummary.join(', ')}]` : '';
    const actionText = newTransportState.placedCount === 1 ? ' (-1 akcja)' : '';
    addLog(`${transportIcon} Umieszczono transport${resourceText}. (${newTransportState.placedCount}/${limits.place})${actionText}`, `${sourceNode.name} -> ${targetNode.name}`);
    
    // Auto-finish transport action if the placement limit is reached
    if (newTransportState.placedCount >= limits.place) {
      addLog(`✅ Osiągnięto limit transportu. Akcja zakończona automatycznie.`);
      set({ 
        gameState: 'IDLE', 
        selectedEdgeIndex: null, 
        transportActionState: { placedCount: 0, spentAction: false }
      });
    }

    if (shouldTriggerReorg) get().triggerReorganization();
  },

  confirmReorganization: (confirm) => {
    const { transportToConfirm, executeTransport, setGameState } = get();
    if (confirm) {
      executeTransport(transportToConfirm.transportType, transportToConfirm.sourceId, transportToConfirm.targetId, transportToConfirm.resourcesToMove, true);
    } else {
      setGameState('TRANSPORT_MODE');
    }
    set({ transportToConfirm: null });
  },

  moveArmy: (armyId, targetNodeId) => {
    const { armies, nodes, edges, gameState, solitaire, addLog } = get();

    // Check for correct army type first
    const army = armies.find(a => a.id === armyId);
    if ((gameState === 'MOVE_ARMORED_ARMY' && army.type !== 'armored') || (gameState === 'MOVE_FIELD_ARMIES' && army.type !== 'field')) {
      addLog(`⛔ W tym trybie możesz poruszać tylko armie ${gameState === 'MOVE_ARMORED_ARMY' ? 'pancerne' : 'polowe'}.`, null, army.name);
      return;
    }

    // Handle action spending
    if (gameState === 'MOVE_FIELD_ARMIES' || (gameState === 'MOVE_ARMORED_ARMY' && solitaire.moveCount === 0)) {
      if (solitaire.actionsLeft <= 0) {
        addLog("⛔ Brak akcji! Zakończ turę.");
        return;
      }
    }
    
    const armyIndex = armies.findIndex(a => a.id === armyId);

    if (army.isGrounded) {
        addLog(`⛔ Armia uziemiona! Dostarcz żywność.`, nodes.find(n => n.id === army.location)?.name, army.name);
        return;
    }
    const targetNode = nodes.find(n => n.id === targetNodeId);
    const isConnected = edges.some(edge => 
      (edge.source === army.location && edge.target === targetNodeId) ||
      (edge.target === army.location && edge.source === targetNodeId)
    );
    if (!isConnected) return;

    // Rule 5.1: Check for area color restriction
    if (targetNode.color && targetNode.color !== army.owner) {
        addLog(`⛔ Nie można wejść do obszaru koloru ${targetNode.color}.`, targetNode.name, army.name);
        return;
    }

    if (army.type === 'armored' && (army.supplies.fuel || 0) < 1) {
      addLog(`⛔ Brak paliwa na ruch!`, nodes.find(n => n.id === army.location)?.name, army.name);
      return;
    }
    let ammoCost = 0;
    if (targetNode.type === 'fortified' && targetNode.controller !== army.owner) {
        ammoCost = 1;
        if ((army.supplies.ammo || 0) < 1) {
            addLog(`⛔ Brak amunicji na wejście do fortu!`, targetNode.name, army.name);
            return;
        }
    }

    const newArmies = JSON.parse(JSON.stringify(armies));
    const oldFuel = army.supplies.fuel || 0;
    const oldAmmo = army.supplies.ammo || 0;
    
    if (army.type === 'armored') newArmies[armyIndex].supplies.fuel -= 1;
    newArmies[armyIndex].supplies.ammo -= ammoCost;
    
    const newFuel = newArmies[armyIndex].supplies.fuel;
    const newAmmo = newArmies[armyIndex].supplies.ammo;
    
    const prevLoc = army.location;
    newArmies[armyIndex].location = targetNodeId;

    let drawnCard = null;
    let newNodes = JSON.parse(JSON.stringify(nodes));
    let newSolitaireState = { ...solitaire };
    const wasMedal = targetNode.medal && targetNode.controller !== army.owner;

    if (!targetNode.sovietMarker && targetNode.controller !== army.owner) {
        const nodeIndex = newNodes.findIndex(n => n.id === targetNodeId);
        newNodes[nodeIndex].controller = army.owner;
        newNodes[nodeIndex].isPartisan = false;
        const [firstCard, ...restOfDeck] = newSolitaireState.pursuitDeck;
        drawnCard = firstCard;
        newSolitaireState.pursuitDeck = restOfDeck;
        if (wasMedal) get().awardMedal(targetNode.name);
        set(state => ({ recentlyCaptured: [...state.recentlyCaptured, targetNodeId] }));
        if (drawnCard) {
          addLog(`🎴 Odkryto kartę pościgową: ${drawnCard.name}`, targetNode.name, army.name);
        }
    } else if (targetNode.sovietMarker) {
        // Handle deck drawing and empty deck case
        if (newSolitaireState.sovietDeck.length > 0) {
            const [firstCard, ...restOfDeck] = newSolitaireState.sovietDeck;
            drawnCard = firstCard;
            newSolitaireState.sovietDeck = restOfDeck;
            addLog(`🎴 Odkryto kartę sowiecką: ${drawnCard.name}`, targetNode.name, army.name);
        } else {
            // Soviet deck is empty
            if (solitaire.gameMode === 'test') {
                // Test mode: Reshuffle all 33 Soviet cards and continue drawing
                const greenCards = cardsData.sovietDeck.filter(c => c.era === 'green');
                const blueCards = cardsData.sovietDeck.filter(c => c.era === 'blue');
                const reshuffledDeck = [...shuffle(greenCards), ...shuffle(blueCards)];
                const [firstCard, ...restOfDeck] = reshuffledDeck;
                drawnCard = firstCard;
                newSolitaireState.sovietDeck = restOfDeck;
                addLog(`♻️ TRYB TESTOWY: Talia sowiecka przetasowana! Odkryto kartę: ${drawnCard.name}`, targetNode.name, army.name);
            } else {
                // Normal mode: Automatic capture
                addLog(`⚠️ Talia sowiecka pusta - automatyczne przejęcie terenu!`, targetNode.name, army.name);
                const nodeIndex = newNodes.findIndex(n => n.id === targetNodeId);
                const hadSovietMarker = newNodes[nodeIndex].sovietMarker;
                newNodes[nodeIndex].controller = army.owner;
                newNodes[nodeIndex].sovietMarker = false;
                newNodes[nodeIndex].isPartisan = false;
                if (wasMedal) get().awardMedal(targetNode.name);
                // Return Soviet marker to pool
                if (hadSovietMarker) {
                    newSolitaireState.sovietMarkerPool = solitaire.sovietMarkerPool + 1;
                }
                set(state => ({ recentlyCaptured: [...state.recentlyCaptured, targetNodeId] }));
            }
        }
    }

    const nextGameState = drawnCard ? 'ENCOUNTER_RESOLVING' : (gameState === 'MOVE_ARMORED_ARMY' && solitaire.moveCount < 2) ? 'MOVE_ARMORED_ARMY' : 'IDLE';

    // Decrement action if this is the first move (moveCount === 0) or field army move
    const shouldDecrementAction = gameState === 'MOVE_FIELD_ARMIES' || (gameState === 'MOVE_ARMORED_ARMY' && solitaire.moveCount === 0);
    
    set({
      armies: newArmies, 
      nodes: newNodes, 
      previousLocation: prevLoc, 
      activeArmyId: armyId, 
      activeCard: drawnCard,
      gameState: nextGameState,
      solitaire: {
        ...solitaire, // Keep the existing state
        ...newSolitaireState, // Overwrite with deck changes
        moveCount: gameState === 'MOVE_ARMORED_ARMY' ? solitaire.moveCount + 1 : 0,
        actionsLeft: shouldDecrementAction ? solitaire.actionsLeft - 1 : solitaire.actionsLeft
      }
    });
    
    // Log movement with resource changes
    let moveLog = `Wchodzi do lokacji.`;
    if (army.type === 'armored' && oldFuel !== newFuel) {
      moveLog += ` ⛽(${oldFuel}→${newFuel})`;
    }
    if (ammoCost > 0 && oldAmmo !== newAmmo) {
      moveLog += ` 💣(${oldAmmo}→${newAmmo})`;
    }
    addLog(moveLog, targetNode.name, army.name);

    if (!targetNode.sovietMarker) {
        get().checkEncirclement();
        get().checkVictoryCondition(targetNodeId);
    }

    if (gameState === 'MOVE_FIELD_ARMIES') {
      const movedArmy = get().armies.find(a => a.id === armyId);
      if (movedArmy.supplies.food > 0) {
          set({ gameState: 'CONFIRM_FORCED_MARCH' });
      }
  }
  },

  confirmForcedMarch: (decision) => {
    const { armies, activeArmyId, nodes, addLog } = get();
    const army = armies.find(a => a.id === activeArmyId);
    const location = nodes.find(n => n.id === army?.location);
    if (decision) {
      if (army.supplies.food > 0) {
        const newArmies = JSON.parse(JSON.stringify(armies));
        const armyIndex = newArmies.findIndex(a => a.id === activeArmyId);
        newArmies[armyIndex].supplies.food -= 1;
        set({
          armies: newArmies,
          gameState: 'MOVE_FIELD_ARMIES'
        });
        addLog(`🌾 Wydano 1 żywność na marsz forsowny.`, location?.name, army.name);
      } else {
        addLog(`⛔️ Brak żywności na marsz forsowny.`, location?.name, army.name);
        set({ gameState: 'IDLE' });
      }
    } else {
      set({ gameState: 'IDLE' });
    }
  },

  confirmContinueMove: (decision) => {
    const { armies, activeArmyId, nodes, addLog } = get();
    const army = armies.find(a => a.id === activeArmyId);
    const location = nodes.find(n => n.id === army?.location);
    if (decision) {
      if (army.supplies.fuel > 0) {
        set({
          gameState: 'MOVE_ARMORED_ARMY'
        });
        addLog(`⛽️ Kontynuuj ruch (zużyjesz paliwo przy następnym ruchu).`, location?.name, army.name);
      } else {
        addLog(`⛔️ Brak paliwa, by kontynuować ruch.`, location?.name, army.name);
        set({ gameState: 'IDLE' });
      }
    } else {
      set({ gameState: 'IDLE' });
    }
  },

  resolveEncounter: (decision) => {
    const { activeCard, activeArmyId, armies, previousLocation, nodes, playerResources, addLog, solitaire } = get();

    const armyIndex = armies.findIndex(a => a.id === activeArmyId);
    const army = armies[armyIndex];
    const newArmies = [...armies];
    const newNodes = [...nodes];
    const location = nodes.find(n => n.id === army.location);

    // Rule 9.10 - Card Retention
    if (activeCard.hasHand) {
      // Rule 9.6: After resolving the card, place player marker on captured area
      const nodeIndex = newNodes.findIndex(n => n.id === army.location);
      const hadSovietMarker = newNodes[nodeIndex].sovietMarker;
      newNodes[nodeIndex].controller = army.owner;
      newNodes[nodeIndex].sovietMarker = false;
      newNodes[nodeIndex].isPartisan = false;
      if (newNodes[nodeIndex].medal) get().awardMedal(newNodes[nodeIndex].name);

      // Return Soviet marker to pool
      const newSolitaireState = { ...solitaire };
      if (hadSovietMarker) {
        newSolitaireState.sovietMarkerPool = solitaire.sovietMarkerPool + 1;
      }

      set({
        playerResources: {
          ...playerResources,
          hand: [...playerResources.hand, activeCard],
        },
        nodes: newNodes,
        gameState: 'IDLE',
        activeCard: null,
        solitaire: newSolitaireState
      });
      
      addLog(`📥 Karta ${activeCard.name} dodana do ręki.`, location?.name, army.name);
      
      get().checkEncirclement();
      get().checkVictoryCondition(army.location);

      // After keeping the card, check for movement continuation
      const movedArmy = get().armies.find(a => a.id === activeArmyId);
      if (movedArmy.type === 'armored' && get().solitaire.moveCount < 3) {
        // Allow armored to continue, no extra fuel cost here as per rule 9.8 for non-combat cards
        set({ gameState: 'MOVE_ARMORED_ARMY' }); 
      } else {
        set({ gameState: 'IDLE' });
      }
      return;
    }

    if (activeCard.type === 'combat') {
        if (decision === 'fight') {
            // Check if army has sufficient supplies for combat
            const hasAmmo = (army.supplies.ammo || 0) >= activeCard.cost.ammo;
            const hasFuel = (army.supplies.fuel || 0) >= activeCard.cost.fuel;
            
            if (hasAmmo && hasFuel) {
                // SUFFICIENT SUPPLIES - Win combat
                newArmies[armyIndex].supplies.ammo -= activeCard.cost.ammo;
                newArmies[armyIndex].supplies.fuel -= activeCard.cost.fuel;

                const nodeIndex = newNodes.findIndex(n => n.id === army.location);
                const node = newNodes[nodeIndex];
                const hadSovietMarker = node.sovietMarker;
                node.sovietMarker = false;
                node.isPartisan = false;
                node.controller = army.owner;
                if (node.medal) get().awardMedal(node.name);

                const newSolitaireState = { ...solitaire };
                if (hadSovietMarker) {
                    newSolitaireState.sovietMarkerPool = solitaire.sovietMarkerPool + 1;
                }

                set({ activeCard: null, armies: newArmies, nodes: newNodes, recentlyCaptured: [...get().recentlyCaptured, army.location], solitaire: newSolitaireState });
                addLog(`⚔️ Zwycięstwo! Teren przejęty.`, location?.name, army.name);
                
                get().checkEncirclement();
                get().checkVictoryCondition(army.location);

                const movedArmy = get().armies.find(a => a.id === activeArmyId);
                if (movedArmy.type === 'armored' && get().solitaire.moveCount < 3) {
                  set({ gameState: 'CONFIRM_CONTINUE_MOVE' });
                } else {
                  set({ gameState: 'IDLE' });
                }
            } else {
                // Rule 11.3: INSUFFICIENT SUPPLIES - Spend as much as possible, then withdraw
                const spentAmmo = Math.min((army.supplies.ammo || 0), activeCard.cost.ammo);
                const spentFuel = Math.min((army.supplies.fuel || 0), activeCard.cost.fuel);
                
                // Deduct the spent resources
                newArmies[armyIndex].supplies.ammo = (army.supplies.ammo || 0) - spentAmmo;
                newArmies[armyIndex].supplies.fuel = (army.supplies.fuel || 0) - spentFuel;
                
                // Withdraw to previous location
                newArmies[armyIndex].location = previousLocation;
                
                // Build log message showing what was spent
                let logMsg = `⚔️ Niewystarczające zaopatrzenie! Armia wycofuje się.`;
                if (spentAmmo > 0 || spentFuel > 0) {
                    logMsg += ` Wydano:`;
                    if (spentAmmo > 0) logMsg += ` ${spentAmmo} amunicji`;
                    if (spentAmmo > 0 && spentFuel > 0) logMsg += ` i`;
                    if (spentFuel > 0) logMsg += ` ${spentFuel} paliwa`;
                    logMsg += `.`;
                }

                set({ gameState: 'IDLE', activeCard: null, armies: newArmies });
                addLog(logMsg, location?.name, army.name);
            }
        } else if (decision === 'retreat') {
            // Rule 11.3: When retreating, spend as much of the required battle cost as possible
            const spentAmmo = Math.min((army.supplies.ammo || 0), activeCard.cost.ammo);
            const spentFuel = Math.min((army.supplies.fuel || 0), activeCard.cost.fuel);
            
            // Deduct the spent resources
            newArmies[armyIndex].supplies.ammo = (army.supplies.ammo || 0) - spentAmmo;
            newArmies[armyIndex].supplies.fuel = (army.supplies.fuel || 0) - spentFuel;
            
            // Withdraw to previous location
            newArmies[armyIndex].location = previousLocation;
            
            let newMedals = playerResources.medals;
            let logMsg = `🏳️ Odwrót.`;
            if (spentAmmo > 0 || spentFuel > 0) {
                logMsg += ` Utracono:`;
                if (spentAmmo > 0) logMsg += ` ${spentAmmo} amunicji`;
                if (spentAmmo > 0 && spentFuel > 0) logMsg += ` i`;
                if (spentFuel > 0) logMsg += ` ${spentFuel} paliwa`;
                logMsg += `.`;
            }
            if (newMedals > 0) {
                newMedals -= 1;
                logMsg += " Stracono medal!";
            }
            set({ gameState: 'IDLE', activeCard: null, armies: newArmies, playerResources: { ...playerResources, medals: newMedals } });
            addLog(logMsg, location?.name, army.name);
        }
    } else if (activeCard.type === 'event') {
        if (activeCard.id === 'mud' && decision === 'pay_fuel') {
             newArmies[armyIndex].supplies.fuel -= 1;
             const nodeIndex = newNodes.findIndex(n => n.id === army.location);
             const hadSovietMarker = newNodes[nodeIndex].sovietMarker;
             newNodes[nodeIndex].controller = army.owner;
             newNodes[nodeIndex].sovietMarker = false;
             newNodes[nodeIndex].isPartisan = false;
             if(newNodes[nodeIndex].medal) get().awardMedal(newNodes[nodeIndex].name);
             // Return Soviet marker to pool
             const newSolitaireState = { ...solitaire };
             if (hadSovietMarker) {
               newSolitaireState.sovietMarkerPool = solitaire.sovietMarkerPool + 1;
             }
             set({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes, solitaire: newSolitaireState });
             addLog(`Opłacono przejazd przez błoto.`, location?.name, army.name);
             get().checkEncirclement();
             get().checkVictoryCondition(army.location);
        } else if (activeCard.id === 'supplies') {
            newArmies[armyIndex].supplies.ammo = (newArmies[armyIndex].supplies.ammo || 0) + 1;
             const nodeIndex = newNodes.findIndex(n => n.id === army.location);
             const hadSovietMarker = newNodes[nodeIndex].sovietMarker;
             newNodes[nodeIndex].controller = army.owner;
             newNodes[nodeIndex].sovietMarker = false;
             newNodes[nodeIndex].isPartisan = false;
             if(newNodes[nodeIndex].medal) get().awardMedal(newNodes[nodeIndex].name);
             // Return Soviet marker to pool
             const newSolitaireState = { ...solitaire };
             if (hadSovietMarker) {
               newSolitaireState.sovietMarkerPool = solitaire.sovietMarkerPool + 1;
             }
             set({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes, solitaire: newSolitaireState });
             addLog(`Znaleziono amunicję.`, location?.name, army.name);
             get().checkEncirclement();
             get().checkVictoryCondition(army.location);
        } else {
            if (activeCard.effect === 'stop' && decision === 'retreat') {
                 newArmies[armyIndex].location = previousLocation;
            } else {
                 // Rule 9.6: After resolving the card, place player marker on captured area
                 const nodeIndex = newNodes.findIndex(n => n.id === army.location);
                 const hadSovietMarker = newNodes[nodeIndex].sovietMarker;
                 newNodes[nodeIndex].controller = army.owner;
                 newNodes[nodeIndex].sovietMarker = false;
                 newNodes[nodeIndex].isPartisan = false;
                 if(newNodes[nodeIndex].medal) get().awardMedal(newNodes[nodeIndex].name);
                 // Return Soviet marker to pool
                 const newSolitaireState = { ...solitaire };
                 if (hadSovietMarker) {
                   newSolitaireState.sovietMarkerPool = solitaire.sovietMarkerPool + 1;
                 }
                 set({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes, solitaire: newSolitaireState });
                 get().checkEncirclement();
                 get().checkVictoryCondition(army.location);
                 return;
            }
            set({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes });
        }
    }
  },

  triggerReorganization: () => {
      const { armies, playerResources, edges, logs, solitaire, gameState, transportActionState } = get();
      const newArmies = [...armies];
      const newEdges = [...edges];
      const newResources = { ...playerResources };
      const newLogs = [...logs, "⚠️ REORGANIZACJA TEATRU DZIAŁAŃ!"];

      let trucksReturned = 0;
      let trainsReturned = 0;

      newEdges.forEach(edge => {
          if (edge.hasTruck) trucksReturned++;
          if (edge.hasTrain) trainsReturned++;
          edge.hasTruck = false;
          edge.hasTrain = false;
          edge.placedTransport = null;
      });

      newResources.trucks += trucksReturned;
      newResources.trains += trainsReturned;
      newLogs.push(`Powrót transportu: +${trucksReturned} 🚚, +${trainsReturned} 🚂.`);

      newArmies.forEach(army => {
          if ((army.supplies.food || 0) > 0) {
              army.supplies.food -= 1;
              newLogs.push(`${army.name} zjada 1 🍞.`);
          } else {
              if (!army.isGrounded) {
                  army.isGrounded = true;
                  newLogs.push(`⛔ ${army.name} nie ma jedzenia! UZIEMIONA (HALT).`);
                  if (newResources.medals > 0) {
                      newResources.medals -= 1;
                      newLogs.push(`📉 Utracono medal za złą logistykę.`);
                  }
              }
          }
      });

      // Rule 17 & 4.5: Shift logistics level from 1 to 2 (one time only)
      let newLogisticsLevel = solitaire.logisticsLevel;
      if (solitaire.logisticsLevel === 1) {
        newLogisticsLevel = 2;
        newLogs.push(`📊 Poziom logistyczny wzrósł do poziomu 2! (Take=8, Place=4, Possess=12)`);
        // Rule 17: Move extra trains from reserve to stock
        // In solitaire: 2 + 2*1 = 4 trains
        newResources.trains += 4;
        newLogs.push(`🚂 +4 pociągi z rezerwy do stocku.`);
      }

      // BUGFIX: Preserve transport action state through reorganization
      // If player was in the middle of a transport action, they should continue after reorganization
      const isInTransportAction = gameState === 'TRANSPORT_MODE' || gameState === 'TRANSPORT_DIALOG';
      const preservedGameState = isInTransportAction ? 'TRANSPORT_MODE' : 'IDLE';
      const preservedTransportState = isInTransportAction ? transportActionState : { placedCount: 0, spentAction: false };

      set(state => ({ 
        edges: newEdges, 
        playerResources: newResources, 
        armies: newArmies, 
        logs: newLogs, 
        gameState: preservedGameState,
        solitaire: { ...solitaire, logisticsLevel: newLogisticsLevel },
        transportActionState: preservedTransportState,
      }));
  },

  takeSupplies: () => {
    const { spendAction, playerResources, addLog } = get();
    if (spendAction()) {
      const newSupplyStock = { ...playerResources.supplyStock };
      newSupplyStock.fuel += 2;
      newSupplyStock.ammo += 2;
      newSupplyStock.food += 2;
      set({
        playerResources: { ...playerResources, supplyStock: newSupplyStock }
      });
      addLog("📥 Pobrano zaopatrzenie: +2⛽ +2💣 +2🍞. (-1 akcja)", "Baza Główna");
    }
  },

  takeTransport: () => {
    const { spendAction, playerResources, solitaire, addLog } = get();
    if (!spendAction()) return;

    // Rule 4.5 & 16: Check logistics limits
    const limits = getLogisticsLimits(solitaire.logisticsLevel);
    const currentPossessed = playerResources.trucks + playerResources.trains;
    
    // For simplicity, we'll take 2 trucks by default, but enforce limits
    let trucksToTake = 2;
    
    // Check "Take" limit (maximum to take in one action)
    if (trucksToTake > limits.take) {
      addLog(`⛔ BŁĄD: Możesz wziąć maksymalnie ${limits.take} jednostek transportu na poziomie logistycznym ${solitaire.logisticsLevel}! (Zasada 4.5)`);
      return;
    }
    
    // Check "Possess" limit (maximum total to possess)
    if (currentPossessed + trucksToTake > limits.possess) {
      const canTake = limits.possess - currentPossessed;
      if (canTake <= 0) {
        addLog(`⛔ BŁĄD: Osiągnięto limit posiadania ${limits.possess} jednostek transportu na poziomie logistycznym ${solitaire.logisticsLevel}! (Zasada 4.5)`);
        return;
      }
      trucksToTake = canTake;
      set({
        playerResources: { ...playerResources, trucks: playerResources.trucks + trucksToTake }
      });
      addLog(`🚚 Pobrano ${trucksToTake} ciężarówki do rezerwy (limit: ${limits.possess}). (-1 akcja)`, "Baza Główna");
    } else {
      set({
        playerResources: { ...playerResources, trucks: playerResources.trucks + trucksToTake }
      });
      addLog(`🚚 Pobrano ${trucksToTake} ciężarówki do rezerwy. (-1 akcja)`, "Baza Główna");
    }
  },

  endTurn: () => {
    const { nodes, edges, solitaire, sovietReaction } = get();
    // Helper: Check if area is controlled by any German player (not Soviet)
    const isPlayerControlled = (controller) => controller && controller !== null && ['gray', 'white', 'brown'].includes(controller);
    
    const railheadCandidates = nodes.filter(node => 
      isPlayerControlled(node.controller) && 
      !node.isRail && 
      edges.some(e => {
        const otherId = e.source === node.id ? e.target : e.source;
        const otherNode = nodes.find(n => n.id === otherId);
        return otherNode && isPlayerControlled(otherNode.controller) && otherNode.isRail;
      })
    );

    if (railheadCandidates.length > 0) {
      set(state => ({ 
        gameState: 'RAILHEAD_ADVANCEMENT', 
        logs: [...state.logs, `--- Koniec tury ${state.solitaire.turn} ---`, "🛤️ Wybierz znacznik do ulepszenia na kolej."] 
      }));
    } else {
      set(state => ({ 
        logs: [...state.logs, `--- Koniec tury ${state.solitaire.turn} ---`, "🛤️ Brak możliwości ulepszenia kolei w tej turze."] 
      }));
      sovietReaction();
    }
  },

  advanceRailhead: (nodeId) => {
    const { nodes, sovietReaction } = get();
    const newNodes = nodes.map(n => n.id === nodeId ? { ...n, isRail: true } : n);
    set({ nodes: newNodes, gameState: 'IDLE' });
    sovietReaction();
  },

  // railheadAdvancement: () => {
  //   const { logs } = get();
  //   set({ logs: [...logs, "🛤️ Faza postępu kolei (jeszcze nie zaimplementowana)."] });
  // },

  sovietReaction: () => {
    const { nodes, edges, armies, solitaire, logs, endGame } = get();
    const { chosenArmyGroup, sovietMarkerPool } = solitaire;
    const newNodes = JSON.parse(JSON.stringify(nodes));
    let newLogs = [...logs];
    let newSovietMarkerPool = sovietMarkerPool;

    // Helper: Check if area is controlled by any German player (not Soviet)
    const isPlayerControlled = (controller) => controller && controller !== null && ['gray', 'white', 'brown'].includes(controller);

    // 1. Determine Action: Counter-Attack or Place Marker (simplified logic)
    // In a full game, this would be based on a player's specific Front Card.
    // Here, we'll randomly choose one of the available front cards.
    const frontCard = cardsData.frontDeck[Math.floor(Math.random() * cardsData.frontDeck.length)];
    newLogs.push(`☭ Soviet Reaction: ${frontCard.name}`);

    let actionTaken = false;

    // Priority 1: Counter-Attack (if card allows)
    if (frontCard.type === 'soviet_reaction' && frontCard.target !== 'neighbor_neutral') { // Simplified condition for counter-attacks
        const armyLocations = armies.map(a => a.location);
        const armyAndAdjacentLocations = new Set(armyLocations);
        edges.forEach(edge => {
            if (armyLocations.includes(edge.source)) armyAndAdjacentLocations.add(edge.target);
            if (armyLocations.includes(edge.target)) armyAndAdjacentLocations.add(edge.source);
        });

        const startingAreaIDs = new Set(newNodes.filter(n => n.isStartingArea).map(n => n.id));
        
        // Armies protect all adjacent areas, so add them to the "forbidden" set
        const protectedLocations = new Set(armyAndAdjacentLocations);

        const validTargets = newNodes.filter(n => {
            // BUGFIX: Must be player-controlled (any German color, not just chosenArmyGroup)
            if (!isPlayerControlled(n.controller)) return false;

            if (get().recentlyCaptured.includes(n.id)) return false; // Don't counter-attack recently captured cities

            // Cannot be in or adjacent to a starting area
            if (startingAreaIDs.has(n.id)) return false;
            const isAdjacentToStart = edges.some(edge => 
                (edge.source === n.id && startingAreaIDs.has(edge.target)) ||
                (edge.target === n.id && startingAreaIDs.has(edge.source))
            );
            if (isAdjacentToStart) return false;

            // Cannot be underneath or adjacent to an army
            if (protectedLocations.has(n.id)) return false;

            // Must be adjacent to an uncontrolled area or a Soviet-marked area
            const isAdjacentToSovietThreat = edges.some(edge => {
                const otherNodeId = edge.source === n.id ? edge.target : edge.source;
                const otherNode = newNodes.find(node => node.id === otherNodeId);
                return otherNode && (otherNode.sovietMarker || otherNode.controller === null);
            });
            if (!isAdjacentToSovietThreat) return false;

            return true;
        });

        if (validTargets.length > 0) {
            const targetNode = validTargets[Math.floor(Math.random() * validTargets.length)];
            const nodeIndex = newNodes.findIndex(n => n.id === targetNode.id);
            newNodes[nodeIndex].controller = null;
            newLogs.push(`💥 Counter-Attack! Soviets remove marker from ${targetNode.name}.`);
            actionTaken = true;
        }
    }

    // Priority 2: Place Soviet Marker (if counter-attack failed or not applicable)
    if (!actionTaken) {
        if (newSovietMarkerPool > 0) {
            const sovietControlledAreas = newNodes.filter(n => n.sovietMarker).map(n => n.id);
            const possiblePlacements = newNodes.filter(n => {
                // Rule 18: Must not have a soviet marker, player marker (controller), or printed player symbol (owner)
                if (n.sovietMarker || n.controller || n.owner) {
                    return false;
                }

                // Must be adjacent to an area with a Soviet marker
                return edges.some(edge => {
                    const otherNodeId = edge.source === n.id ? edge.target : edge.source;
                    return sovietControlledAreas.includes(otherNodeId);
                });
            });

            if (possiblePlacements.length > 0) {
                const targetNode = possiblePlacements[Math.floor(Math.random() * possiblePlacements.length)];
                const nodeIndex = newNodes.findIndex(n => n.id === targetNode.id);
                newNodes[nodeIndex].sovietMarker = true;
                newSovietMarkerPool -= 1;
                newLogs.push(`➕ Soviets place a marker in ${targetNode.name}.`);
                actionTaken = true;
            } else {
                 newSovietMarkerPool -= 1; // Discard marker to the box
                 newLogs.push(`🚮 No valid placement for Soviet marker. It is discarded.`);
                 actionTaken = true;
            }
        } else {
             newLogs.push(`ℹ️ No more Soviet markers to place.`);
        }
    }

    if (!actionTaken) {
        newLogs.push(`ℹ️ Soviet forces could not take any action.`);
    }
    
    // End of game check
    if (newSovietMarkerPool <= 0) {
      set({ nodes: newNodes, logs: newLogs });
      endGame("standard");
      return; 
    }

    const newSolitaireState = { ...solitaire, turn: solitaire.turn + 1, actionsLeft: 2, sovietMarkerPool: newSovietMarkerPool, playedAxisAuxiliaries: false };
    set({ nodes: newNodes, logs: newLogs, solitaire: newSolitaireState, recentlyCaptured: [] });
  },

  playCardFromHand: (cardId) => {
    const { playerResources, solitaire, logs } = get();
    const cardIndex = playerResources.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = playerResources.hand[cardIndex];
    const newHand = [...playerResources.hand];
    newHand.splice(cardIndex, 1);

    if (card.type === 'axis_auxiliaries') {
      if (solitaire.playedAxisAuxiliaries) {
        set({ logs: [...logs, "⛔ Już zagrałeś kartę Pomocników Osi w tej turze."] });
        return;
      }
      set(state => ({
        solitaire: { ...state.solitaire, actionsLeft: state.solitaire.actionsLeft + 1, playedAxisAuxiliaries: true },
        playerResources: { ...state.playerResources, hand: newHand },
        logs: [...logs, `✅ Zagrałeś ${card.name} i zyskałeś 1 akcję.`]
      }));
    } else if (card.type === 'recon') {
      set(state => ({
        playerResources: { ...state.playerResources, hand: newHand },
        gameState: 'PEEKING_DECK_CHOICE', 
        logs: [...logs, `✅ Zagrałeś ${card.name}. Wybierz talię do podejrzenia.`]
      }));
    }
  },

  peekAtDeck: (deckName) => {
    const { solitaire, logs } = get();
    let deck;
    if (deckName === 'soviet') {
      deck = solitaire.sovietDeck;
    } else {
      deck = solitaire.pursuitDeck;
    }

    if (deck.length > 0) {
      const topCard = deck[0];
      set({
        logs: [...logs, `🔍 Karta na wierzchu talii ${deckName}: ${topCard.name}`],
        gameState: 'IDLE'
      });
    } else {
      set({
        logs: [...logs, `ℹ️ Talia ${deckName} jest pusta.`],
        gameState: 'IDLE'
      });
    }
  },
  
  endGame: (victoryType) => {
    const { playerResources } = get();
    if (victoryType === "standard") {
        set({ 
            gameStatus: 'VICTORY', 
            victoryMessage: `KONIEC GRY! Sowiecki znacznik zaopatrzenia wyczerpany. Twój wynik to ${playerResources.medals} medali.`
        });
    } 
  },

  // --- HELPER FUNCTIONS ---
  addLog: (message, location = null, armyName = null) => {
    const formattedLog = createLogEntry(message, location, armyName);
    set(state => ({ 
      logs: [...state.logs, formattedLog]
    }));
  },

  // --- MISSING FUNCTIONS ---
  setGameState: (newState) => {
    const { solitaire } = get();
    
    // Reset moveCount when starting fresh armored movement
    if (newState === 'MOVE_ARMORED_ARMY') {
      set({ gameState: newState, solitaire: { ...solitaire, moveCount: 0 } });
    } else {
      set({ gameState: newState });
    }
  },

  spendAction: () => {
    const { solitaire, logs } = get();
    if (solitaire.actionsLeft > 0) {
      set({
        solitaire: { ...solitaire, actionsLeft: solitaire.actionsLeft - 1 },
      });
      return true;
    } else {
      set({ logs: [...logs, "⛔ Brak akcji! Zakończ turę."] });
      return false;
    }
  },

  toggleTransportMode: () => {
    const { gameState, solitaire, logs } = get();
    const transportState = get().transportActionState || { placedCount: 0, spentAction: false };
    
    if (gameState === 'TRANSPORT_MODE' || gameState === 'TRANSPORT_DIALOG') {
      // Exiting transport mode
      if (transportState.spentAction) {
        // Action was already spent (at least one route selected)
        // User is finishing the transport action early
        set({ 
          gameState: 'IDLE', 
          selectedEdgeIndex: null, 
          transportActionState: { placedCount: 0, spentAction: false },
          logs: [...logs, `✅ Zakończono akcję transportu (wykorzystano ${transportState.placedCount} tras).`]
        });
      } else {
        // Action was not spent yet (no routes selected)
        // User is canceling before first selection - no action cost
        set({ 
          gameState: 'IDLE', 
          selectedEdgeIndex: null, 
          transportActionState: { placedCount: 0, spentAction: false },
          logs: [...logs, `❌ Anulowano akcję transportu (brak kosztu akcji).`]
        });
      }
    } else {
      // Entering transport mode
      // Don't spend action yet - will be spent on first route selection
      const limits = getLogisticsLimits(solitaire.logisticsLevel);
      set({ 
        gameState: 'TRANSPORT_MODE', 
        selectedEdgeIndex: null, 
        transportActionState: { placedCount: 0, spentAction: false },
        logs: [...logs, `🚚 Wybierz trasę transportu. Możesz umieścić maksymalnie ${limits.place} jednostek. (Akcja zostanie wydana po wyborze pierwszej trasy)`]
      });
    }
  },

  selectTransportEdge: (edgeIndex) => {
    const { edges, nodes } = get();
    const edge = edges[edgeIndex];
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    // Helper: Check if area is controlled by any German player (not Soviet)
    const isPlayerControlled = (controller) => controller && controller !== null && ['gray', 'white', 'brown'].includes(controller);

    if (!isPlayerControlled(sourceNode.controller) || !isPlayerControlled(targetNode.controller)) {
      set(state => ({
        logs: [...state.logs, "⛔ BŁĄD: Możesz transportować tylko między obszarami, które kontrolujesz!"]
      }));
      return;
    }
    set({ selectedEdgeIndex: edgeIndex, gameState: 'TRANSPORT_DIALOG' });
  },

  finishMove: () => {
    set(state => ({
      gameState: 'IDLE',
      solitaire: { ...state.solitaire, moveCount: 0 }
    }));
  },

  adjustSovietMarkers: (amount) => {
    const { solitaire } = get();
    const newPool = Math.max(0, solitaire.sovietMarkerPool + amount);
    set({
      solitaire: { ...solitaire, sovietMarkerPool: newPool }
    });
  }

}), 
{ name: 'race-to-moscow-storage' }
));

export default useGameStore;
