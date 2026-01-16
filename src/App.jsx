import React, { useState, useRef, useEffect } from 'react';
import useGameStore from './store/gameStore';
import './App.css';
import TopBar from './components/TopBar';
import { 
  TruckIcon, TrainIcon, TankIcon, AmmoIcon, FuelIcon, FoodIcon, 
  MedalIcon, HaltIcon, SovietIcon, FortIcon, VictoryIcon, 
  ArrowDownIcon, ArrowUpIcon, ArrowRightIcon, ToolIcon, 
  CombatIcon, SupplyBoxIcon, HandIcon
} from './components/Icons';

const ReorganizationConfirm = ({ store }) => (
  <div className="panel-section">
    <div className="panel-title">Reorganizacja Teatru Działań</div>
    <p>Użycie ostatniego pociągu spowoduje Reorganizację Teatru Działań. Czy chcesz kontynuować?</p>
    <div style={{display: 'flex', justifyContent: 'space-around'}}>
      <button className="btn btn-success" onClick={() => store.confirmReorganization(true)}>Tak</button>
      <button className="btn btn-danger" onClick={() => store.confirmReorganization(false)}>Nie</button>
    </div>
  </div>
);

const PlayerHand = ({ store }) => {
  const { playerResources, playCardFromHand } = store;

  if (!playerResources.hand || playerResources.hand.length === 0) {
    return null;
  }

  return (
    <div className="panel-section">
      <div className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
        <HandIcon size={16} /> Ręka
      </div>
      {playerResources.hand.map(card => (
        <div key={card.id} className="hand-card">
          <span>{card.name}</span>
          <button className="btn btn-sm btn-primary" onClick={() => playCardFromHand(card.id)}>Zagraj</button>
        </div>
      ))}
    </div>
  );
};

const PeekingDeckChoice = ({ store }) => {
  return (
    <div className="panel-section">
      <div className="panel-title">Podejrzyj Talię</div>
      <p>Wybierz, którą talię chcesz podejrzeć.</p>
      <div style={{display: 'flex', justifyContent: 'space-around'}}>
        <button className="btn btn-primary" onClick={() => store.peekAtDeck('soviet')}>Talia Sowietów</button>
        <button className="btn btn-primary" onClick={() => store.peekAtDeck('pursuit')}>Talia Pościgu</button>
      </div>
    </div>
  );
};

const ForcedMarchConfirm = ({ store }) => (
  <div className="panel-section">
    <div className="panel-title">Marsz Forsowny</div>
    <p>Czy chcesz wykonać marsz forsowny za 1 punkt żywności?</p>
    <div style={{display: 'flex', justifyContent: 'space-around'}}>
      <button className="btn btn-success" onClick={() => store.confirmForcedMarch(true)}>Tak</button>
      <button className="btn btn-danger" onClick={() => store.confirmForcedMarch(false)}>Nie</button>
    </div>
  </div>
);

const ContinueMoveConfirm = ({ store }) => (
  <div className="panel-section">
    <div className="panel-title">Kontynuuj Ruch</div>
    <p>Czy chcesz wydać 1 paliwo, aby kontynuować ruch?</p>
    <div style={{display: 'flex', justifyContent: 'space-around'}}>
      <button className="btn btn-success" onClick={() => store.confirmContinueMove(true)}>Tak</button>
      <button className="btn btn-danger" onClick={() => store.confirmContinueMove(false)}>Nie</button>
    </div>
  </div>
);

const SolitaireActions = ({ store }) => {
  const { solitaire, takeSupplies, takeTransport, endTurn, finishMove, gameState, transportActionState } = store;
  const { turn, actionsLeft, moveCount } = solitaire;
  const noActions = actionsLeft <= 0;
  
  // Block other actions if in transport mode after first route selection
  const inTransportMode = gameState === 'TRANSPORT_MODE' || gameState === 'TRANSPORT_DIALOG';
  const transportInProgress = inTransportMode && transportActionState?.spentAction;

  return (
    <div className="panel-section">
      <div className="panel-title">TURA {turn} - Akcje: {actionsLeft}</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px'}}>
        { gameState === 'MOVE_ARMORED_ARMY' && moveCount > 0 ?
          <button className="btn btn-success" onClick={() => finishMove()} style={{gridColumn: '1 / -1'}}>Zakończ Ruch</button> :
          inTransportMode ?
          <>
            {transportInProgress ? 
            <p style={{gridColumn: '1 / -1', textAlign: 'center', fontSize: '0.85em', color: '#a1a1aa', margin: '5px 0'}}>
              Wybierz kolejne trasy. Transport zakończy się automatycznie.
            </p>
            : 
            <button className="btn btn-warning" onClick={() => store.toggleTransportMode()} style={{gridColumn: '1 / -1'}}>
              '❌ Anuluj Transport'
            </button>}
          </> :
          <>
            <button className="btn btn-primary" onClick={() => store.setGameState('MOVE_FIELD_ARMIES')} disabled={noActions}>Ruch Armii Polowych</button>
            <button className="btn btn-primary" onClick={() => store.setGameState('MOVE_ARMORED_ARMY')} disabled={noActions}>Ruch Armii Pancernej</button>
            <button className="btn btn-primary" onClick={() => store.toggleTransportMode()} disabled={noActions}>Transport</button>
            <button className="btn btn-primary" onClick={() => store.setGameState('RESUPPLY_BASE')} disabled={noActions}>Uzupełnij Bazę</button>
            <button className="btn btn-primary" onClick={() => takeSupplies()} disabled={noActions}>Weź Zaopatrzenie</button>
            <button className="btn btn-primary" onClick={() => takeTransport()} disabled={noActions}>Weź Transport</button>
            <button className="btn btn-warning" onClick={() => endTurn()}>Zakończ Turę</button>
          </>
        }
      </div>
    </div>
  );
};

const getNodeCoords = (nodes, id, spacing) => {
  const node = nodes.find(n => n.id === id);
  return node ? { x: node.x * spacing + 50, y: node.y * spacing + 40 } : { x: 0, y: 0 };
};

const isNeighbor = (currentId, targetId, edges) => {
    return edges.some(edge => 
        (edge.source === currentId && edge.target === targetId) ||
        (edge.target === currentId && edge.source === targetId)
    );
};

function App() {
  const store = useGameStore();
  const { nodes, edges, armies, playerResources, logs, gameState, activeCard, gameStatus, victoryMessage, viewState, spacing } = store;

  const mapViewportRef = useRef(null);

  const [selectedArmyId, setSelectedArmyId] = useState(armies[0]?.id || null);
  const activeArmy = armies.find(a => a.id === selectedArmyId) || armies[0];
  const currentLocationNode = nodes.find(n => n.id === activeArmy.location);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [transportForm, setTransportForm] = useState({ fuel: 0, ammo: 0, food: 0, direction: 'source-to-target', transportType: 'truck' });

  // --- OBSŁUGA NOWEJ GRY ---
  const handleNewGame = () => {
      if (window.confirm("Czy na pewno chcesz zacząć NOWĄ GRĘ? Cały obecny postęp zostanie utracony.")) {
          store.resetGame(); 
          // Nie resetujemy viewState ani spacing, zgodnie z życzeniem!
          setSelectedArmyId(armies[0].id);
          setTransportForm({ fuel: 0, ammo: 0, food: 0, direction: 'source-to-target', transportType: 'truck' });
      }
  };

  useEffect(() => {
      if (gameState === 'TRANSPORT_DIALOG' && store.selectedEdgeIndex !== null) {
          const edge = edges[store.selectedEdgeIndex];
          const isRail = edge.transportType === 'rail';

          if (playerResources.trucks <= 0 && playerResources.trains > 0 && isRail) {
              setTransportForm(prev => ({ ...prev, transportType: 'train' }));
          } else {
              setTransportForm(prev => ({ ...prev, transportType: 'truck' }));
          }
      }
  }, [gameState, store.selectedEdgeIndex, playerResources.trucks, playerResources.trains, edges]);

  const updateZoom = (delta) => {
    if (!mapViewportRef.current) return;
    const newScale = Math.min(Math.max(0.1, viewState.scale + delta), 4.0);
    if (newScale === viewState.scale) return;
    const rect = mapViewportRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX - viewState.x) / viewState.scale;
    const worldY = (centerY - viewState.y) / viewState.scale;
    const newX = centerX - (worldX * newScale);
    const newY = centerY - (worldY * newScale);
    
    store.setViewState({ scale: newScale, x: newX, y: newY });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001; 
    updateZoom(scaleAmount * 2);
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('army-token')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      store.setViewState({ ...viewState, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  
  const resetView = () => {
      // Opcjonalny przycisk resetu widoku (gdyby użytkownik się zgubił)
      store.setViewState({ scale: 0.6, x: -100, y: -500 });
      store.setSpacing(1.0);
  };

  const [selectedArmyGroup, setSelectedArmyGroup] = useState(null);
  const [selectedGameMode, setSelectedGameMode] = useState(null);

  if (gameStatus === 'CHOOSE_ARMY_GROUP') {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#131316', color: 'white', flexDirection: 'column', gap: '30px'}}>
        <h1 style={{color: '#eab308', fontSize: '3em', marginBottom: '10px'}}>Wybierz Grupę Armii i Tryb Gry</h1>
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center'}}>
          <h2 style={{color: '#a1a1aa', fontSize: '1.5em', margin: '0'}}>Grupa Armii:</h2>
          <div style={{display: 'flex', gap: '15px'}}>
            <button 
              className={`btn ${selectedArmyGroup === 'gray' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedArmyGroup('gray')}
              style={{border: selectedArmyGroup === 'gray' ? '2px solid white' : '1px solid #444'}}
            >
              Północ (Szara)
            </button>
            <button 
              className={`btn ${selectedArmyGroup === 'white' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedArmyGroup('white')}
              style={{border: selectedArmyGroup === 'white' ? '2px solid white' : '1px solid #444'}}
            >
              Środek (Biała)
            </button>
            <button 
              className={`btn ${selectedArmyGroup === 'brown' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedArmyGroup('brown')}
              style={{border: selectedArmyGroup === 'brown' ? '2px solid white' : '1px solid #444'}}
            >
              Południe (Brązowa)
            </button>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center'}}>
          <h2 style={{color: '#a1a1aa', fontSize: '1.5em', margin: '0'}}>Tryb Gry:</h2>
          <div style={{display: 'flex', gap: '15px', flexDirection: 'column', maxWidth: '600px'}}>
            <button 
              className={`btn ${selectedGameMode === 'normal' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedGameMode('normal')}
              style={{
                border: selectedGameMode === 'normal' ? '2px solid white' : '1px solid #444',
                padding: '15px',
                textAlign: 'left'
              }}
            >
              <div style={{fontWeight: 'bold', fontSize: '1.1em', marginBottom: '5px'}}>🎯 Tryb Normalny</div>
              <div style={{fontSize: '0.9em', color: '#a1a1aa'}}>3 żetony sowieckie - pełna rozgrywka</div>
            </button>
            <button 
              className={`btn ${selectedGameMode === 'test' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedGameMode('test')}
              style={{
                border: selectedGameMode === 'test' ? '2px solid white' : '1px solid #444',
                padding: '15px',
                textAlign: 'left'
              }}
            >
              <div style={{fontWeight: 'bold', fontSize: '1.1em', marginBottom: '5px'}}>🧪 Tryb Testowy</div>
              <div style={{fontSize: '0.9em', color: '#a1a1aa'}}>20 żetonów sowieckich + automatyczne przetasowanie talii</div>
            </button>
          </div>
        </div>

        <button 
          className="btn btn-success"
          onClick={() => {
            if (selectedArmyGroup && selectedGameMode) {
              store.initializeSolitaireGame(selectedArmyGroup, selectedGameMode);
            }
          }}
          disabled={!selectedArmyGroup || !selectedGameMode}
          style={{
            fontSize: '1.3em',
            padding: '15px 40px',
            marginTop: '20px',
            opacity: (!selectedArmyGroup || !selectedGameMode) ? 0.5 : 1
          }}
        >
          ROZPOCZNIJ GRĘ
        </button>
      </div>
    );
  }

  if (gameStatus === 'VICTORY') {
      return (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#131316', color: 'white', flexDirection: 'column'}}>
              <h1 style={{color: '#eab308', fontSize: '4em'}}>ZWYCIĘSTWO!</h1>
              <p style={{fontSize: '1.5em'}}>{victoryMessage}</p>
              <div style={{fontSize: '2em', margin: '20px'}}>🎖️ Zdobyte medale: {playerResources.medals}</div>
              <button className="btn btn-primary" onClick={handleNewGame}>ZAGRAJ PONOWNIE</button>
          </div>
      );
  }

  const renderArmyStatus = () => (
    <div className="panel-section">
      <div className="panel-title">WYBIERZ DO DOWODZENIA:</div>
      <div style={{display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap'}}>
        {armies.map(army => (
            <button key={army.id} className={`btn btn-sm ${selectedArmyId === army.id ? 'btn-primary' : ''}`} style={{flex: 1, border: selectedArmyId === army.id ? '1px solid white' : '1px solid #444'}} onClick={() => setSelectedArmyId(army.id)}>{army.name}</button>
        ))}
      </div>
      <div className="panel-title" style={{color: 'var(--accent-blue)'}}>Aktywna: {activeArmy.name}</div>
      {activeArmy.isGrounded && <div style={{backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', textAlign: 'center', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}><HaltIcon size={20} color="#fca5a5" /> HALT (Brak żywności)</div>}
      <div className="resource-row"><span style={{color: '#a1a1aa'}}>Lokalizacja</span><strong>{activeArmy.location.toUpperCase()}</strong></div>
      <div style={{backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '6px', marginTop: '10px'}}>
        <div style={{fontSize: '0.8em', color: '#71717a', marginBottom: '8px', display: 'flex', justifyContent: 'space-between'}}><span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><ArrowDownIcon size={12} /> DO MIASTA</span><span>MAX 6</span><span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>Z MIASTA <ArrowUpIcon size={12} /></span></div>
        {['fuel', 'ammo', 'food'].map(res => {
            const IconComponent = res === 'fuel' ? FuelIcon : (res === 'ammo' ? AmmoIcon : FoodIcon);
            const armyAmount = activeArmy.supplies[res] || 0;
            const cityAmount = currentLocationNode?.resources?.[res] || 0;
            return (
                <div key={res} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <button className="btn btn-sm" style={{width: '30px', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => store.transferResource(activeArmy.id, res, 'TO_NODE')} disabled={armyAmount <= 0}><ArrowDownIcon size={14} /></button>
                    <div style={{fontWeight: 'bold', width: '80px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><IconComponent size={18} /> {armyAmount}</div>
                    <button className="btn btn-sm" style={{width: '30px', backgroundColor: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => store.transferResource(activeArmy.id, res, 'TO_ARMY')} disabled={cityAmount <= 0}><ArrowUpIcon size={14} /></button>
                </div>
            )
        })}
      </div>
    </div>
  );

const renderActionContext = () => {
    if (gameState === 'PEEKING_DECK_CHOICE') {
      return <PeekingDeckChoice store={store} />;
    }

    if (gameState === 'ENCOUNTER_RESOLVING' && activeCard) {
       const canAfford = activeCard.type === 'combat' && activeArmy.supplies.ammo >= activeCard.cost.ammo && activeArmy.supplies.fuel >= activeCard.cost.fuel;
       return (
         <div className="panel-section">
            <div className="panel-title" style={{color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px'}}><CombatIcon size={18} color="var(--accent-red)" /> SPOTKANIE</div>
            <div className="encounter-card">
              <div style={{fontSize: '60px', margin: '10px 0'}}>{activeCard.img}</div>
              <h3 style={{margin: '10px 0', fontFamily: 'Georgia, serif', fontSize: '1.3em'}}>{activeCard.name}</h3>
              <p style={{fontSize: '0.9em', color: '#a1a1aa', lineHeight: '1.4'}}>{activeCard.description}</p>
            </div>
            {activeCard.type === 'combat' && (<div><div className="resource-row"><span>Koszt:</span> <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><AmmoIcon size={16} />{activeCard.cost.ammo} <FuelIcon size={16} />{activeCard.cost.fuel}</span></div><button className="btn btn-success" onClick={() => store.resolveEncounter('fight')} disabled={!canAfford}>WALCZ</button><button className="btn btn-danger" onClick={() => store.resolveEncounter('retreat')}>ODWRÓT</button></div>)}
            {activeCard.type === 'event' && activeCard.id !== 'mud' && <button className="btn btn-primary" onClick={() => store.resolveEncounter('ok')}>OK</button>}
            {activeCard.id === 'mud' && (<div><button className="btn btn-warning" onClick={() => store.resolveEncounter('pay_fuel')}>Zapłać 1 Paliwo</button><button className="btn btn-danger" onClick={() => store.resolveEncounter('retreat')}>Cofnij</button></div>)}
         </div>
       );
    }
    if (gameState === 'TRANSPORT_DIALOG' && store.selectedEdgeIndex !== null) {
        const edge = edges[store.selectedEdgeIndex];
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        const fromNode = transportForm.direction === 'source-to-target' ? sourceNode : targetNode;
        const toNode = transportForm.direction === 'source-to-target' ? targetNode : sourceNode;
        const capacity = transportForm.transportType === 'truck' ? 4 : 6;
        const currentLoad = transportForm.fuel + transportForm.ammo + transportForm.food;
        const canAffordTransport = (transportForm.transportType === 'truck' && playerResources.trucks > 0) || (transportForm.transportType === 'train' && playerResources.trains > 0);

        const handleConfirm = () => { 
            store.executeTransport(transportForm.transportType, fromNode.id, toNode.id, transportForm); 
            setTransportForm(prev => ({ ...prev, fuel: 0, ammo: 0, food: 0 })); 
        };
        const increment = (res) => { if (currentLoad < capacity && (fromNode.resources?.[res] || 0) > transportForm[res]) setTransportForm({...transportForm, [res]: transportForm[res] + 1}); };
        
        return (
            <div className="panel-section">
                <div className="panel-title">Logistyka</div>
                <label style={{fontSize:'0.85em', color:'#a1a1aa'}}>Pojazd:</label>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', margin: '5px 0'}}>
                  <button 
                    className={`btn ${transportForm.transportType === 'truck' ? 'btn-primary' : ''}`} 
                    onClick={() => setTransportForm({...transportForm, transportType: 'truck'})} 
                    disabled={playerResources.trucks < 1 || edge.hasTruck}
                    title={edge.hasTruck ? "Na tej linii jest już ciężarówka! (Zasada 14.6)" : ""}>
                      <TruckIcon /> Ciężarówka ({playerResources.trucks})
                  </button>
                  <button 
                    className={`btn ${transportForm.transportType === 'train' ? 'btn-primary' : ''}`} 
                    onClick={() => setTransportForm({...transportForm, transportType: 'train'})} 
                    disabled={playerResources.trains < 1 || !sourceNode.isRail || !targetNode.isRail || edge.hasTrain}
                    title={edge.hasTrain ? "Na tej linii jest już pociąg! (Zasada 14.6)" : (!sourceNode.isRail || !targetNode.isRail) ? "Brak torow kolejowych" : ""}>
                      <TrainIcon /> Pociąg ({playerResources.trains})
                  </button>
                </div>
                <div style={{display:'flex', gap:'5px', margin:'15px 0'}}><button className={`btn btn-sm ${transportForm.direction === 'target-to-source' ? 'btn-primary' : ''}`} onClick={() => setTransportForm({...transportForm, direction: 'target-to-source', fuel:0, ammo:0, food:0})}>{sourceNode.name}</button><span style={{alignSelf:'center'}}>➡</span><button className={`btn btn-sm ${transportForm.direction === 'source-to-target' ? 'btn-primary' : ''}`} onClick={() => setTransportForm({...transportForm, direction: 'source-to-target', fuel:0, ammo:0, food:0})}>{targetNode.name}</button></div>
                <p style={{fontSize:'0.9em', display: 'flex', gap: '12px', justifyContent: 'center'}}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><FuelIcon size={14} />{(fromNode.resources?.fuel||0)}</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><AmmoIcon size={14} />{(fromNode.resources?.ammo||0)}</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><FoodIcon size={14} />{(fromNode.resources?.food||0)}</span>
                </p>
                {['fuel', 'ammo', 'food'].map(res => { 
                  const ResourceIcon = res === 'fuel' ? FuelIcon : (res === 'ammo' ? AmmoIcon : FoodIcon);
                  return (<div key={res} className="resource-row"><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><ResourceIcon size={16} /></span><div><button className="btn btn-sm" onClick={() => setTransportForm({...transportForm, [res]: Math.max(0, transportForm[res]-1)})}>-</button><span style={{margin: '0 10px', fontWeight: 'bold'}}>{transportForm[res]}</span><button className="btn btn-sm" onClick={() => increment(res)}>+</button></div></div>)
                })}
                <div style={{textAlign:'center', margin:'10px 0', fontSize:'0.9em', color: currentLoad === capacity ? 'orange' : 'inherit'}}>Ładunek: {currentLoad} / {capacity}</div>
                <button className="btn btn-success" onClick={handleConfirm} disabled={currentLoad === 0 || !canAffordTransport} title={!canAffordTransport ? "Brak pojazdów tego typu!" : "Wyślij"}>WYŚLIJ</button> <button className="btn btn-danger" onClick={() => store.toggleTransportMode()}>ANULUJ</button>
            </div>
        );
    }
     return null;
  }; return (
    <div className="app-container">
      <TopBar />
      <div className="app-main-content">
      <aside className="sidebar">
        <div className="sidebar-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>RACE TO MOSCOW</span>
            <button className="btn btn-danger btn-sm" style={{width: 'auto', margin: 0, padding: '2px 8px', fontSize: '0.8em'}} onClick={handleNewGame} title="Zresetuj grę">NOWA GRA</button>
        </div>

<div className="sidebar-scroll-content">
            <SolitaireActions store={store} />
            <PlayerHand store={store} />
            {gameState === 'RAILHEAD_ADVANCEMENT' && 
              <div className="panel-section">
                <div className="panel-title">Postęp Kolei</div>
                <p>Wybierz jeden z podświetlonych obszarów, aby ulepszyć go do połączenia kolejowego.</p>
                <ul>
                  {nodes.filter(node => {
                    const isPlayerControlled = (controller) => controller && controller !== null && ['gray', 'white', 'brown'].includes(controller);
                    return isPlayerControlled(node.controller) && 
                    !node.isRail && 
                    edges.some(e => {
                      const otherId = e.source === node.id ? e.target : e.source;
                      const otherNode = nodes.find(n => n.id === otherId);
                      return otherNode && isPlayerControlled(otherNode.controller) && otherNode.isRail;
                    });
                  }).map(node => <li key={node.id}><button className='btn btn-link' onClick={() => store.advanceRailhead(node.id)}>{node.name}</button></li>)}
                </ul>
                <button className="btn btn-secondary" onClick={() => store.sovietReaction()}>Pomiń</button>
              </div>
            }
            {gameState === 'CONFIRM_FORCED_MARCH' ? <ForcedMarchConfirm store={store} /> : (gameState === 'CONFIRM_CONTINUE_MOVE' ? <ContinueMoveConfirm store={store} /> : gameState === 'CONFIRM_REORGANIZATION' ? <ReorganizationConfirm store={store} /> : renderArmyStatus())}
        </div>
      </aside>

      <main
        className="map-viewport"
        ref={mapViewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div className="map-content" style={{transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`}}>
          <svg style={{ position: 'absolute', width: '5000px', height: '5000px', pointerEvents: 'none', zIndex: 0 }}>
            {edges.map((edge, index) => {
              const start = getNodeCoords(nodes, edge.source, spacing);
              const end = getNodeCoords(nodes, edge.target, spacing);
              
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              const isDynamicRail = sourceNode?.isRail && targetNode?.isRail;

              // Rule 14.6: Different colors for different transport states
              let lineColor = isDynamicRail ? '#eab308' : '#52525b'; // Default: rail or road
              if (edge.hasTruck && edge.hasTrain) {
                lineColor = '#9333ea'; // Purple for both
              } else if (edge.hasTrain) {
                lineColor = '#8b8b8b'; // Gray for train only
              } else if (edge.hasTruck) {
                lineColor = '#ea580c'; // Orange for truck only
              }
              
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const len = Math.sqrt(dx*dx + dy*dy);

              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              const curveOffset = len * 0.15; 
              const controlX = midX - dy * curveOffset / len;
              const controlY = midY + dx * curveOffset / len;
              
              const pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;

              const doubleLineOffset = 2;
              const offsetX = -dy / len * doubleLineOffset;
              const offsetY = dx / len * doubleLineOffset;

              const pathData1 = `M ${start.x + offsetX} ${start.y + offsetY} Q ${controlX + offsetX} ${controlY + offsetY} ${end.x + offsetX} ${end.y + offsetY}`;
              const pathData2 = `M ${start.x - offsetX} ${start.y - offsetY} Q ${controlX - offsetX} ${controlY - offsetY} ${end.x - offsetX} ${end.y - offsetY}`;
              
              return (
                <g key={index} style={{pointerEvents: 'auto', cursor: gameState === 'TRANSPORT_MODE' ? 'pointer' : 'default'}} onClick={() => gameState === 'TRANSPORT_MODE' && store.selectTransportEdge(index)}>
                  {/* Invisible wide path for easier clicking */}
                  <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" />
                  
                  {isDynamicRail ? (
                    <>
                      <path d={pathData1} stroke={lineColor} strokeWidth={(edge.hasTruck || edge.hasTrain) ? "3" : "2"} fill="none"  strokeLinecap="round" />
                      <path d={pathData2} stroke={lineColor} strokeWidth={(edge.hasTruck || edge.hasTrain) ? "3" : "2"} fill="none"  strokeLinecap="round" />
                    </>
                  ) : (
                    <path d={pathData} stroke={lineColor} strokeWidth={(edge.hasTruck || edge.hasTrain) ? "6" : "4"} fill="none" strokeDasharray={(edge.hasTruck || edge.hasTrain) ? "0" : "8,4"} strokeLinecap="round" />
                  )}

                  {/* Transport icons on path - Rule 14.6: show both if both present */}
                  {(edge.hasTruck || edge.hasTrain) && (
                    <>
                      {edge.hasTruck && edge.hasTrain ? (
                        // Both transport types present - show both icons
                        <>
                          <g transform={`translate(${midX - 24}, ${midY - 12})`}>
                            <TruckIcon size={20} color="#ea580c" />
                          </g>
                          <g transform={`translate(${midX + 4}, ${midY - 12})`}>
                            <TrainIcon size={20} color="#fff" />
                          </g>
                        </>
                      ) : edge.hasTrain ? (
                        // Only train
                        <g transform={`translate(${midX - 12}, ${midY - 12})`}>
                          <TrainIcon size={24} color="#fff" />
                        </g>
                      ) : (
                        // Only truck
                        <g transform={`translate(${midX - 12}, ${midY - 12})`}>
                          <TruckIcon size={24} color="#ea580c" />
                        </g>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {nodes.map(node => {
            let typeClass = "";
            if(node.type === 'main_supply_base') typeClass = "base";
            if(node.type === 'fortified') typeClass = "fort";
            if(node.isVictory) typeClass = "victory";
            
            let controlClass = "neutral";
            if (node.sovietMarker) controlClass = "soviet";
            else if (node.controller === 'gray') controlClass = "controlled-gray";
            else if (node.controller === 'white') controlClass = "controlled-white";
            else if (node.controller === 'brown') controlClass = "controlled-brown";

            const isConnected = isNeighbor(activeArmy.location, node.id, edges);
            const armiesHere = armies.filter(a => a.location === node.id);
            const finalX = node.x * spacing;
            const finalY = node.y * spacing;

            const isPlayerControlled = (controller) => controller && controller !== null && ['gray', 'white', 'brown'].includes(controller);
            const isRailheadCandidate = gameState === 'RAILHEAD_ADVANCEMENT' && 
              isPlayerControlled(node.controller) && 
              !node.isRail && 
              edges.some(e => {
                const otherId = e.source === node.id ? e.target : e.source;
                const otherNode = nodes.find(n => n.id === otherId);
                return otherNode && isPlayerControlled(otherNode.controller) && otherNode.isRail;
              });

            return (
                <div key={node.id} 
                    className={`map-node ${typeClass} ${controlClass} ${isRailheadCandidate ? 'railhead-candidate' : ''}`}
                    style={{ position: 'absolute', left: `${finalX}px`, top: `${finalY}px`, borderRadius: node.type === 'victory' ? '50%' : '8px', textAlign: 'center', zIndex: 1}}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => isRailheadCandidate && store.advanceRailhead(node.id)}
                >
                    <strong style={{ display: 'block', marginBottom: '3px' }}>
                      {node.name}
                      {node.resources && (node.resources.fuel > 0 || node.resources.ammo > 0 || node.resources.food > 0) && (
                        <span style={{ marginLeft: '6px' }}>
                          {(node.resources.fuel || 0)}{(node.resources.ammo || 0)}{(node.resources.food || 0)}
                        </span>
                      )}
                    </strong>
                    
                    <div style={{display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', marginTop: '4px'}}>
                      {node.medal && <MedalIcon size={18} color="#eab308" title="Cel Medalowy" />}
                      {node.isVictory && <VictoryIcon size={18} color="#eab308" title="Cel Główny" />}
                      {node.type === 'fortified' && <FortIcon size={18} color="var(--text-secondary)" />}
                      {node.sovietMarker && <SovietIcon size={20} color="var(--accent-red)" />}
                    </div>

                    {gameState === 'RESUPPLY_BASE' && node.type === 'main_supply_base' && (
                        <button 
                            className="btn btn-success" 
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => store.resupplyBase(node.id)} 
                            style={{marginTop: '5px'}}
                        >
                            + UZUPEŁNIJ TUTAJ
                        </button>
                    )}

                    {activeArmy.location !== node.id && (gameState === 'MOVE_FIELD_ARMIES' || gameState === 'MOVE_ARMORED_ARMY') && isConnected && (
                        <div style={{ marginTop: '2px' }}>
                            <button className="btn btn-move" onClick={() => store.moveArmy(activeArmy.id, node.id)} disabled={activeArmy.isGrounded} title={activeArmy.isGrounded ? "Armia uziemiona (brak żywności)" : "Przemieść tutaj"}>
                                {activeArmy.isGrounded ? 'HALT' : '>> RUCH <<'}
                            </button>
                        </div>
                    )}

                    {armiesHere.map(army => {
                        const fuel = army.supplies.fuel || 0;
                        const ammo = army.supplies.ammo || 0;
                        const food = army.supplies.food || 0;
                        const resourceCode = `${fuel}${ammo}${food}`;
                        return (
                            <div key={army.id} className={`army-token ${army.isGrounded ? 'halt' : ''}`} style={{cursor: 'pointer', border: selectedArmyId === army.id ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', transform: selectedArmyId === army.id ? 'scale(1.05)' : 'scale(1)'}} onClick={(e) => { e.stopPropagation(); setSelectedArmyId(army.id); }} title="Kliknij, aby dowodzić tą armią">{army.name} {resourceCode}</div>
                        );
                    })}
                </div>
            );
          })}
        </div>

        <div className="map-toolbar">
            <div className="toolbar-group">
                <span className="toolbar-label">Zoom:</span>
                <button className="map-control-btn" onClick={() => updateZoom(0.2)}>+</button>
                <button className="map-control-btn" onClick={() => updateZoom(-0.2)}>-</button>
            </div>
            <div style={{width:'1px', background:'var(--border-color)'}}></div>
            <div className="toolbar-group">
                <span className="toolbar-label">Odległość:</span>
                <button className="map-control-btn" onClick={() => store.setSpacing(Math.min(2.0, spacing + 0.1))}>↔️+</button>
                <button className="map-control-btn" onClick={() => store.setSpacing(Math.max(0.5, spacing - 0.1))}>↔️-</button>
            </div>
            <div style={{width:'1px', background:'var(--border-color)'}}></div>
            <button className="map-control-btn" onClick={resetView} title="Resetuj widok">⟲</button>
        </div>

      </main>
<aside className="sidebar sidebar-right">
        <div className="sidebar-scroll-content">
            { gameState === 'RESUPPLY_BASE' ?
                <div className="panel-section">
                  <div className="panel-title">Uzupełnianie Bazy</div>
                  <p style={{color: '#a1a1aa', fontSize: '0.9em'}}>Wybierz jedną z aktywnych baz zaopatrzeniowych na mapie, aby przenieść do niej 3 jednostki każdego typu zasobu ze składu głównego.</p>
                  <p style={{color: '#eab308', fontSize: '0.9em', textAlign: 'center' , fontWeight: 'bold'}}>Ta akcja kosztuje 1 punkt akcji.</p>
                  <button className="btn btn-danger" onClick={() => store.setGameState('IDLE')}>Anuluj</button>
                </div> :
            (renderActionContext() ? renderActionContext() : 
              <div className="panel-section">
                <div className="panel-title" style={{color: 'var(--text-secondary)'}}>Gotowi do działania!</div>
                <p style={{color: '#a1a1aa', fontSize: '0.9em', textAlign: 'center'}}>Wybierz akcję z lewego panelu, aby rozpocząć.</p>
              </div>
            )}
            <div className="panel-section panel-log">
                <div className="panel-title">Log</div>
                <div className="logs-container">
                    <ol className="logs-list" reversed>{logs.slice().reverse().map((log, i) => <li key={i}>{log}</li>)}</ol>
                </div>
            </div>
        </div>
      </aside>
      </div>
    </div>
  );
}

export default App;
