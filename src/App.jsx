import React, { useState } from 'react';
import useGameStore from './store/gameStore';
import './App.css';

const getNodeCoords = (nodes, id) => {
  const node = nodes.find(n => n.id === id);
  return node ? { x: node.x + 50, y: node.y + 40 } : { x: 0, y: 0 };
};

const isNeighbor = (currentId, targetId, edges) => {
    return edges.some(edge => 
        (edge.source === currentId && edge.target === targetId) ||
        (edge.target === currentId && edge.source === targetId)
    );
};

function App() {
  const store = useGameStore();
  const { nodes, edges, armies, playerResources, logs, gameState, activeCard } = store;

  const [selectedArmyId, setSelectedArmyId] = useState(armies[0]?.id || null);
  const activeArmy = armies.find(a => a.id === selectedArmyId) || armies[0];
  const currentLocationNode = nodes.find(n => n.id === activeArmy.location);

  const [viewState, setViewState] = useState({ scale: 0.6, x: -100, y: -500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [transportForm, setTransportForm] = useState({ fuel: 0, ammo: 0, food: 0, direction: 'source-to-target', transportType: 'truck' });

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, viewState.scale + scaleAmount), 3);
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e) => {
    if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('army-token')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setViewState(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const resetView = () => setViewState({ scale: 0.6, x: -100, y: -500 });

  const renderArmyStatus = () => (
    <div className="panel-section">
      <div className="panel-title">WYBIERZ DO DOWODZENIA:</div>
      <div style={{display: 'flex', gap: '5px', marginBottom: '15px', flexWrap: 'wrap'}}>
        {armies.map(army => (
            <button key={army.id} className={`btn btn-sm ${selectedArmyId === army.id ? 'btn-primary' : ''}`} style={{flex: 1, border: selectedArmyId === army.id ? '1px solid white' : '1px solid #444'}} onClick={() => setSelectedArmyId(army.id)}>{army.name}</button>
        ))}
      </div>
      <div className="panel-title" style={{color: 'var(--accent-blue)'}}>Aktywna: {activeArmy.name}</div>
      {activeArmy.isGrounded && <div style={{backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', textAlign: 'center', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontWeight: 'bold'}}>🛑 HALT (Brak żywności)</div>}
      <div className="resource-row"><span style={{color: '#a1a1aa'}}>Lokalizacja</span><strong>{activeArmy.location.toUpperCase()}</strong></div>
      <div style={{backgroundColor: 'var(--bg-app)', padding: '10px', borderRadius: '6px', marginTop: '10px'}}>
        <div style={{fontSize: '0.8em', color: '#71717a', marginBottom: '8px', display: 'flex', justifyContent: 'space-between'}}><span>DO MIASTA ⬇️</span><span>MAX 6</span><span>Z MIASTA ⬆️</span></div>
        {['fuel', 'ammo', 'food'].map(res => {
            const icon = res === 'fuel' ? '⛽' : (res === 'ammo' ? '💣' : '🍞');
            const armyAmount = activeArmy.supplies[res] || 0;
            const cityAmount = currentLocationNode?.resources?.[res] || 0;
            return (
                <div key={res} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <button className="btn btn-sm" style={{width: '30px', backgroundColor: '#27272a'}} onClick={() => store.transferResource(activeArmy.id, res, 'TO_NODE')} disabled={armyAmount <= 0}>⬇️</button>
                    <div style={{fontWeight: 'bold', width: '60px', textAlign: 'center'}}>{icon} {armyAmount}</div>
                    <button className="btn btn-sm" style={{width: '30px', backgroundColor: '#27272a'}} onClick={() => store.transferResource(activeArmy.id, res, 'TO_ARMY')} disabled={cityAmount <= 0}>⬆️</button>
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
            <div className="panel-title" style={{color: 'var(--accent-red)'}}>⚔️ SPOTKANIE</div>
            <div style={{textAlign: 'center', marginBottom: '15px'}}><div style={{fontSize: '40px'}}>{activeCard.img}</div><h3 style={{margin: '5px 0'}}>{activeCard.name}</h3><p style={{fontSize: '0.9em', color: '#a1a1aa'}}>{activeCard.description}</p></div>
            {activeCard.type === 'combat' && (<div><div className="resource-row"><span>Koszt:</span> <span>💣{activeCard.cost.ammo} ⛽{activeCard.cost.fuel}</span></div><button className="btn btn-success" onClick={() => store.resolveEncounter('fight')} disabled={!canAfford}>WALCZ</button><button className="btn btn-danger" onClick={() => store.resolveEncounter('retreat')}>ODWRÓT</button></div>)}
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
        const handleConfirm = () => { store.executeTransport(transportForm.transportType, fromNode.id, toNode.id, transportForm); setTransportForm({ fuel: 0, ammo: 0, food: 0, direction: 'source-to-target', transportType: 'truck' }); };
        const increment = (res) => { if (currentLoad < capacity && (fromNode.resources?.[res] || 0) > transportForm[res]) setTransportForm({...transportForm, [res]: transportForm[res] + 1}); };
        return (
            <div className="panel-section">
                <div className="panel-title">Logistyka</div>
                <label style={{fontSize:'0.85em', color:'#a1a1aa'}}>Pojazd:</label>
                <select className="select-dark" value={transportForm.transportType} onChange={e => setTransportForm({...transportForm, transportType: e.target.value})}><option value="truck" disabled={playerResources.trucks < 1}>Ciężarówka ({playerResources.trucks})</option>{edge.transportType === 'rail' && <option value="train" disabled={playerResources.trains < 1}>Pociąg ({playerResources.trains})</option>}</select>
                <div style={{display:'flex', gap:'5px', margin:'15px 0'}}><button className={`btn btn-sm ${transportForm.direction === 'target-to-source' ? 'btn-primary' : ''}`} onClick={() => setTransportForm({...transportForm, direction: 'target-to-source', fuel:0, ammo:0, food:0})}>{sourceNode.name}</button><span style={{alignSelf:'center'}}>➡</span><button className={`btn btn-sm ${transportForm.direction === 'source-to-target' ? 'btn-primary' : ''}`} onClick={() => setTransportForm({...transportForm, direction: 'source-to-target', fuel:0, ammo:0, food:0})}>{targetNode.name}</button></div>
                <p style={{fontSize:'0.9em'}}>W magazynie ({fromNode.name}): ⛽{(fromNode.resources?.fuel||0)} 💣{(fromNode.resources?.ammo||0)} 🍞{(fromNode.resources?.food||0)}</p>
                {['fuel', 'ammo', 'food'].map(res => (<div key={res} className="resource-row"><span>{res === 'fuel' ? '⛽' : (res === 'ammo' ? '💣' : '🍞')}</span><div><button className="btn btn-sm" onClick={() => setTransportForm({...transportForm, [res]: Math.max(0, transportForm[res]-1)})}>-</button><span style={{margin: '0 10px', fontWeight: 'bold'}}>{transportForm[res]}</span><button className="btn btn-sm" onClick={() => increment(res)}>+</button></div></div>))}
                <div style={{textAlign:'center', margin:'10px 0', fontSize:'0.9em', color: currentLoad === capacity ? 'orange' : 'inherit'}}>Ładunek: {currentLoad} / {capacity}</div>
                <button className="btn btn-success" onClick={handleConfirm} disabled={currentLoad === 0}>WYŚLIJ</button> <button className="btn btn-danger" onClick={() => store.toggleTransportMode()}>ANULUJ</button>
            </div>
        );
    }
    return (
        <div className="panel-section">
            <div className="panel-title">Zasoby Globalne</div>
            <div className="resource-row"><span>🚚 Ciężarówki</span> <strong>{playerResources.trucks}</strong></div>
            <div className="resource-row"><span>🚂 Pociągi</span> <strong>{playerResources.trains}</strong></div>
            <hr style={{borderColor: 'var(--border-color)', margin: '15px 0'}}/>
            <div style={{color: '#a1a1aa', fontSize:'0.9em', marginBottom:'5px'}}>Baza Główna (Stock):</div>
            <div style={{display:'flex', justifyContent:'space-around'}}><span>⛽ {playerResources.supplyStock.fuel}</span><span>💣 {playerResources.supplyStock.ammo}</span><span>🍞 {playerResources.supplyStock.food}</span></div>
            <button className={`btn ${gameState === 'TRANSPORT_MODE' ? 'btn-warning' : 'btn-primary'}`} style={{marginTop: '20px'}} onClick={() => store.toggleTransportMode()}>{gameState === 'TRANSPORT_MODE' ? '❌ ZAKOŃCZ TRANSPORT' : '🔧 TRYB TRANSPORTU'}</button>
        </div>
    );
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">RACE TO MOSCOW</div>
        <div className="sidebar-scroll-content">
            {renderArmyStatus()}
            {renderActionContext()}
            <div className="panel-section"><div className="panel-title">Logi</div><div className="logs-container"><ul className="logs-list">{logs.slice().reverse().map((log, i) => <li key={i}>{log}</li>)}</ul></div></div>
        </div>
      </aside>

      <main className="map-viewport" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <div className="map-content" style={{transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`}}>
          <svg style={{ position: 'absolute', width: '4000px', height: '4000px', pointerEvents: 'none', zIndex: 0 }}>
            {edges.map((edge, index) => {
              const start = getNodeCoords(nodes, edge.source);
              const end = getNodeCoords(nodes, edge.target);
              const isRail = edge.transportType === 'rail';
              const lineColor = edge.placedTransport ? (edge.placedTransport === 'train' ? '#000' : '#ea580c') : (isRail ? '#71717a' : '#52525b');
              return (
                <g key={index} style={{pointerEvents: 'auto', cursor: gameState === 'TRANSPORT_MODE' ? 'pointer' : 'default'}} onClick={() => gameState === 'TRANSPORT_MODE' && store.selectTransportEdge(index)}>
                  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="transparent" strokeWidth="20" />
                  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={lineColor} strokeWidth={edge.placedTransport ? "6" : "4"} strokeDasharray={(!edge.placedTransport && isRail) ? "10,5" : "0"} />
                  {edge.placedTransport && <text x={(start.x + end.x)/2} y={(start.y + end.y)/2} fontSize="20" textAnchor="middle" dy="-5">{edge.placedTransport === 'train' ? '🚂' : '🚚'}</text>}
                </g>
              );
            })}
          </svg>

          {nodes.map(node => {
            let typeClass = "";
            if(node.type === 'main_supply_base') typeClass = "base";
            if(node.type === 'fortified') typeClass = "fort";
            if(node.isVictory) typeClass = "victory";
            
            // --- LOGIKA STYLIZACJI KONTROLI ---
            let controlClass = "neutral"; // Domyślnie neutralny (ciemny)
            if (node.sovietMarker) controlClass = "soviet"; // Sowiecki (czerwony)
            else if (node.controller === 'gray') controlClass = "controlled-gray";
            else if (node.controller === 'white') controlClass = "controlled-white";
            else if (node.controller === 'brown') controlClass = "controlled-brown";

            const isConnected = isNeighbor(activeArmy.location, node.id, edges);
            const armiesHere = armies.filter(a => a.location === node.id);

            return (
                <div key={node.id} 
                    className={`map-node ${typeClass} ${controlClass}`}
                    style={{ position: 'absolute', left: `${node.x}px`, top: `${node.y}px`, borderRadius: node.type === 'victory' ? '50%' : '8px', textAlign: 'center', zIndex: 1}}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <strong style={{ display: 'block', marginBottom: '3px' }}>{node.name}</strong>
                    {node.isVictory && <span>⭐</span>}
                    {node.type === 'fortified' && <span>🏰</span>}
                    {node.sovietMarker && <span style={{color: 'var(--accent-red)', fontSize: '1.2em', textShadow: '0 0 5px red'}}>☭</span>}
                    
                    {(node.resources?.fuel > 0 || node.resources?.ammo > 0 || node.resources?.food > 0) && (
                        <div style={{fontSize: '0.75em', backgroundColor: 'var(--bg-element)', borderRadius: '4px', padding: '2px', marginTop: '2px', border: '1px solid var(--accent-orange)'}}>
                            {node.resources.fuel > 0 && <span>⛽{node.resources.fuel} </span>}
                            {node.resources.ammo > 0 && <span>💣{node.resources.ammo} </span>}
                            {node.resources.food > 0 && <span>🍞{node.resources.food} </span>}
                        </div>
                    )}

                    {node.type === 'main_supply_base' && <button className="btn btn-success btn-sm" onClick={() => store.resupplyBase(node.id)} style={{marginTop: '5px', fontSize: '0.7em', padding: '2px 5px'}}>+ Uzupełnij</button>}

                    {activeArmy.location !== node.id && gameState === 'IDLE' && isConnected && (
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
        <div className="map-controls"><button className="map-control-btn" onClick={() => setViewState(p => ({...p, scale: p.scale + 0.2}))}>+</button><button className="map-control-btn" onClick={() => setViewState(p => ({...p, scale: Math.max(0.2, p.scale - 0.2)}))}>-</button><button className="map-control-btn" onClick={resetView}>⟲</button></div>
      </main>
    </div>
  );
}

export default App;