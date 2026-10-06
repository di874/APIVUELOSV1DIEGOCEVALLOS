import React, { useState, useEffect } from 'react';
import { X, Check, Plane, Zap, ShieldCheck, Sparkles, Info, Lock, AlertCircle } from 'lucide-react';

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
  const [activeSectionFilter, setActiveSectionFilter] = useState('ALL');
  const [fareAlertMessage, setFareAlertMessage] = useState(null);

  const fareBrandNorm = (selectedFareBrand || 'Top').trim();
  const fareBrandLower = fareBrandNorm.toLowerCase(); // 'top' | 'plus' | 'light'

  // Determine allowed rows and initial tab based on fare brand:
  // - Top (precio más alto): Asientos Premium (Filas 1 a 3) y acceso completo
  // - Plus (precio normal/medio): Asientos de la MITAD del avión (Filas 4 a 12), Premium 1-3 bloqueados
  // - Light (básico/estándar): Asientos de ATRÁS del avión (Filas 13 a 24), Delantera y Media 1-12 bloqueadas
  useEffect(() => {
    if (isOpen) {
      setCurrentSeat(selectedSeat || '');
      setFareAlertMessage(null);

      if (fareBrandLower === 'top') {
        setActiveSectionFilter('PREMIUM');
      } else if (fareBrandLower === 'plus') {
        setActiveSectionFilter('FORWARD');
      } else if (fareBrandLower === 'light') {
        setActiveSectionFilter('STANDARD');
      } else {
        setActiveSectionFilter('ALL');
      }
    }
  }, [isOpen, selectedSeat, fareBrandLower]);

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
      fareBenefit: '⭐ Exclusivo para tarifa TOP (Precio más alto)',
      isHighlight: fareBrandLower === 'top',
      rows: allRows.filter(r => r.rowNumber >= 1 && r.rowNumber <= 3)
    },
    {
      id: 'FORWARD',
      name: 'Sección 2: Economy Delantera',
      rowsRange: 'Filas 4 a 10',
      badge: 'SALIDA RÁPIDA',
      badgeColor: '#0369a1',
      badgeBg: '#e0f2fe',
      tagline: 'Filas preferentes de la mitad delantera para un desembarque ágil',
      fareBenefit: 'Habilitado para tarifa PLUS y TOP',
      isHighlight: fareBrandLower === 'plus',
      rows: allRows.filter(r => r.rowNumber >= 4 && r.rowNumber <= 10)
    },
    {
      id: 'EXIT',
      name: 'Sección 3: Salidas de Emergencia',
      rowsRange: 'Filas 11 y 12',
      badge: 'MAYOR ESPACIO (ALAS)',
      badgeColor: '#b45309',
      badgeBg: '#fef3c7',
      tagline: '⚡ Espacio extra para estirar las piernas sobre las alas (Mitad)',
      fareBenefit: 'Asientos sobre el ala del Airbus A320 (PLUS y TOP)',
      hasWings: true,
      rows: allRows.filter(r => r.rowNumber >= 11 && r.rowNumber <= 12)
    },
    {
      id: 'STANDARD',
      name: 'Sección 4: Economy Estándar',
      rowsRange: 'Filas 13 a 24',
      badge: 'SECCIÓN TRASERA',
      badgeColor: '#475569',
      badgeBg: '#f1f5f9',
      tagline: 'Cabina espaciosa trasera • Incluida en tarifa básica LIGHT',
      fareBenefit: 'Habilitado para tarifas LIGHT, PLUS y TOP',
      isHighlight: fareBrandLower === 'light',
      rows: allRows.filter(r => r.rowNumber >= 13 && r.rowNumber <= 24)
    }
  ];

  const filteredSections = activeSectionFilter === 'ALL' 
    ? sections 
    : sections.filter(s => s.id === activeSectionFilter);

  // Check persistent locally blocked seats for confirmed bookings
  const getLocallyBlockedSeats = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('aerocache_blocked_seats') || '{}');
      const list = stored[flightInfo] || [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };
  const locallyBlocked = getLocallyBlockedSeats();

  // Class restriction logic based on selected fare:
  const isRowAllowedForFare = (rowNumber) => {
    if (fareBrandLower === 'top') {
      // Top (precio más alto): Libre acceso a todo el avión, enfocado en Premium
      return true;
    }
    if (fareBrandLower === 'plus') {
      // Plus (normal): Asientos de la mitad del avión (4-12) y estándar (13-24). Premium (1-3) bloqueado
      return rowNumber >= 4;
    }
    if (fareBrandLower === 'light') {
      // Light (básico/estándar): Solo sección trasera (13-24). Delantera y media (1-12) bloqueadas
      return rowNumber >= 13;
    }
    return true;
  };

  const getFareRestrictionReason = (rowNumber) => {
    if (rowNumber <= 3) {
      return `El asiento pertenece a la clase Premium (Filas 1-3). Es exclusivo para pasajeros con tarifa TOP (Precio más alto).`;
    }
    if (rowNumber <= 12) {
      return `El asiento está en la mitad delantera del avión (Filas 4-12). Tu tarifa actual es LIGHT básica; requiere tarifa PLUS o TOP.`;
    }
    return '';
  };

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
    
    let secName = 'Economy Estándar (Atrás)';
    if (row <= 3) secName = 'Premium Economy (Filas 1-3)';
    else if (row <= 10) secName = 'Economy Delantera (Filas 4-10)';
    else if (row <= 12) secName = 'Salida de Emergencia / Alas (Filas 11-12)';
    
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
        maxWidth: '740px',
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
              Tarifa seleccionada: <strong style={{ color: '#fff' }}>{fareBrandNorm.toUpperCase()}</strong> • 
              Asientos asignados según tu clase de tarifa
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Fare Class Notification Banner */}
        <div style={{
          padding: '10px 20px',
          backgroundColor: fareBrandLower === 'top' ? '#eff6ff' : (fareBrandLower === 'plus' ? '#f0fdf4' : '#f8fafc'),
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            {fareBrandLower === 'top' && (
              <>
                <span style={{ fontSize: '14px' }}>👑</span>
                <span style={{ color: '#1e40af', fontWeight: '600' }}>
                  <strong>Tarifa TOP (Precio más alto):</strong> Tienes acceso a los asientos <strong>PREMIUM (Filas 1 a 3)</strong> con mayor reclinación y espacio para piernas.
                </span>
              </>
            )}
            {fareBrandLower === 'plus' && (
              <>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <span style={{ color: '#166534', fontWeight: '600' }}>
                  <strong>Tarifa PLUS (Normal / Medio):</strong> Asientos habilitados en la <strong>MITAD del avión (Filas 4 a 12)</strong>. Filas 1-3 Premium reservadas para Top.
                </span>
              </>
            )}
            {fareBrandLower === 'light' && (
              <>
                <span style={{ fontSize: '14px' }}>💺</span>
                <span style={{ color: '#475569', fontWeight: '600' }}>
                  <strong>Tarifa LIGHT (Básica / Menor precio):</strong> Asientos habilitados en la <strong>sección de ATRÁS (Filas 13 a 24)</strong>. Filas 1-12 requieren Plus o Top.
                </span>
              </>
            )}
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: fareBrandLower === 'top' ? '#dbeafe' : (fareBrandLower === 'plus' ? '#dcfce7' : '#e2e8f0'),
            color: fareBrandLower === 'top' ? '#1d4ed8' : (fareBrandLower === 'plus' ? '#15803d' : '#334155'),
            whiteSpace: 'nowrap'
          }}>
            Tarifa {fareBrandNorm}
          </span>
        </div>

        {/* Dynamic Alert Banner when clicking a restricted seat */}
        {fareAlertMessage && (
          <div style={{
            padding: '10px 20px',
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={15} color="#b91c1c" />
              <span>{fareAlertMessage}</span>
            </div>
            <button 
              onClick={() => setFareAlertMessage(null)} 
              style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

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
            { id: 'PREMIUM', label: '👑 1. Premium (1-3)' },
            { id: 'FORWARD', label: '⚡ 2. Mitad Delantera (4-10)' },
            { id: 'EXIT', label: '🚪 3. Emergencia / Alas (11-12)' },
            { id: 'STANDARD', label: '💺 4. Atrás Estándar (13-24)' }
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
          padding: '8px 12px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11px',
          color: '#475569',
          flexWrap: 'wrap'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #cbd5e1', display: 'inline-block' }} /> 
            Disponible para tu tarifa
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-latam-coral)', display: 'inline-block' }} /> 
            Seleccionado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold' }}>✕</span> 
            Ocupado / Reservado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '9px' }}>🔒</span> 
            Bloqueado por tarifa
          </span>
        </div>

        {/* Airplane Fuselage Scroll Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
          
          <div style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
            
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
                  backgroundColor: section.isHighlight ? '#f0f9ff' : '#fff',
                  borderRadius: '16px',
                  border: section.isHighlight ? '2px solid #0284c7' : '1px solid #cbd5e1',
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
                      {section.tagline} • <span style={{ color: section.isHighlight ? '#0284c7' : '#64748b', fontWeight: section.isHighlight ? 'bold' : 'normal' }}>{section.fareBenefit}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                    {section.rowsRange}
                  </span>
                </div>

                {/* Rows inside this section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {section.rows.map(row => {
                    const isAllowedByFare = isRowAllowedForFare(row.rowNumber);
                    const restrictionReason = !isAllowedByFare ? getFareRestrictionReason(row.rowNumber) : '';

                    return (
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
                          const isBooked = !seat.isAvailable || locallyBlocked.includes(seat.seatNumber);

                          // Click handler
                          const handleSeatClick = () => {
                            if (isBooked) return;
                            if (!isAllowedByFare) {
                              setFareAlertMessage(restrictionReason);
                              return;
                            }
                            setFareAlertMessage(null);
                            setCurrentSeat(seat.seatNumber);
                          };

                          return (
                            <button
                              key={seat.seatNumber}
                              type="button"
                              disabled={isBooked}
                              onClick={handleSeatClick}
                              title={
                                isBooked
                                  ? `Asiento ${seat.seatNumber} (Ocupado / Reservado)`
                                  : (!isAllowedByFare
                                      ? `Asiento ${seat.seatNumber} (Bloqueado: ${restrictionReason})`
                                      : `Asiento ${seat.seatNumber} (${col === 'A' ? 'Ventana' : col === 'C' ? 'Pasillo' : 'Centro'})`)
                              }
                              style={{
                                height: '36px',
                                borderRadius: '7px',
                                backgroundColor: isSel 
                                  ? 'var(--color-latam-coral)' 
                                  : (isBooked 
                                      ? '#94a3b8' 
                                      : (!isAllowedByFare ? '#f1f5f9' : '#fff')),
                                color: isSel 
                                  ? '#fff' 
                                  : (isBooked 
                                      ? '#f1f5f9' 
                                      : (!isAllowedByFare ? '#94a3b8' : '#1e293b')),
                                border: isSel 
                                  ? '2px solid #b91c1c' 
                                  : (isBooked 
                                      ? '1px solid #64748b' 
                                      : (!isAllowedByFare 
                                          ? '1px dashed #cbd5e1' 
                                          : (isExtra ? '2px solid #0284c7' : '1px solid #cbd5e1'))),
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: isBooked ? 'not-allowed' : (!isAllowedByFare ? 'not-allowed' : 'pointer'),
                                opacity: !isAllowedByFare && !isBooked ? 0.75 : 1,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isSel ? '0 2px 8px rgba(232, 17, 75, 0.4)' : (!isBooked && isAllowedByFare ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'),
                                transition: 'all 0.15s'
                              }}
                            >
                              {isBooked ? '✕' : (!isAllowedByFare ? '🔒' : seat.seatNumber)}
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
                          const isBooked = !seat.isAvailable || locallyBlocked.includes(seat.seatNumber);

                          // Click handler
                          const handleSeatClick = () => {
                            if (isBooked) return;
                            if (!isAllowedByFare) {
                              setFareAlertMessage(restrictionReason);
                              return;
                            }
                            setFareAlertMessage(null);
                            setCurrentSeat(seat.seatNumber);
                          };

                          return (
                            <button
                              key={seat.seatNumber}
                              type="button"
                              disabled={isBooked}
                              onClick={handleSeatClick}
                              title={
                                isBooked
                                  ? `Asiento ${seat.seatNumber} (Ocupado / Reservado)`
                                  : (!isAllowedByFare
                                      ? `Asiento ${seat.seatNumber} (Bloqueado: ${restrictionReason})`
                                      : `Asiento ${seat.seatNumber} (${col === 'F' ? 'Ventana' : col === 'D' ? 'Pasillo' : 'Centro'})`)
                              }
                              style={{
                                height: '36px',
                                borderRadius: '7px',
                                backgroundColor: isSel 
                                  ? 'var(--color-latam-coral)' 
                                  : (isBooked 
                                      ? '#94a3b8' 
                                      : (!isAllowedByFare ? '#f1f5f9' : '#fff')),
                                color: isSel 
                                  ? '#fff' 
                                  : (isBooked 
                                      ? '#f1f5f9' 
                                      : (!isAllowedByFare ? '#94a3b8' : '#1e293b')),
                                border: isSel 
                                  ? '2px solid #b91c1c' 
                                  : (isBooked 
                                      ? '1px solid #64748b' 
                                      : (!isAllowedByFare 
                                          ? '1px dashed #cbd5e1' 
                                          : (isExtra ? '2px solid #0284c7' : '1px solid #cbd5e1'))),
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: isBooked ? 'not-allowed' : (!isAllowedByFare ? 'not-allowed' : 'pointer'),
                                opacity: !isAllowedByFare && !isBooked ? 0.75 : 1,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isSel ? '0 2px 8px rgba(232, 17, 75, 0.4)' : (!isBooked && isAllowedByFare ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'),
                                transition: 'all 0.15s'
                              }}
                            >
                              {isBooked ? '✕' : (!isAllowedByFare ? '🔒' : seat.seatNumber)}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
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
              ▼ COLA DEL AVIÓN (SECCIÓN TRASERA)
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
            <div style={{ fontSize: '12px', color: '#64748b' }}>Asiento Seleccionado ({fareBrandNorm}):</div>
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
                  * Haz clic en un asiento disponible para tu tarifa
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
