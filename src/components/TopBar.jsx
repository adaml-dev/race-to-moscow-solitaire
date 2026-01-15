import React from 'react';
import useGameStore from '../store/gameStore';
import { MedalIcon, TruckIcon, TrainIcon, FuelIcon, AmmoIcon, FoodIcon } from './Icons';

const TopBar = () => {
  const { playerResources, solitaire, adjustSovietMarkers } = useGameStore();

  return (
    <div className="top-bar">
      <div className="top-bar-section">
        <span className="top-bar-label">Zasoby Globalne:</span>
        <div className="resource-item">
            <span style={{ marginRight: '10px', color: solitaire.chosenArmyGroup, fontWeight: 'bold', textTransform: 'uppercase' }}>{solitaire.chosenArmyGroup}</span>
          <MedalIcon size={18} color="#eab308" />
          <span>Medale:</span>
          <strong>{playerResources.medals}</strong>
        </div>
        <div className="resource-item">
          <TruckIcon size={18} />
          <span>Ciężarówki:</span>
          <strong>{playerResources.trucks}</strong>
        </div>
        <div className="resource-item">
          <TrainIcon size={18} />
          <span>Pociągi:</span>
          <strong>{playerResources.trains}</strong>
        </div>
        <div className="resource-item" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '18px' }}>☭</span>
          <span>Żetony sowieckie:</span>
          <button 
            onClick={() => adjustSovietMarkers(-1)}
            style={{ 
              padding: '2px 8px', 
              cursor: 'pointer',
              fontSize: '14px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '3px'
            }}
            disabled={solitaire.sovietMarkerPool <= 0}
          >
            −
          </button>
          <strong>{solitaire.sovietMarkerPool}</strong>
          <button 
            onClick={() => adjustSovietMarkers(1)}
            style={{ 
              padding: '2px 8px', 
              cursor: 'pointer',
              fontSize: '14px',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '3px'
            }}
          >
            +
          </button>
        </div>
        <div className="resource-item">
          <span style={{ fontSize: '18px' }}>🎴</span>
          <span>Karty sowieckie:</span>
          <strong>{solitaire.sovietDeck.length}</strong>
        </div>
      </div>
      <div className="top-bar-section">
        <span className="top-bar-label">Baza Główna (Stock):</span>
        <div className="resource-item">
          <FuelIcon size={16} />
          <span>Paliwo:</span>
          <strong>{playerResources.supplyStock.fuel}</strong>
        </div>
        <div className="resource-item">
          <AmmoIcon size={16} />
          <span>Amunicja:</span>
          <strong>{playerResources.supplyStock.ammo}</strong>
        </div>
        <div className="resource-item">
          <FoodIcon size={16} />
          <span>Żywność:</span>
          <strong>{playerResources.supplyStock.food}</strong>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
