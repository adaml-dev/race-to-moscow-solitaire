import { create } from 'zustand';
import initialMap from '../data/map.json';
import cardsData from '../data/cards.json';

// Pomocnicza funkcja do losowania karty
const drawCard = (deck) => deck[Math.floor(Math.random() * deck.length)];

const useGameStore = create((set, get) => ({
  // --- STAN POCZĄTKOWY ---
  
  nodes: initialMap.nodes,
  edges: initialMap.edges.map((e, i) => ({ ...e, id: i, placedTransport: null })), 
  armies: initialMap.armies.map(a => ({ ...a, isGrounded: false })),
  
  playerResources: {
    trucks: 5,
    trains: 3,
    supplyStock: { fuel: 20, ammo: 20, food: 20 }
  },

  gameState: 'IDLE', 
  activeCard: null,
  activeArmyId: null,
  previousLocation: null,
  selectedEdgeIndex: null,
  
  logs: ["Gra rozpoczęta. Wybierz armię i ruszaj na Moskwę!"],

  // --- ALGORYTM OKRĄŻENIA (ENCIRCLEMENT) ---
  checkEncirclement: () => {
      const { nodes, edges, logs, armies, activeArmyId } = get();
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
                  
                  if (!visited.has(neighborId) && neighborNode.controller === null) {
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

      newNodes.forEach(node => {
          if (node.controller === null) {
              if (!hasSupplyLine(node.id)) {
                  encircledNames.push(node.name);
                  if (node.sovietMarker) {
                      node.sovietMarker = false;
                  }
                  node.controller = capturerColor;
                  encirclementOccurred = true;
              }
          }
      });

      if (encirclementOccurred) {
          set({ 
              nodes: newNodes,
              logs: [...logs, `⚔️ KOCIOŁ! Odcięto i przejęto: ${encircledNames.join(', ')}`]
          });
      }
  },

  // --- LOGIKA REORGANIZACJI ---
  triggerReorganization: () => {
      const { armies, playerResources, edges, logs } = get();
      const newArmies = [...armies];
      const newEdges = [...edges];
      const newResources = { ...playerResources };
      const newLogs = [...logs, "⚠️ REORGANIZACJA TEATRU DZIAŁAŃ!"];

      let trucksReturned = 0;
      let trainsReturned = 0;

      newEdges.forEach(edge => {
          if (edge.placedTransport === 'truck') trucksReturned++;
          if (edge.placedTransport === 'train') trainsReturned++;
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
              }
          }
      });

      set({ edges: newEdges, playerResources: newResources, armies: newArmies, logs: newLogs, gameState: 'IDLE' });
  },

  // --- TRANSFER ZASOBÓW ---
  transferResource: (armyId, resourceType, direction) => {
    const { armies, nodes, logs } = get();
    const armyIndex = armies.findIndex(a => a.id === armyId);
    const army = armies[armyIndex];
    const nodeIndex = nodes.findIndex(n => n.id === army.location);
    const node = nodes[nodeIndex];
    const newArmies = [...armies];
    const newNodes = [...nodes];
    const newLogs = [...logs];
    const armyLoad = (army.supplies.fuel||0) + (army.supplies.ammo||0) + (army.supplies.food||0);

    if (direction === 'TO_ARMY') {
        if (!node.resources || (node.resources[resourceType] || 0) <= 0) return;
        if (resourceType === 'food' && army.isGrounded) {
            newNodes[nodeIndex].resources.food -= 1;
            newArmies[armyIndex].isGrounded = false;
            newLogs.push(`🍞 Dostarczono żywność do ${army.name}. HALT zdjęty!`);
        } else {
            if (armyLoad >= 6) {
                set(state => ({ logs: [...state.logs, "⛔ Armia pełna! Max 6 żetonów."] }));
                return;
            }
            newNodes[nodeIndex].resources[resourceType] -= 1;
            newArmies[armyIndex].supplies[resourceType] = (newArmies[armyIndex].supplies[resourceType] || 0) + 1;
        }
    } else if (direction === 'TO_NODE') {
        if ((army.supplies[resourceType] || 0) <= 0) return;
        newArmies[armyIndex].supplies[resourceType] -= 1;
        if (!newNodes[nodeIndex].resources) newNodes[nodeIndex].resources = { fuel:0, ammo:0, food:0 };
        if (!newNodes[nodeIndex].resources[resourceType]) newNodes[nodeIndex].resources[resourceType] = 0;
        newNodes[nodeIndex].resources[resourceType] += 1;
    }
    set({ armies: newArmies, nodes: newNodes, logs: newLogs });
  },

  // --- LOGISTYKA ---
  executeTransport: (transportType, sourceId, targetId, resourcesToMove) => {
    const { edges, nodes, selectedEdgeIndex, playerResources } = get();
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const newResources = { ...playerResources };
    const sourceNodeIndex = newNodes.findIndex(n => n.id === sourceId);
    const targetNodeIndex = newNodes.findIndex(n => n.id === targetId);

    Object.keys(resourcesToMove).forEach(key => {
        const amount = resourcesToMove[key];
        if (newNodes[sourceNodeIndex].resources[key] >= amount) newNodes[sourceNodeIndex].resources[key] -= amount;
    });
    if (!newNodes[targetNodeIndex].resources) newNodes[targetNodeIndex].resources = { fuel:0, ammo:0, food:0 };
    Object.keys(resourcesToMove).forEach(key => {
        const amount = resourcesToMove[key];
        if (!newNodes[targetNodeIndex].resources[key]) newNodes[targetNodeIndex].resources[key] = 0;
        newNodes[targetNodeIndex].resources[key] += amount;
    });

    if (transportType === 'truck') newResources.trucks -= 1;
    if (transportType === 'train') newResources.trains -= 1;
    newEdges[selectedEdgeIndex].placedTransport = transportType;

    let shouldTriggerReorg = false;
    if (newResources.trains === 0) shouldTriggerReorg = true;

    set(state => ({
        nodes: newNodes, edges: newEdges, playerResources: newResources, gameState: 'TRANSPORT_MODE',
        selectedEdgeIndex: null, logs: [...state.logs, `🚚 Transport (${transportType}) do ${newNodes[targetNodeIndex].name} wykonany.`]
    }));
    if (shouldTriggerReorg) get().triggerReorganization();
  },

  // --- RUCH ARMII ---
  moveArmy: (armyId, targetNodeId) => {
    const { armies, nodes, edges } = get();
    const armyIndex = armies.findIndex(a => a.id === armyId);
    const army = armies[armyIndex];
    if (army.isGrounded) {
        set(state => ({ logs: [...state.logs, `⛔ ${army.name} jest uziemiona! Dostarcz żywność.`] }));
        return;
    }
    const targetNode = nodes.find(n => n.id === targetNodeId);
    const isConnected = edges.some(edge => 
      (edge.source === army.location && edge.target === targetNodeId) ||
      (edge.target === army.location && edge.source === targetNodeId)
    );
    if (!isConnected) return;
    if (army.type === 'armored' && (army.supplies.fuel || 0) < 1) {
      set(state => ({ logs: [...state.logs, `⛔ Brak paliwa na ruch!`] }));
      return;
    }
    let ammoCost = 0;
    if (targetNode.type === 'fortified' && targetNode.controller !== army.owner) {
        ammoCost = 1;
        if ((army.supplies.ammo || 0) < 1) {
            set(state => ({ logs: [...state.logs, `⛔ Brak amunicji na wejście do fortu!`] }));
            return;
        }
    }

    const newArmies = [...armies];
    if (army.type === 'armored') newArmies[armyIndex].supplies.fuel -= 1;
    newArmies[armyIndex].supplies.ammo -= ammoCost;
    
    const prevLoc = army.location;
    newArmies[armyIndex].location = targetNodeId;

    let drawnCard = null;
    let newNodes = [...nodes];

    if (!targetNode.sovietMarker && targetNode.controller !== army.owner) {
        const nodeIndex = newNodes.findIndex(n => n.id === targetNodeId);
        newNodes[nodeIndex].controller = army.owner;
        drawnCard = drawCard(cardsData.pursuitDeck);
    } else if (targetNode.sovietMarker) {
        drawnCard = drawCard(cardsData.sovietDeck);
    }

    set(state => ({
      armies: newArmies, nodes: newNodes, previousLocation: prevLoc, activeArmyId: armyId, activeCard: drawnCard,
      gameState: drawnCard ? 'ENCOUNTER_RESOLVING' : 'IDLE', logs: [...state.logs, `${army.name} wchodzi do ${targetNode.name}.`]
    }));

    if (!targetNode.sovietMarker) get().checkEncirclement();
  },

  resolveEncounter: (decision) => {
    const { activeCard, activeArmyId, armies, previousLocation, nodes } = get();
    const armyIndex = armies.findIndex(a => a.id === activeArmyId);
    const army = armies[armyIndex];
    const newArmies = [...armies];
    const newNodes = [...nodes];

    if (activeCard.type === 'combat') {
        if (decision === 'fight') {
            if ((army.supplies.ammo || 0) >= activeCard.cost.ammo && (army.supplies.fuel || 0) >= activeCard.cost.fuel) {
                newArmies[armyIndex].supplies.ammo -= activeCard.cost.ammo;
                newArmies[armyIndex].supplies.fuel -= activeCard.cost.fuel;
                const nodeIndex = newNodes.findIndex(n => n.id === army.location);
                newNodes[nodeIndex].sovietMarker = false;
                newNodes[nodeIndex].controller = army.owner;
                set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes, logs: [...state.logs, `⚔️ Zwycięstwo! Teren przejęty.`] }));
                get().checkEncirclement();
            }
        } else if (decision === 'retreat') {
            newArmies[armyIndex].location = previousLocation;
            set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies, logs: [...state.logs, `🏳️ Odwrót.`] }));
        }
    } else if (activeCard.type === 'event') {
        if (activeCard.id === 'mud' && decision === 'pay_fuel') {
             newArmies[armyIndex].supplies.fuel -= 1;
             const nodeIndex = newNodes.findIndex(n => n.id === army.location);
             newNodes[nodeIndex].controller = army.owner;
             set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes, logs: [...state.logs, `Opłacono przejazd przez błoto.`] }));
             get().checkEncirclement();
        } else if (activeCard.id === 'supplies') {
            newArmies[armyIndex].supplies.ammo = (newArmies[armyIndex].supplies.ammo || 0) + 1;
             const nodeIndex = newNodes.findIndex(n => n.id === army.location);
             newNodes[nodeIndex].controller = army.owner;
             set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies, nodes: newNodes, logs: [...state.logs, `Znaleziono amunicję.`] }));
             get().checkEncirclement();
        } else {
            if (activeCard.effect === 'stop' && decision === 'retreat') {
                 newArmies[armyIndex].location = previousLocation;
            } else {
                 const nodeIndex = newNodes.findIndex(n => n.id === army.location);
                 newNodes[nodeIndex].controller = army.owner;
                 get().checkEncirclement();
            }
            set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies }));
        }
    }
  },

  resupplyBase: (baseNodeId) => {
      const { nodes, playerResources } = get();
      const nodeIndex = nodes.findIndex(n => n.id === baseNodeId);
      const newNodes = [...nodes];
      const newResources = { ...playerResources };
      ['fuel', 'ammo', 'food'].forEach(res => {
          if (newResources.supplyStock[res] >= 3) {
              newResources.supplyStock[res] -= 3;
              newNodes[nodeIndex].resources[res] = (newNodes[nodeIndex].resources[res] || 0) + 3;
          }
      });
      set(state => ({ nodes: newNodes, playerResources: newResources, logs: [...state.logs, `📦 Uzupełniono zapasy w bazie ${newNodes[nodeIndex].name}.`] }));
  },

  // --- POPRAWIONA FUNKCJA PRZEŁĄCZANIA TRYBU ---
  toggleTransportMode: () => {
    const current = get().gameState;
    if (current === 'IDLE') {
        set({ gameState: 'TRANSPORT_MODE', logs: [...get().logs, "🔧 Tryb Transportu: Wybierz połączenie."] });
    } else if (current === 'TRANSPORT_MODE') {
        set({ gameState: 'IDLE', selectedEdgeIndex: null });
    } else if (current === 'TRANSPORT_DIALOG') {
        // NAPRAWA: Cofnij do wyboru linii (zamiast robić nic)
        set({ gameState: 'TRANSPORT_MODE', selectedEdgeIndex: null });
    }
  },

  selectTransportEdge: (edgeIndex) => {
    const { playerResources } = get();
    if (playerResources.trucks === 0 && playerResources.trains === 0) {
        set(state => ({ logs: [...state.logs, "⛔ Brak dostępnych pociągów i ciężarówek!"] }));
        return;
    }
    set({ gameState: 'TRANSPORT_DIALOG', selectedEdgeIndex: edgeIndex });
  }
}));

export default useGameStore;