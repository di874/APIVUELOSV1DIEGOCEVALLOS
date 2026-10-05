import React, { useState, useEffect } from 'react';
import { X, Check, Plane, Zap, ShieldCheck, Sparkles, Info } from 'lucide-react';

export default function SeatMapModal({ 
  isOpen, 
  onClose, 
  seatMapData, 
  onSelectSeat, 
  selectedSeat, 
  flightInfo, 
  isBookingFlow,
  selectedFareBrand 
}) {
  const [currentSeat, setCurrentSeat] = useState(selectedSeat || '');
  const [activeSectionFilter, setActiveSectionFilter] = useState('ALL'); // 'ALL' | 'PREMIUM' | 'FORWARD' | 'EXIT' | 'STANDARD'

  useEffect(() => {
    if (isOpen) {
      setCurrentSeat(selectedSeat || '');
    }
  }, [isOpen, selectedSeat]);

  if (!isOpen || !seatMapData) return null;

  // Flatten all rows from cabins
  const allRows = seatMapData?.cabins?.flatMap(c => c.rows) || [];

  // Group rows into 4 distinct aircraft sections:
  const sections = [
    {
      id: 'PREMIUM',
      name: 'Sección 1: Premium Economy',
      rowsRange: 'Filas 1 a 3',
      badge: 'EXTRA LEGROOM',
      badgeColor: '#1d4ed8',
      badgeBg: '#dbeafe',
      tagline: 'Mayor espacio para piernas (34") • Desembarque prioritario',
      fareBenefit: '⭐ Recomendada especialmente para tarifa TOP',
      isHighlight: selectedFareBrand === 'Top',
      rows: allRows.filter(r => r.rowNumber >= 1 && r.rowNumber <= 3)
    },
    {
      id: 'FORWARD',
      name: 'Sección 2: Economy Delantera',
      rowsRange: 'Filas 4 a 10',
      badge: 'SALIDA RÁPIDA',
      badgeColor: '#0369a1',
      badgeBg: '#e0f2fe',
      tagline: 'Filas preferentes delanteras para un desembarque ágil',
      fareBenefit: 'Excelente para tarifas PLUS y TOP',
      isHighlight: selectedFareBrand === 'Plus',
      rows: allRows.filter(r => r.rowNumber >= 4 && r.rowNumber <= 10)
    },
    {
      id: 'EXIT',
      name: 'Sección 3: Salidas de Emergencia',
      rowsRange: 'Filas 11 y 12',
      badge: 'MAYOR ESPACIO (ALAS)',
      badgeColor: '#b45309',
      badgeBg: '#fef3c7',
      tagline: '⚡ Espacio extra para estirar las piernas sobre las alas',
      fareBenefit: 'Asientos sobre el ala del Airbus A320',
      hasWings: true,
      rows: allRows.filter(r => r.rowNumber >= 11 && r.rowNumber <= 12)
    },
    {
      id: 'STANDARD',
      name: 'Sección 4: Economy Estándar',
      rowsRange: 'Filas 13 a 24',
      badge: 'CABINA PRINCIPAL',
      badgeColor: '#475569',
      badgeBg: '#f1f5f9',
      tagline: 'Cabina principal espaciosa • Confort para todas las tarifas',
      fareBenefit: 'Disponible para tarifas LIGHT, PLUS y TOP',
      rows: allRows.filter(r => r.rowNumber >= 13 && r.rowNumber <= 24)
    }
  ];

  const filteredSections = activeSectionFilter === 'ALL' 
    ? sections 
    : sections.filter(s => s.id === activeSectionFilter);

  // Helper to get description of chosen seat
  const getSeatDescription = (seatNum) => {
    if (!seatNum) return null;
    const match = seatNum.match(/^(\d+)([A-F])$/);
    if (!match) return `Asiento ${seatNum}`;
    const row = parseInt(match[1]);
    const col = match[2];
    const isWindow = col === 'A' || col === 'F';
    const isAisle = col === 'C' || col === 'D';
    const loc = isWindow ? 'Ventana' : (isAisle ? 'Pasillo' : 'Centro');
    
    let secName = 'Economy Estándar';
    if (row <= 3) secName = 'Premium Economy (Extra Legroom)';
    else if (row <= 10) secName = 'Economy Delantera';
    else if (row <= 12) secName = 'Salida de Emergencia (Extra Legroom)';
    
    return `${seatNum} • Fila ${row} • ${loc} • ${secName}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 25, 53, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'var(--color-latam-navy)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', backgroundColor: 'var(--color-latam-coral)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                {isBookingFlow ? 'PASO 1 DE 2: ELECCIÓN DE ASIENTO' : 'MAPA DE ASIENTOS'}
              </span>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>Airbus A320 • Flota AEROCACHE</div>
            </div>
            <div style={{ fontSize: '12px', color: '#9bb1c9', marginTop: '4px' }}>
              {flightInfo ? `Vuelo ${flightInfo} • ` : ''}
              {selectedFareBrand ? `Tarifa seleccionada: ${selectedFareBrand} • ` : ''}
              Elige tu asiento por secciones antes de confirmar tu reserva
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 18px',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
            Secciones:
          </span>
          {[
            { id: 'ALL', label: 'Todo el Avión (1-24)' },
            { id: 'PREMIUM', label: '1. Premium (1-3)' },
            { id: 'FORWARD', label: '2. Delantera (4-10)' },
            { id: 'EXIT', label: '3. Emergencia (11-12)' },
            { id: 'STANDARD', label: '4. Estándar (13-24)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSectionFilter(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeSectionFilter === tab.id ? '700' : '500',
                backgroundColor: activeSectionFilter === tab.id ? 'var(--color-latam-navy)' : '#fff',
                color: activeSectionFilter === tab.id ? '#fff' : '#475569',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          padding: '10px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11px',
          color: '#475569',
          flexWrap: 'wrap'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #cbd5e1', display: 'inline-block' }} /> Disponible
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-latam-coral)', display: 'inline-block' }} /> Seleccionado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#94a3b8', display: 'inline-block' }} /> Ocupado (No disponible)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', border: '2px solid #3b82f6', display: 'inline-block' }} /> Extra Legroom
          </span>
        </div>

        {/* Airplane Fuselage Scroll Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
          
          <div style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
            
            {/* Cockpit Indicator */}
            <div style={{
              width: '180px',
              margin: '0 auto 16px auto',
              backgroundColor: 'var(--color-latam-navy)',
              color: '#fff',
              textAlign: 'center',
              padding: '8px 16px',
              borderRadius: '24px 24px 8px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              boxShadow: '0 4px 10px rgba(0,25,53,0.15)'
            }}>
              ▲ CABINA DE PILOTOS
            </div>

            {/* Front Galley & Doors */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: '11px', color: '#64748b', fontWeight: 'bold', borderBottom: '1px dashed #cbd5e1', marginBottom: '14px' }}>
              <span>🚪 Puerta 1L • 🚻 Baño</span>
              <span>☕ Galley • 🚪 Puerta 1R</span>
            </div>

            {/* Column Labels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr) 30px repeat(3, 1fr)',
              textAlign: 'center',
              fontWeight: '800',
              fontSize: '12px',
              color: 'var(--color-latam-navy)',
              marginBottom: '10px',
              padding: '0 12px'
            }}>
              <span>A</span><span>B</span><span>C</span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>FILA</span>
              <span>D</span><span>E</span><span>F</span>
            </div>

            {/* SECTIONS RENDERING */}
            {filteredSections.map((section) => (
              <div 
                key={section.id} 
                style={{
                  backgroundColor: section.isHighlight ? '#eff6ff' : '#fff',
                  borderRadius: '16px',
                  border: section.isHighlight ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                  padding: '16px 14px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  position: 'relative'
                }}
              >
                {/* Wings Graphic on Emergency Exit Section */}
                {section.hasWings && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      left: '-28px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#b45309',
                      transform: 'rotate(-90deg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Plane size={14} /> ALA IZQ
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '-28px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#b45309',
                      transform: 'rotate(90deg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Plane size={14} /> ALA DER
                    </div>
                  </>
                )}

                {/* Section Header Card */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '8px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        color: section.badgeColor,
                        backgroundColor: section.badgeBg,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {section.badge}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--color-latam-navy)' }}>
                        {section.name}
                      </strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {section.tagline}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                    {section.rowsRange}
                  </span>
                </div>

                {/* Rows inside this section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {section.rows.map(row => (
                    <div
                      key={row.rowNumber}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr) 30px repeat(3, 1fr)',
                        gap: '6px',
                        alignItems: 'center'
                      }}
                    >
                      {/* Left Seats: A, B, C */}
                      {['A', 'B', 'C'].map(col => {
                        const seat = row.seats?.find(s => s.seatNumber === `${row.rowNumber}${col}`);
                        if (!seat) return <div key={col} />;
                        const isSel = currentSeat === seat.seatNumber;
                        const isExtra = seat.characteristics?.includes('EXTRA_LEGROOM');
                        
                        return (
                          <button
                            key={seat.seatNumber}
                            type="button"
                            disabled={!seat.isAvailable}
                            onClick={() => setCurrentSeat(seat.seatNumber)}
                            title={seat.isAvailable ? `Asiento ${seat.seatNumber} (${col === 'A' ? 'Ventana' : col === 'C' ? 'Pasillo' : 'Centro'})` : `Asiento ${seat.seatNumber} (Ocupado)`}
                            style={{
                              height: '36px',
                              borderRadius: '7px',
                              backgroundColor: isSel ? 'var(--color-latam-coral)' : (seat.isAvailable ? '#fff' : '#cbd5e1'),
                              color: isSel ? '#fff' : (seat.isAvailable ? '#1e293b' : '#64748b'),
                              border: isSel 
                                ? '2px solid #b91c1c' 
                                : isExtra 
                                  ? '2px solid #3b82f6' 
                                  : (seat.isAvailable ? '1px solid #cbd5e1' : '1px solid #94a3b8'),
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: seat.isAvailable ? 'pointer' : 'not-allowed',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isSel ? '0 2px 8px rgba(232, 17, 75, 0.4)' : (seat.isAvailable ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'),
                              transition: 'all 0.15s'
                            }}
                          >
                            {seat.isAvailable ? seat.seatNumber : '✕'}
                          </button>
                        );
                      })}

                      {/* Aisle Number */}
                      <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', fontWeight: 'bold' }}>
                        {row.rowNumber}
                      </span>

                      {/* Right Seats: D, E, F */}
                      {['D', 'E', 'F'].map(col => {
                        const seat = row.seats?.find(s => s.seatNumber === `${row.rowNumber}${col}`);
                        if (!seat) return <div key={col} />;
                        const isSel = currentSeat === seat.seatNumber;
                        const isExtra = seat.characteristics?.includes('EXTRA_LEGROOM');
                        
                        return (
                          <button
                            key={seat.seatNumber}
                            type="button"
                            disabled={!seat.isAvailable}
                            onClick={() => setCurrentSeat(seat.seatNumber)}
                            title={seat.isAvailable ? `Asiento ${seat.seatNumber} (${col === 'F' ? 'Ventana' : col === 'D' ? 'Pasillo' : 'Centro'})` : `Asiento ${seat.seatNumber} (Ocupado)`}
                            style={{
                              height: '36px',
                              borderRadius: '7px',
                              backgroundColor: isSel ? 'var(--color-latam-coral)' : (seat.isAvailable ? '#fff' : '#cbd5e1'),
                              color: isSel ? '#fff' : (seat.isAvailable ? '#1e293b' : '#64748b'),
                              border: isSel 
                                ? '2px solid #b91c1c' 
                                : isExtra 
                                  ? '2px solid #3b82f6' 
                                  : (seat.isAvailable ? '1px solid #cbd5e1' : '1px solid #94a3b8'),
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: seat.isAvailable ? 'pointer' : 'not-allowed',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isSel ? '0 2px 8px rgba(232, 17, 75, 0.4)' : (seat.isAvailable ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'),
                              transition: 'all 0.15s'
                            }}
                          >
                            {seat.isAvailable ? seat.seatNumber : '✕'}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Rear Service Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontSize: '11px', color: '#64748b', fontWeight: 'bold', borderTop: '1px dashed #cbd5e1', marginTop: '14px' }}>
              <span>🚪 Puerta 2L • 🚻 Baño</span>
              <span>☕ Aft Galley • 🚪 Puerta 2R</span>
            </div>

            <div style={{
              width: '160px',
              margin: '12px auto 0 auto',
              backgroundColor: '#cbd5e1',
              color: '#334155',
              textAlign: 'center',
              padding: '6px 14px',
              borderRadius: '8px 8px 18px 18px',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '1px'
            }}>
              ▼ COLA DEL AVIÓN
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Asiento Seleccionado:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <strong style={{
                fontSize: '18px',
                color: currentSeat ? 'var(--color-latam-coral)' : '#94a3b8',
                backgroundColor: currentSeat ? '#fef2f2' : '#f1f5f9',
                padding: '2px 10px',
                borderRadius: '6px',
                border: currentSeat ? '1px solid #fecaca' : '1px solid #cbd5e1'
              }}>
                {currentSeat || 'Ninguno'}
              </strong>
              {currentSeat ? (
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                  ✓ {getSeatDescription(currentSeat)}
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
                  * Haz clic en cualquier asiento disponible
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!currentSeat}
            onClick={() => {
              if (currentSeat) {
                onSelectSeat(currentSeat);
                onClose();
              }
            }}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              backgroundColor: currentSeat ? 'var(--color-latam-coral)' : '#94a3b8',
              color: '#fff',
              fontWeight: '800',
              fontSize: '14px',
              cursor: currentSeat ? 'pointer' : 'not-allowed',
              opacity: currentSeat ? 1 : 0.6,
              border: 'none',
              boxShadow: currentSeat ? '0 4px 12px rgba(232, 17, 75, 0.3)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {currentSeat ? `Confirmar Asiento (${currentSeat}) y Continuar ➔` : 'Selecciona un Asiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
