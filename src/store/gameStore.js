import { create } from 'zustand';
import initialMap from '../data/map.json';
import cardsData from '../data/cards.json';

// Pomocnicza funkcja do losowania karty
const drawCard = (deck) => deck[Math.floor(Math.random() * deck.length)];

const useGameStore = create((set, get) => ({
  // --- STAN POCZĄTKOWY ---
  
  // Mapa i Armie (dodajemy flagę isGrounded do armii na start)
  nodes: initialMap.nodes,
  edges: initialMap.edges.map((e, i) => ({ ...e, id: i, placedTransport: null })), 
  armies: initialMap.armies.map(a => ({ ...a, isGrounded: false })),
  
  // Zasoby gracza
  playerResources: {
    trucks: 5,
    trains: 3,
    supplyStock: { fuel: 20, ammo: 20, food: 20 } // Pula ogólna (poza planszą)
  },

  // Stany interfejsu i gry
  gameState: 'IDLE', // 'IDLE', 'ENCOUNTER_RESOLVING', 'TRANSPORT_MODE', 'TRANSPORT_DIALOG'
  activeCard: null,
  activeArmyId: null, // ID armii, która wykonuje akcję
  previousLocation: null, // Do cofnięcia ruchu (retreat)
  selectedEdgeIndex: null, // Wybrana linia do transportu
  
  logs: ["Gra rozpoczęta. 4. Panzergruppe gotowa w Rydze."],


  // --- LOGIKA REORGANIZACJI (GŁÓD I POWRÓT TRANSPORTU) ---
  triggerReorganization: () => {
      const { armies, playerResources, edges, logs } = get();
      const newArmies = [...armies];
      const newEdges = [...edges];
      const newResources = { ...playerResources };
      const newLogs = [...logs, "⚠️ REORGANIZACJA TEATRU DZIAŁAŃ!"];

      // 1. Powrót transportu do puli
      let trucksReturned = 0;
      let trainsReturned = 0;

      newEdges.forEach(edge => {
          if (edge.placedTransport === 'truck') trucksReturned++;
          if (edge.placedTransport === 'train') trainsReturned++;
          edge.placedTransport = null; // Czyścimy mapę
      });

      newResources.trucks += trucksReturned;
      newResources.trains += trainsReturned;
      newLogs.push(`Powrót transportu: +${trucksReturned} 🚚, +${trainsReturned} 🚂.`);

      // 2. Wyżywienie Armii
      newArmies.forEach(army => {
          // Każda armia musi zjeść 1 Food, inaczej HALT
          if ((army.supplies.food || 0) > 0) {
              army.supplies.food -= 1;
              newLogs.push(`${army.name} zjada 1 🍞.`);
          } else {
              // BRAK JEDZENIA -> HALT (chyba że już ma halt, to bez zmian)
              if (!army.isGrounded) {
                  army.isGrounded = true;
                  newLogs.push(`⛔ ${army.name} nie ma jedzenia! UZIEMIONA (HALT).`);
              } else {
                  newLogs.push(`⛔ ${army.name} nadal głoduje.`);
              }
          }
      });

      set({
          edges: newEdges,
          playerResources: newResources,
          armies: newArmies,
          logs: newLogs,
          gameState: 'IDLE' // Resetujemy ewentualne tryby
      });
  },


  // --- TRANSFER ZASOBÓW (ARMIA <-> MIASTO) ---
  transferResource: (armyId, resourceType, direction) => {
    // direction: 'TO_ARMY' lub 'TO_NODE'
    const { armies, nodes, logs } = get();
    const armyIndex = armies.findIndex(a => a.id === armyId);
    const army = armies[armyIndex];
    const nodeIndex = nodes.findIndex(n => n.id === army.location);
    const node = nodes[nodeIndex];

    const newArmies = [...armies];
    const newNodes = [...nodes];
    const newLogs = [...logs];
    
    // Obliczanie zajętości slotów w armii (max 6)
    const armyLoad = (army.supplies.fuel||0) + (army.supplies.ammo||0) + (army.supplies.food||0);

    if (direction === 'TO_ARMY') {
        // Sprawdź czy miasto ma zasób
        if (!node.resources || (node.resources[resourceType] || 0) <= 0) return;
        
        // Specjalny przypadek: Karmienie uziemionej armii
        // Jeśli armia ma HALT i ładujemy FOOD -> jedzenie znika, HALT znika, sloty nie są zajmowane
        if (resourceType === 'food' && army.isGrounded) {
            newNodes[nodeIndex].resources.food -= 1;
            newArmies[armyIndex].isGrounded = false;
            newLogs.push(`🍞 Dostarczono żywność do ${army.name}. HALT zdjęty!`);
        } 
        else {
            // Standardowy załadunek
            if (armyLoad >= 6) {
                set(state => ({ logs: [...state.logs, "⛔ Armia pełna! Max 6 żetonów."] }));
                return;
            }
            newNodes[nodeIndex].resources[resourceType] -= 1;
            // Inicjalizacja jeśli undefined
            newArmies[armyIndex].supplies[resourceType] = (newArmies[armyIndex].supplies[resourceType] || 0) + 1;
        }
    } 
    else if (direction === 'TO_NODE') {
        // Sprawdź czy armia ma zasób
        if ((army.supplies[resourceType] || 0) <= 0) return;
        
        // Przesuń z armii do miasta
        newArmies[armyIndex].supplies[resourceType] -= 1;
        
        // Inicjalizacja magazynu w mieście jeśli pusty
        if (!newNodes[nodeIndex].resources) newNodes[nodeIndex].resources = { fuel:0, ammo:0, food:0 };
        if (!newNodes[nodeIndex].resources[resourceType]) newNodes[nodeIndex].resources[resourceType] = 0;
        
        newNodes[nodeIndex].resources[resourceType] += 1;
    }

    set({ armies: newArmies, nodes: newNodes, logs: newLogs });
  },


  // --- LOGISTYKA: WYKONANIE TRANSPORTU ---
  executeTransport: (transportType, sourceId, targetId, resourcesToMove) => {
    const { edges, nodes, selectedEdgeIndex, playerResources } = get();
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const newResources = { ...playerResources };
    
    const sourceNodeIndex = newNodes.findIndex(n => n.id === sourceId);
    const targetNodeIndex = newNodes.findIndex(n => n.id === targetId);

    // 1. Zabierz ze źródła
    Object.keys(resourcesToMove).forEach(key => {
        const amount = resourcesToMove[key];
        if (newNodes[sourceNodeIndex].resources[key] >= amount) {
            newNodes[sourceNodeIndex].resources[key] -= amount;
        }
    });

    // 2. Dodaj do celu
    if (!newNodes[targetNodeIndex].resources) newNodes[targetNodeIndex].resources = { fuel:0, ammo:0, food:0 };
    Object.keys(resourcesToMove).forEach(key => {
        const amount = resourcesToMove[key];
        if (!newNodes[targetNodeIndex].resources[key]) newNodes[targetNodeIndex].resources[key] = 0;
        newNodes[targetNodeIndex].resources[key] += amount;
    });

    // 3. Zużyj token transportu
    if (transportType === 'truck') newResources.trucks -= 1;
    if (transportType === 'train') newResources.trains -= 1;
    
    // 4. Zablokuj krawędź
    newEdges[selectedEdgeIndex].placedTransport = transportType;

    // 5. Sprawdź warunek reorganizacji (Pociągi = 0)
    let shouldTriggerReorg = false;
    if (newResources.trains === 0) {
        shouldTriggerReorg = true;
    }

    set(state => ({
        nodes: newNodes,
        edges: newEdges,
        playerResources: newResources,
        gameState: 'TRANSPORT_MODE', // Wracamy do wyboru kolejnej trasy
        selectedEdgeIndex: null,
        logs: [...state.logs, `🚚 Transport (${transportType}) do ${newNodes[targetNodeIndex].name} wykonany.`]
    }));

    // Jeśli pociągi zeszły do zera -> uruchom reorganizację po aktualizacji stanu
    if (shouldTriggerReorg) {
        get().triggerReorganization();
    }
  },


  // --- RUCH ARMII ---
  moveArmy: (armyId, targetNodeId) => {
    const { armies, nodes, edges } = get();
    const armyIndex = armies.findIndex(a => a.id === armyId);
    const army = armies[armyIndex];
    
    // 0. Sprawdź blokadę HALT
    if (army.isGrounded) {
        set(state => ({ logs: [...state.logs, `⛔ ${army.name} jest uziemiona! Dostarcz żywność, aby ruszyć.`] }));
        return;
    }

    const targetNode = nodes.find(n => n.id === targetNodeId);

    // 1. Sprawdź połączenie
    const isConnected = edges.some(edge => 
      (edge.source === army.location && edge.target === targetNodeId) ||
      (edge.target === army.location && edge.source === targetNodeId)
    );
    if (!isConnected) return;

    // 2. Sprawdź paliwo (tylko pancerne)
    if (army.type === 'armored' && (army.supplies.fuel || 0) < 1) {
      set(state => ({ logs: [...state.logs, `⛔ Brak paliwa na ruch!`] }));
      return;
    }

    // 3. Sprawdź koszt fortyfikacji
    let ammoCost = 0;
    if (targetNode.type === 'fortified' && targetNode.controller !== army.owner) {
        ammoCost = 1;
        if ((army.supplies.ammo || 0) < 1) {
            set(state => ({ logs: [...state.logs, `⛔ Brak amunicji na wejście do fortu!`] }));
            return;
        }
    }

    // WYKONAJ RUCH
    const newArmies = [...armies];
    if (army.type === 'armored') newArmies[armyIndex].supplies.fuel -= 1;
    newArmies[armyIndex].supplies.ammo -= ammoCost;
    
    const prevLoc = army.location;
    newArmies[armyIndex].location = targetNodeId;

    // 4. Sprawdź co jest na polu (Karty)
    let drawnCard = null;
    if (targetNode.sovietMarker) {
        drawnCard = drawCard(cardsData.sovietDeck);
    } 
    else if (targetNode.controller !== army.owner) {
        drawnCard = drawCard(cardsData.pursuitDeck);
    }

    set(state => ({
      armies: newArmies,
      previousLocation: prevLoc,
      activeArmyId: armyId,
      activeCard: drawnCard,
      gameState: drawnCard ? 'ENCOUNTER_RESOLVING' : 'IDLE',
      logs: [...state.logs, `${army.name} wchodzi do ${targetNode.name}.`]
    }));
  },


  // --- ROZWIĄZYWANIE SPOTKAŃ (WALKA/ZDARZENIA) ---
  resolveEncounter: (decision) => {
    // decision: 'fight' | 'retreat' | 'pay_fuel' | 'ok'
    const { activeCard, activeArmyId, armies, previousLocation, nodes } = get();
    const armyIndex = armies.findIndex(a => a.id === activeArmyId);
    const army = armies[armyIndex];
    const newArmies = [...armies];
    const newNodes = [...nodes];

    // Logika WALKI (Soviet Card)
    if (activeCard.type === 'combat') {
        if (decision === 'fight') {
            // Sprawdź koszty
            if ((army.supplies.ammo || 0) >= activeCard.cost.ammo && (army.supplies.fuel || 0) >= activeCard.cost.fuel) {
                newArmies[armyIndex].supplies.ammo -= activeCard.cost.ammo;
                newArmies[armyIndex].supplies.fuel -= activeCard.cost.fuel;
                
                // Przejmij pole
                const nodeIndex = newNodes.findIndex(n => n.id === army.location);
                newNodes[nodeIndex].sovietMarker = false;
                newNodes[nodeIndex].controller = army.owner;

                set(state => ({
                    gameState: 'IDLE',
                    activeCard: null,
                    armies: newArmies,
                    nodes: newNodes,
                    logs: [...state.logs, `⚔️ Zwycięstwo! Teren przejęty.`]
                }));
            }
        } else if (decision === 'retreat') {
            // Odwrót
            newArmies[armyIndex].location = previousLocation;
            set(state => ({
                gameState: 'IDLE',
                activeCard: null,
                armies: newArmies,
                logs: [...state.logs, `🏳️ Odwrót.`]
            }));
        }
    }
    // Logika ZDARZEŃ (Pursuit Card)
    else if (activeCard.type === 'event') {
        if (activeCard.id === 'mud' && decision === 'pay_fuel') {
             newArmies[armyIndex].supplies.fuel -= 1;
             set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies, logs: [...state.logs, `Opłacono przejazd przez błoto.`] }));
        } 
        else if (activeCard.id === 'supplies') {
            newArmies[armyIndex].supplies.ammo = (newArmies[armyIndex].supplies.ammo || 0) + 1;
             set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies, logs: [...state.logs, `Znaleziono amunicję.`] }));
        }
        else {
            // Domyślne zamknięcie karty
            if (activeCard.effect === 'stop' && decision === 'retreat') {
                 newArmies[armyIndex].location = previousLocation;
            }
            set(state => ({ gameState: 'IDLE', activeCard: null, armies: newArmies }));
        }
    }
  },


  // --- UZUPEŁNIANIE BAZY (MAGIA) ---
  resupplyBase: (baseNodeId) => {
      const { nodes, playerResources } = get();
      const nodeIndex = nodes.findIndex(n => n.id === baseNodeId);
      const newNodes = [...nodes];
      const newResources = { ...playerResources };

      // Pobieramy z puli gracza do bazy na mapie
      ['fuel', 'ammo', 'food'].forEach(res => {
          if (newResources.supplyStock[res] >= 3) {
              newResources.supplyStock[res] -= 3;
              newNodes[nodeIndex].resources[res] = (newNodes[nodeIndex].resources[res] || 0) + 3;
          }
      });

      set(state => ({
          nodes: newNodes, 
          playerResources: newResources,
          logs: [...state.logs, `📦 Uzupełniono zapasy w bazie ${newNodes[nodeIndex].name}.`]
      }));
  },


  // --- INTERFEJS: TRYB TRANSPORTU ---
  toggleTransportMode: () => {
    const current = get().gameState;
    if (current === 'IDLE') {
        set({ gameState: 'TRANSPORT_MODE', logs: [...get().logs, "🔧 Tryb Transportu: Wybierz połączenie."] });
    } else if (current === 'TRANSPORT_MODE') {
        set({ gameState: 'IDLE', selectedEdgeIndex: null });
    }
  },

selectTransportEdge: (edgeIndex) => {
    const { edges, playerResources } = get();
    // const edge = edges[edgeIndex]; // To już nie jest potrzebne do blokady

    // Walidacje
    if (playerResources.trucks === 0 && playerResources.trains === 0) {
        set(state => ({ logs: [...state.logs, "⛔ Brak dostępnych pociągów i ciężarówek!"] }));
        return;
    }
    
    // USUNĄŁEM BLOKADĘ PONIŻEJ:
    // Teraz możesz klikać w tę samą linię wielokrotnie, żeby zużyć wszystkie pociągi na jednej trasie.
    /*
    if (edge.placedTransport) {
        set(state => ({ logs: [...state.logs, "⛔ Ta linia jest już zajęta w tej turze!"] }));
        return;
    }
    */
    
    // Otwórz dialog
    set({ gameState: 'TRANSPORT_DIALOG', selectedEdgeIndex: edgeIndex });
  }

}));

export default useGameStore;