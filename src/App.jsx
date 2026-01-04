import React, { useState, useRef, useEffect } from 'react';
import useGameStore from './store/gameStore';
import './App.css';
import { 
  TruckIcon, TrainIcon, TankIcon, AmmoIcon, FuelIcon, FoodIcon, 
  MedalIcon, HaltIcon, SovietIcon, FortIcon, VictoryIcon, 
  ArrowDownIcon, ArrowUpIcon, ArrowRightIcon, ToolIcon, 
  CombatIcon, SupplyBoxIcon 
} from './components/Icons';

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

const SolitaireActions = ({ store }) => {
  const { solitaire, takeSupplies, takeTransport, endTurn, finishMove, gameState } = store;
  const { turn, actionsLeft, moveCount } = solitaire;

  return (
    <div className="panel-section">
      <div className="panel-title">TURA {turn} - Akcje: {actionsLeft}</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        { gameState === 'MOVE_ARMORED_ARMY' && moveCount > 0 ?
          <button className="btn btn-success" onClick={() => finishMove()}>Zakończ Ruch</button> :
          <>
            <button className="btn btn-primary" onClick={() => store.setGameState('MOVE_FIELD_ARMIES')}>Ruch Armii Polowych</button>
            <button className="btn btn-primary" onClick={() => store.setGameState('MOVE_ARMORED_ARMY')}>Ruch Armii Pancernej</button>
            <button className="btn btn-primary" onClick={() => store.toggleTransportMode()}>Transport Zaopatrzenia</button>
            <button className="btn btn-primary" onClick={() => takeSupplies()}>Pobierz Zaopatrzenie</button>
            <button className="btn btn-primary" onClick={() => takeTransport()}>Pobierz Transport</button>
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

  if (gameStatus === 'CHOOSE_ARMY_GROUP') {
    return (
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#131316', color: 'white', flexDirection: 'column'}}>
        <h1 style={{color: '#eab308', fontSize: '3em'}}>Wybierz Grupę Armii</h1>
        <div style={{display: 'flex', gap: '20px', marginTop: '20px'}}>
          <button className="btn btn-primary" onClick={() => store.initializeSolitaireGame('gray')}>Grupa Armii Północ (Szara)</button>
          <button className="btn btn-primary" onClick={() => store.initializeSolitaireGame('white')}>Grupa Armii Środek (Biała)</button>
          <button className="btn btn-primary" onClick={() => store.initializeSolitaireGame('brown')}>Grupa Armii Południe (Brązowa)</button>
        </div>
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
                <select className="select-dark" value={transportForm.transportType} onChange={e => setTransportForm({...transportForm, transportType: e.target.value})}><option value="truck" disabled={playerResources.trucks < 1}>Ciężarówka ({playerResources.trucks})</option>{edge.transportType === 'rail' && <option value="train" disabled={playerResources.trains < 1}>Pociąg ({playerResources.trains})</option>}</select>
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
    return (
        <div className="panel-section">
            <div className="panel-title">Zasoby Globalne</div>
            <div className="resource-row"><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><MedalIcon size={18} color="#eab308" /> Medale</span> <strong style={{color: '#eab308'}}>{playerResources.medals}</strong></div>
            <div className="resource-row"><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><TruckIcon size={18} /> Ciężarówki</span> <strong>{playerResources.trucks}</strong></div>
            <div className="resource-row"><span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><TrainIcon size={18} /> Pociągi</span> <strong>{playerResources.trains}</strong></div>
            <hr style={{borderColor: 'var(--border-color)', margin: '15px 0'}}/>
            <div style={{color: '#a1a1aa', fontSize:'0.9em', marginBottom:'8px'}}>Baza Główna (Stock):</div>
            <div style={{display:'flex', justifyContent:'space-around', gap: '8px'}}>
              <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><FuelIcon size={16} /> {playerResources.supplyStock.fuel}</span>
              <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><AmmoIcon size={16} /> {playerResources.supplyStock.ammo}</span>
              <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><FoodIcon size={16} /> {playerResources.supplyStock.food}</span>
            </div>
            <button className={`btn ${gameState === 'TRANSPORT_MODE' ? 'btn-warning' : 'btn-primary'}`} style={{marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} onClick={() => store.toggleTransportMode()}><ToolIcon size={16} />{gameState === 'TRANSPORT_MODE' ? 'ZAKOŃCZ TRANSPORT' : 'TRYB TRANSPORTU'}</button>
        </div>
    );
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>RACE TO MOSCOW</span>
            <button className="btn btn-danger btn-sm" style={{width: 'auto', margin: 0, padding: '2px 8px', fontSize: '0.8em'}} onClick={handleNewGame} title="Zresetuj grę">NOWA GRA</button>
        </div>

        <div className="sidebar-scroll-content">
            <SolitaireActions store={store} />
            {gameState === 'RAILHEAD_ADVANCEMENT' && 
              <div className="panel-section">
                <div className="panel-title">Postęp Kolei</div>
                <p>Wybierz jeden z podświetlonych obszarów, aby ulepszyć go do połączenia kolejowego.</p>
                <ul>
                  {nodes.filter(node => 
                    node.controller === store.solitaire.chosenArmyGroup && 
                    !node.isRail && 
                    edges.some(e => {
                      const otherId = e.source === node.id ? e.target : e.source;
                      const otherNode = nodes.find(n => n.id === otherId);
                      return otherNode && otherNode.isRail;
                    })
                  ).map(node => <li key={node.id}><button className='btn btn-link' onClick={() => store.advanceRailhead(node.id)}>{node.name}</button></li>)}
                </ul>
                <button className="btn btn-secondary" onClick={() => store.sovietReaction()}>Pomiń</button>
              </div>
            }
            {gameState === 'CONFIRM_FORCED_MARCH' ? <ForcedMarchConfirm store={store} /> : renderArmyStatus()}
            {renderActionContext()}
            <div className="panel-section"><div className="panel-title">Logi</div><div className="logs-container"><ul className="logs-list">{logs.slice().reverse().map((log, i) => <li key={i}>{log}</li>)}</ul></div></div>
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
              const isRail = edge.transportType === 'rail';
              const lineColor = edge.placedTransport ? (edge.placedTransport === 'train' ? '#8b8b8b' : '#ea580c') : (isRail ? '#71717a' : '#52525b');
              
              // Calculate control point for quadratic Bezier curve (adds organic feel)
              const midX = (start.x + end.x) / 2;
              const midY = (start.y + end.y) / 2;
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const offset = Math.sqrt(dx*dx + dy*dy) * 0.15; // 15% curve offset
              const controlX = midX - dy * offset / Math.sqrt(dx*dx + dy*dy);
              const controlY = midY + dx * offset / Math.sqrt(dx*dx + dy*dy);
              
              const pathData = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
              
              // Rail line decoration (crossties)
              const railDecorations = [];
              if (isRail && !edge.placedTransport) {
                const segmentCount = 8;
                for (let i = 1; i < segmentCount; i++) {
                  const t = i / segmentCount;
                  const x = (1-t)*(1-t)*start.x + 2*(1-t)*t*controlX + t*t*end.x;
                  const y = (1-t)*(1-t)*start.y + 2*(1-t)*t*controlY + t*t*end.y;
                  const angle = Math.atan2(end.y - start.y, end.x - start.x);
                  railDecorations.push(
                    <line key={i} x1={x-Math.sin(angle)*8} y1={y+Math.cos(angle)*8} x2={x+Math.sin(angle)*8} y2={y-Math.cos(angle)*8} stroke={lineColor} strokeWidth="2" opacity="0.6" />
                  );
                }
              }
              
              return (
                <g key={index} style={{pointerEvents: 'auto', cursor: gameState === 'TRANSPORT_MODE' ? 'pointer' : 'default'}} onClick={() => gameState === 'TRANSPORT_MODE' && store.selectTransportEdge(index)}>
                  {/* Invisible wide path for easier clicking */}
                  <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" />
                  {/* Visible connection path */}
                  <path d={pathData} stroke={lineColor} strokeWidth={edge.placedTransport ? "6" : "4"} fill="none" strokeDasharray={(!edge.placedTransport && !isRail) ? "8,4" : "0"} strokeLinecap="round" />
                  {/* Rail crossties decoration */}
                  {railDecorations}
                  {/* Transport icon on path */}
                  {edge.placedTransport && (
                    <g transform={`translate(${midX - 12}, ${midY - 12})`}>
                      {edge.placedTransport === 'train' ? <TrainIcon size={24} color="#fff" /> : <TruckIcon size={24} color="#ea580c" />}
                    </g>
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

            const isRailheadCandidate = gameState === 'RAILHEAD_ADVANCEMENT' && 
              node.controller === store.solitaire.chosenArmyGroup && 
              !node.isRail && 
              edges.some(e => {
                const otherId = e.source === node.id ? e.target : e.source;
                const otherNode = nodes.find(n => n.id === otherId);
                return otherNode && otherNode.isRail;
              });

            return (
                <div key={node.id} 
                    className={`map-node ${typeClass} ${controlClass} ${isRailheadCandidate ? 'railhead-candidate' : ''}`}
                    style={{ position: 'absolute', left: `${finalX}px`, top: `${finalY}px`, borderRadius: node.type === 'victory' ? '50%' : '8px', textAlign: 'center', zIndex: 1}}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => isRailheadCandidate && store.advanceRailhead(node.id)}
                >
                    <strong style={{ display: 'block', marginBottom: '3px' }}>{node.name}</strong>
                    
                    <div style={{display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', marginTop: '4px'}}>
                      {node.medal && <MedalIcon size={18} color="#eab308" title="Cel Medalowy" />}
                      {node.isVictory && <VictoryIcon size={18} color="#eab308" title="Cel Główny" />}
                      {node.type === 'fortified' && <FortIcon size={18} color="var(--text-secondary)" />}
                      {node.sovietMarker && <SovietIcon size={20} color="var(--accent-red)" />}
                    </div>
                    
                    {(node.resources?.fuel > 0 || node.resources?.ammo > 0 || node.resources?.food > 0) && (
                        <div style={{fontSize: '0.75em', backgroundColor: 'var(--bg-element)', borderRadius: '4px', padding: '4px', marginTop: '4px', border: '1px solid var(--accent-orange)', display: 'flex', gap: '6px', justifyContent: 'center'}}>
                            {node.resources.fuel > 0 && <span style={{display: 'flex', alignItems: 'center', gap: '2px'}}><FuelIcon size={12} />{node.resources.fuel}</span>}
                            {node.resources.ammo > 0 && <span style={{display: 'flex', alignItems: 'center', gap: '2px'}}><AmmoIcon size={12} />{node.resources.ammo}</span>}
                            {node.resources.food > 0 && <span style={{display: 'flex', alignItems: 'center', gap: '2px'}}><FoodIcon size={12} />{node.resources.food}</span>}
                        </div>
                    )}

                    {node.type === 'main_supply_base' && (
    <button 
        className="btn btn-success btn-sm" 
        // DODANO onMouseDown, aby zapobiec przeciąganiu mapy przy kliknięciu przycisku
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => store.resupplyBase(node.id)} 
        style={{marginTop: '5px', fontSize: '0.7em', padding: '2px 5px'}}
    >
        + Uzupełnij
    </button>
)}

                    {activeArmy.location !== node.id && (gameState === 'MOVE_FIELD_ARMIES' || gameState === 'MOVE_ARMORED_ARMY') && isConnected && (
                        <div style={{ marginTop: '2px' }}>
                            <button className="btn btn-move" onClick={() => store.moveArmy(activeArmy.id, node.id)} disabled={activeArmy.isGrounded} title={activeArmy.isGrounded ? "Armia uziemiona (brak żywności)" : "Przemieść tutaj"}>
                                {activeArmy.isGrounded ? 'HALT' : '>> RUCH <<'}
                            </button>
                        </div>
                    )}

                    {armiesHere.map(army => (
                        <div key={army.id} className={`army-token ${army.isGrounded ? 'halt' : ''}`} style={{cursor: 'pointer', border: selectedArmyId === army.id ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', transform: selectedArmyId === army.id ? 'scale(1.05)' : 'scale(1)'}} onClick={(e) => { e.stopPropagation(); setSelectedArmyId(army.id); }} title="Kliknij, aby dowodzić tą armią">{army.name}</div>
                    ))}
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
    </div>
  );
}

export default App;
