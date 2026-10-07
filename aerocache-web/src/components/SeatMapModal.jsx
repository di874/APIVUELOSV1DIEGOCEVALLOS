import React, { useState, useEffect } from 'react';
import { X, Check, Plane, Zap, ShieldCheck, Sparkles, Info, Lock, AlertCircle, Users, User, Baby } from 'lucide-react';

export default function SeatMapModal({ 
  isOpen, 
  onClose, 
  seatMapData, 
  onSelectSeat, 
  onSelectSeats,
  selectedSeat, 
  selectedSeatsMap,
  passengerList,
  flightInfo, 
  isBookingFlow,
  selectedFareBrand,
  // Round trip support
  isRoundTrip = false,
  outboundInfo = null,
  returnInfo = null,
  onSelectRoundTripSeats = null,
  selectedOutboundSeatsMap = null,
  selectedReturnSeatsMap = null
}) {
  const effectivePaxList = Array.isArray(passengerList) && passengerList.length > 0 
    ? passengerList 
    : [{ id: 'pax-1', index: 1, type: 'ADULT', label: 'Pasajero 1 (Adulto)' }];

  const [activeFlightLeg, setActiveFlightLeg] = useState('outbound'); // 'outbound' | 'return'
  const [assignedSeatsOutbound, setAssignedSeatsOutbound] = useState({});
  const [assignedSeatsReturn, setAssignedSeatsReturn] = useState({});
  const [internalAssignedSeats, setInternalAssignedSeats] = useState({});

  const [activePaxId, setActivePaxId] = useState(effectivePaxList[0]?.id || 'pax-1');
  const [activeSectionFilter, setActiveSectionFilter] = useState('ALL');
  const [fareAlertMessage, setFareAlertMessage] = useState(null);

  // Active leg dynamic data
  const currentSeatMapData = isRoundTrip
    ? (activeFlightLeg === 'outbound' ? (outboundInfo?.seatMapData || seatMapData) : (returnInfo?.seatMapData || seatMapData))
    : seatMapData;

  const currentFlightInfo = isRoundTrip
    ? (activeFlightLeg === 'outbound' ? (outboundInfo?.flightNumber || 'AC-Ida') : (returnInfo?.flightNumber || 'AC-Vuelta'))
    : flightInfo;

  const currentFareBrand = isRoundTrip
    ? (activeFlightLeg === 'outbound' ? (outboundInfo?.fareBrand || 'Top') : (returnInfo?.fareBrand || 'Top'))
    : (selectedFareBrand || 'Top');

  const fareBrandNorm = (currentFareBrand || 'Top').trim();
  const fareBrandLower = fareBrandNorm.toLowerCase(); // 'top' | 'plus' | 'light'

  const assignedSeats = isRoundTrip
    ? (activeFlightLeg === 'outbound' ? assignedSeatsOutbound : assignedSeatsReturn)
    : internalAssignedSeats;

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFareAlertMessage(null);

      if (isRoundTrip) {
        setActiveFlightLeg('outbound');
        const initialOut = (selectedOutboundSeatsMap && Object.keys(selectedOutboundSeatsMap).length > 0)
          ? { ...selectedOutboundSeatsMap }
          : {};
        const initialRet = (selectedReturnSeatsMap && Object.keys(selectedReturnSeatsMap).length > 0)
          ? { ...selectedReturnSeatsMap }
          : {};
        setAssignedSeatsOutbound(initialOut);
        setAssignedSeatsReturn(initialRet);
        const firstUnassigned = effectivePaxList.find(p => !initialOut[p.id]);
        setActivePaxId(firstUnassigned ? firstUnassigned.id : (effectivePaxList[0]?.id || 'pax-1'));
      } else {
        let initialMap = {};
        if (selectedSeatsMap && typeof selectedSeatsMap === 'object' && Object.keys(selectedSeatsMap).length > 0) {
          initialMap = { ...selectedSeatsMap };
        } else if (selectedSeat && effectivePaxList[0]) {
          initialMap[effectivePaxList[0].id] = selectedSeat;
        }
        setInternalAssignedSeats(initialMap);
        const firstUnassigned = effectivePaxList.find(p => !initialMap[p.id]);
        setActivePaxId(firstUnassigned ? firstUnassigned.id : (effectivePaxList[0]?.id || 'pax-1'));
      }
    }
  }, [isOpen, selectedSeat, selectedSeatsMap, selectedOutboundSeatsMap, selectedReturnSeatsMap, isRoundTrip]);

  // Adjust default section filter when leg or fare changes
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, activeFlightLeg, fareBrandLower]);

  if (!isOpen || !currentSeatMapData) return null;

  // Active passenger details
  const activePax = effectivePaxList.find(p => p.id === activePaxId) || effectivePaxList[0];
  const totalAssignedCount = effectivePaxList.filter(p => !!assignedSeats[p.id]).length;
  const isAllAssigned = totalAssignedCount === effectivePaxList.length;

  // Flatten all rows from cabins
  const allRows = currentSeatMapData?.cabins?.flatMap(c => c.rows) || [];

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
      tagline: '⚡ Espacio extra para piernas sobre las alas (Mitad)',
      fareBenefit: 'Asientos sobre el ala (PLUS y TOP) • No apto para niños',
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
      const list = stored[currentFlightInfo] || [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  };
  const locallyBlocked = getLocallyBlockedSeats();

  // Class restriction logic based on selected fare:
  const isRowAllowedForFare = (rowNumber) => {
    if (fareBrandLower === 'top') {
      return true;
    }
    if (fareBrandLower === 'plus') {
      return rowNumber >= 4;
    }
    if (fareBrandLower === 'light') {
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

  const handleSeatClick = (seatNumber, rowNumber) => {
    // 1. Check if booked
    if (locallyBlocked.includes(seatNumber)) {
      return;
    }

    // 2. Check Fare class restriction
    if (!isRowAllowedForFare(rowNumber)) {
      setFareAlertMessage(getFareRestrictionReason(rowNumber));
      return;
    }

    // 3. Child safety regulation check: Children cannot sit in exit rows (11, 12)
    if (activePax?.type === 'CHILD' && (rowNumber === 11 || rowNumber === 12)) {
      setFareAlertMessage('⚠️ Por regulaciones aeronáuticas de seguridad internacional, los niños (2-11 años) no pueden viajar en filas de emergencia (filas 11 y 12). Selecciona otra fila.');
      return;
    }

    // 4. Update assigned seats
    const newAssigned = { ...assignedSeats };

    // If another passenger in this group already had this seat, clear it
    const otherPaxWithSeat = effectivePaxList.find(p => p.id !== activePax.id && newAssigned[p.id] === seatNumber);
    if (otherPaxWithSeat) {
      delete newAssigned[otherPaxWithSeat.id];
    }

    newAssigned[activePax.id] = seatNumber;
    if (isRoundTrip) {
      if (activeFlightLeg === 'outbound') {
        setAssignedSeatsOutbound(newAssigned);
      } else {
        setAssignedSeatsReturn(newAssigned);
      }
    } else {
      setInternalAssignedSeats(newAssigned);
    }
    setFareAlertMessage(null);

    // Auto-advance to next unassigned passenger if any
    const nextUnassigned = effectivePaxList.find(p => p.id !== activePax.id && !newAssigned[p.id]);
    if (nextUnassigned) {
      setActivePaxId(nextUnassigned.id);
    }
  };

  const handleConfirm = () => {
    if (isRoundTrip) {
      if (activeFlightLeg === 'outbound') {
        if (outboundAssignedCount === effectivePaxList.length) {
          setActiveFlightLeg('return');
          setFareAlertMessage(null);
          const firstUnassigned = effectivePaxList.find(p => !assignedSeatsReturn[p.id]);
          setActivePaxId(firstUnassigned ? firstUnassigned.id : (effectivePaxList[0]?.id || 'pax-1'));
        }
        return;
      }
      if (outboundAssignedCount === effectivePaxList.length && returnAssignedCount === effectivePaxList.length) {
        if (onSelectRoundTripSeats) {
          onSelectRoundTripSeats({
            outboundSeatsMap: assignedSeatsOutbound,
            returnSeatsMap: assignedSeatsReturn
          });
        }
        onClose();
        return;
      }
    } else {
      if (!isAllAssigned) return;

      if (onSelectSeats) {
        onSelectSeats(assignedSeats, effectivePaxList);
      }
      if (onSelectSeat && effectivePaxList[0]) {
        onSelectSeat(assignedSeats[effectivePaxList[0].id]);
      }
      onClose();
    }
  };

  const getSeatDescription = (seatNum) => {
    if (!seatNum) return '';
    const match = seatNum.match(/^(\d+)([A-F])$/);
    if (!match) return `Asiento ${seatNum}`;
    const row = parseInt(match[1]);
    const col = match[2];
    const isWindow = col === 'A' || col === 'F';
    const isAisle = col === 'C' || col === 'D';
    const loc = isWindow ? 'Ventana' : (isAisle ? 'Pasillo' : 'Centro');
    return `${seatNum} (${loc}, Fila ${row})`;
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
        maxWidth: '780px',
        maxHeight: '94vh',
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
                {isRoundTrip 
                  ? `SELECCIÓN DE ASIENTOS: ${activeFlightLeg === 'outbound' ? '1. VUELO DE IDA' : '2. VUELO DE VUELTA'}`
                  : (isBookingFlow ? 'PASO 1 DE 2: ELECCIÓN DE ASIENTOS' : 'MAPA DE ASIENTOS')}
              </span>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>Airbus A320 • Flota AEROCACHE</div>
            </div>
            <div style={{ fontSize: '12px', color: '#9bb1c9', marginTop: '4px' }}>
              {isRoundTrip 
                ? (activeFlightLeg === 'outbound'
                    ? `Vuelo de Ida: ${outboundInfo?.flightNumber || currentFlightInfo} (${outboundInfo?.route || 'Ida'}) • Tarifa ${fareBrandNorm.toUpperCase()}`
                    : `Vuelo de Vuelta: ${returnInfo?.flightNumber || currentFlightInfo} (${returnInfo?.route || 'Vuelta'}) • Tarifa ${fareBrandNorm.toUpperCase()}`)
                : (currentFlightInfo ? `Vuelo ${currentFlightInfo} • Tarifa ${fareBrandNorm.toUpperCase()} • ` : '')}
              • {effectivePaxList.length} {effectivePaxList.length === 1 ? 'Pasajero' : 'Pasajeros'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Round Trip Flight Leg Switcher */}
        {isRoundTrip && (
          <div style={{
            backgroundColor: '#071d33',
            padding: '10px 20px',
            borderBottom: '2px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={() => {
                setActiveFlightLeg('outbound');
                setFareAlertMessage(null);
                const firstUnassigned = effectivePaxList.find(p => !assignedSeatsOutbound[p.id]);
                setActivePaxId(firstUnassigned ? firstUnassigned.id : (effectivePaxList[0]?.id || 'pax-1'));
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: activeFlightLeg === 'outbound' ? '2px solid var(--color-latam-coral)' : '1px solid rgba(255,255,255,0.2)',
                backgroundColor: activeFlightLeg === 'outbound' ? 'rgba(232, 17, 75, 0.22)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plane size={16} color="var(--color-latam-coral)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800' }}>
                    1. Asientos Vuelo de Ida
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    {outboundInfo?.route || 'Ida'} ({outboundInfo?.flightNumber})
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: outboundAssignedCount === effectivePaxList.length ? '#059669' : '#b45309',
                color: '#fff'
              }}>
                {outboundAssignedCount === effectivePaxList.length ? '✓ Elegidos' : `${outboundAssignedCount}/${effectivePaxList.length}`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFlightLeg('return');
                setFareAlertMessage(null);
                const firstUnassigned = effectivePaxList.find(p => !assignedSeatsReturn[p.id]);
                setActivePaxId(firstUnassigned ? firstUnassigned.id : (effectivePaxList[0]?.id || 'pax-1'));
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: activeFlightLeg === 'return' ? '2px solid var(--color-latam-coral)' : '1px solid rgba(255,255,255,0.2)',
                backgroundColor: activeFlightLeg === 'return' ? 'rgba(232, 17, 75, 0.22)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plane size={16} color="#38bdf8" style={{ transform: 'rotate(180deg)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800' }}>
                    2. Asientos Vuelo de Vuelta
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    {returnInfo?.route || 'Vuelta'} ({returnInfo?.flightNumber})
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: returnAssignedCount === effectivePaxList.length ? '#059669' : '#b45309',
                color: '#fff'
              }}>
                {returnAssignedCount === effectivePaxList.length ? '✓ Elegidos' : `${returnAssignedCount}/${effectivePaxList.length}`}
              </span>
            </button>
          </div>
        )}

        {/* Passenger Selection Toolbar (Multi-Passenger Support) */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#0a2540',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="var(--color-latam-coral)" />
              SELECCIÓN DE ASIENTO POR PASAJERO ({totalAssignedCount} de {effectivePaxList.length} asignados):
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Haz clic en cada pasajero para elegir su ubicación
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {effectivePaxList.map(pax => {
              const isCurrent = pax.id === activePaxId;
              const seat = assignedSeats[pax.id];
              const isChild = pax.type === 'CHILD';

              return (
                <button
                  key={pax.id}
                  type="button"
                  onClick={() => {
                    setActivePaxId(pax.id);
                    setFareAlertMessage(null);
                  }}
                  style={{
                    flex: '1 0 auto',
                    minWidth: '170px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: isCurrent ? '2px solid var(--color-latam-coral)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isCurrent ? 'rgba(232, 17, 75, 0.15)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: isCurrent ? '0 0 12px rgba(232, 17, 75, 0.4)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? 'var(--color-latam-coral)' : (seat ? '#059669' : '#475569'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {isChild ? '🧒' : '👤'}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: isCurrent ? '#fff' : '#e2e8f0' }}>
                        P{pax.index}: {isChild ? 'Niño' : 'Adulto'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {isChild ? '2-11 años' : '+12 años'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: seat ? '#059669' : (isCurrent ? 'var(--color-latam-coral)' : '#334155'),
                    color: '#fff',
                    letterSpacing: '0.5px'
                  }}>
                    {seat ? `✓ ${seat}` : (isCurrent ? 'Elegir' : 'Pendiente')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Pax Focus Banner */}
          <div style={{
            marginTop: '8px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: activePax?.type === 'CHILD' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 132, 199, 0.2)',
            border: activePax?.type === 'CHILD' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(2, 132, 199, 0.4)',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>
              🎯 <strong>Asignando para:</strong> Pasajero {activePax?.index} ({activePax?.type === 'CHILD' ? 'Niño' : 'Adulto'})
              {assignedSeats[activePax?.id] && <> • Asiento actual: <strong>{assignedSeats[activePax.id]}</strong></>}
            </span>
            {activePax?.type === 'CHILD' && (
              <span style={{ color: '#fef08a', fontWeight: 'bold' }}>
                * Restricción: No permitido en salidas de emergencia (Filas 11 y 12)
              </span>
            )}
          </div>
        </div>

        {/* Fare Class Notification Banner */}
        <div style={{
          padding: '8px 20px',
          backgroundColor: fareBrandLower === 'top' ? '#eff6ff' : (fareBrandLower === 'plus' ? '#f0fdf4' : '#f8fafc'),
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
            {fareBrandLower === 'top' && (
              <>
                <span style={{ fontSize: '13px' }}>👑</span>
                <span style={{ color: '#1e40af', fontWeight: '600' }}>
                  <strong>Tarifa TOP (Precio más alto):</strong> Tienes acceso a los asientos <strong>PREMIUM (Filas 1 a 3)</strong> con mayor reclinación y espacio para piernas.
                </span>
              </>
            )}
            {fareBrandLower === 'plus' && (
              <>
                <span style={{ fontSize: '13px' }}>⚡</span>
                <span style={{ color: '#166534', fontWeight: '600' }}>
                  <strong>Tarifa PLUS (Normal / Medio):</strong> Asientos habilitados en la <strong>MITAD del avión (Filas 4 a 12)</strong>. Filas 1-3 Premium reservadas para Top.
                </span>
              </>
            )}
            {fareBrandLower === 'light' && (
              <>
                <span style={{ fontSize: '13px' }}>💺</span>
                <span style={{ color: '#475569', fontWeight: '600' }}>
                  <strong>Tarifa LIGHT (Básica / Menor precio):</strong> Asientos habilitados en la <strong>sección de ATRÁS (Filas 13 a 24)</strong>. Filas 1-12 requieren Plus o Top.
                </span>
              </>
            )}
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 8px',
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
          padding: '8px 18px',
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
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
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
          gap: '14px',
          padding: '6px 12px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '10px',
          color: '#475569',
          flexWrap: 'wrap'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fff', border: '1px solid #cbd5e1', display: 'inline-block' }} /> 
            Disponible
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--color-latam-coral)', display: 'inline-block' }} /> 
            Pasajero Actual
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#001935', display: 'inline-block' }} /> 
            Otro Pasajero
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px', fontWeight: 'bold' }}>✕</span> 
            Ocupado / Reservado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '8px' }}>🔒</span> 
            Bloqueado por tarifa
          </span>
        </div>

        {/* Airplane Fuselage Scroll Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
          
          <div style={{ width: '100%', maxWidth: '460px', position: 'relative' }}>
            
            {/* Cockpit Indicator */}
            <div style={{
              width: '180px',
              margin: '0 auto 14px auto',
              backgroundColor: 'var(--color-latam-navy)',
              color: '#fff',
              textAlign: 'center',
              padding: '6px 16px',
              borderRadius: '24px 24px 8px 8px',
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              boxShadow: '0 4px 10px rgba(0,25,53,0.15)'
            }}>
              ▲ CABINA DE PILOTOS
            </div>

            {/* Front Galley & Doors */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', borderBottom: '1px dashed #cbd5e1', marginBottom: '12px' }}>
              <span>🚪 Puerta 1L • 🚻 Baño</span>
              <span>☕ Galley • 🚪 Puerta 1R</span>
            </div>

            {/* Column Labels */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr) 30px repeat(3, 1fr)',
              textAlign: 'center',
              fontWeight: '800',
              fontSize: '11px',
              color: 'var(--color-latam-navy)',
              marginBottom: '8px',
              padding: '0 12px'
            }}>
              <span>A</span><span>B</span><span>C</span>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>FILA</span>
              <span>D</span><span>E</span><span>F</span>
            </div>

            {/* SECTIONS RENDERING */}
            {filteredSections.map((section) => (
              <div 
                key={section.id} 
                style={{
                  backgroundColor: section.isHighlight ? '#f0f9ff' : '#fff',
                  borderRadius: '14px',
                  border: section.isHighlight ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  padding: '14px 12px',
                  marginBottom: '16px',
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
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: '#b45309',
                      transform: 'rotate(-90deg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Plane size={12} /> ALA IZQ
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '-28px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: '#b45309',
                      transform: 'rotate(90deg)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Plane size={12} /> ALA DER
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
                  paddingBottom: '6px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: '800',
                        color: section.badgeColor,
                        backgroundColor: section.badgeBg,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {section.badge}
                      </span>
                      <strong style={{ fontSize: '12px', color: 'var(--color-latam-navy)' }}>
                        {section.name}
                      </strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                      {section.tagline} • <span style={{ color: section.isHighlight ? '#0284c7' : '#64748b', fontWeight: section.isHighlight ? 'bold' : 'normal' }}>{section.fareBenefit}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {section.rowsRange}
                  </span>
                </div>

                {/* Rows inside this section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                  {section.rows.map(row => {
                    const isAllowedByFare = isRowAllowedForFare(row.rowNumber);
                    const isExitRow = row.rowNumber === 11 || row.rowNumber === 12;
                    const isChildRestrictedOnExit = activePax?.type === 'CHILD' && isExitRow;

                    const renderSeatButton = (col) => {
                      const seat = row.seats?.find(s => s.seatNumber === `${row.rowNumber}${col}`);
                      if (!seat) return <div key={col} />;
                      
                      const seatNumber = seat.seatNumber;
                      const isBooked = !seat.isAvailable || locallyBlocked.includes(seatNumber);
                      const isExtra = seat.characteristics?.includes('EXTRA_LEGROOM');

                      // Check which passenger in our party has this seat:
                      const assignedPassenger = effectivePaxList.find(p => assignedSeats[p.id] === seatNumber);
                      const isCurrentPaxSeat = assignedPassenger?.id === activePax?.id;
                      const isOtherPaxSeat = assignedPassenger && !isCurrentPaxSeat;

                      // Button visual attributes
                      let bg = '#fff';
                      let color = '#1e293b';
                      let border = isExtra ? '2px solid #0284c7' : '1px solid #cbd5e1';
                      let cursor = 'pointer';
                      let content = seatNumber;

                      if (isBooked) {
                        bg = '#94a3b8';
                        color = '#fff';
                        border = '1px solid #64748b';
                        cursor = 'not-allowed';
                        content = '✕';
                      } else if (isCurrentPaxSeat) {
                        bg = 'var(--color-latam-coral)';
                        color = '#fff';
                        border = '2px solid #b91c1c';
                        content = effectivePaxList.length > 1 ? `P${assignedPassenger.index}` : seatNumber;
                      } else if (isOtherPaxSeat) {
                        bg = '#001935';
                        color = '#fff';
                        border = '2px solid #0a2540';
                        content = `P${assignedPassenger.index}`;
                      } else if (!isAllowedByFare) {
                        bg = '#f1f5f9';
                        color = '#94a3b8';
                        border = '1px dashed #cbd5e1';
                        cursor = 'not-allowed';
                        content = '🔒';
                      } else if (isChildRestrictedOnExit) {
                        bg = '#fef3c7';
                        color = '#b45309';
                        border = '1px dashed #f59e0b';
                        content = '⚠️';
                      }

                      return (
                        <button
                          key={seatNumber}
                          type="button"
                          disabled={isBooked}
                          onClick={() => handleSeatClick(seatNumber, row.rowNumber)}
                          title={
                            isBooked
                              ? `Asiento ${seatNumber} (Ocupado / Reservado)`
                              : (isCurrentPaxSeat
                                  ? `Asiento ${seatNumber} (Asignado a Pasajero ${assignedPassenger.index})`
                                  : (isOtherPaxSeat
                                      ? `Asiento ${seatNumber} (Asignado a Pasajero ${assignedPassenger.index}) - Haz clic para reasignar`
                                      : (!isAllowedByFare
                                          ? `Asiento ${seatNumber} (Bloqueado por tarifa ${fareBrandNorm})`
                                          : (isChildRestrictedOnExit
                                              ? `Asiento ${seatNumber} (Bloqueado para niños en fila de emergencia)`
                                              : `Asiento ${seatNumber} (${col === 'A' || col === 'F' ? 'Ventana' : col === 'C' || col === 'D' ? 'Pasillo' : 'Centro'})`))))
                          }
                          style={{
                            height: '35px',
                            borderRadius: '7px',
                            backgroundColor: bg,
                            color: color,
                            border: border,
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: cursor,
                            opacity: (!isAllowedByFare || isChildRestrictedOnExit) && !isBooked ? 0.75 : 1,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: (isCurrentPaxSeat || isOtherPaxSeat) ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          {content}
                        </button>
                      );
                    };

                    return (
                      <div
                        key={row.rowNumber}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr) 30px repeat(3, 1fr)',
                          gap: '5px',
                          alignItems: 'center'
                        }}
                      >
                        {/* Left Seats: A, B, C */}
                        {['A', 'B', 'C'].map(col => renderSeatButton(col))}

                        {/* Aisle Number */}
                        <span style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 'bold' }}>
                          {row.rowNumber}
                        </span>

                        {/* Right Seats: D, E, F */}
                        {['D', 'E', 'F'].map(col => renderSeatButton(col))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Rear Service Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', borderTop: '1px dashed #cbd5e1', marginTop: '12px' }}>
              <span>🚪 Puerta 2L • 🚻 Baño</span>
              <span>☕ Aft Galley • 🚪 Puerta 2R</span>
            </div>

            <div style={{
              width: '160px',
              margin: '10px auto 0 auto',
              backgroundColor: '#cbd5e1',
              color: '#334155',
              textAlign: 'center',
              padding: '5px 14px',
              borderRadius: '8px 8px 18px 18px',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '1px'
            }}>
              ▼ COLA DEL AVIÓN (SECCIÓN TRASERA)
            </div>
          </div>
        </div>

        {/* Footer with Summary and Action */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
              {isRoundTrip
                ? `Asientos Asignados (Ida: ${outboundAssignedCount}/${effectivePaxList.length} • Vuelta: ${returnAssignedCount}/${effectivePaxList.length}):`
                : `Asientos Asignados (${totalAssignedCount}/${effectivePaxList.length}):`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              {effectivePaxList.map(pax => {
                if (isRoundTrip) {
                  const outSeat = assignedSeatsOutbound[pax.id];
                  const retSeat = assignedSeatsReturn[pax.id];
                  return (
                    <span
                      key={pax.id}
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: (outSeat && retSeat) ? '#065f46' : '#991b1b',
                        backgroundColor: (outSeat && retSeat) ? '#d1fae5' : '#fee2e2',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: (outSeat && retSeat) ? '1px solid #a7f3d0' : '1px solid #fecaca'
                      }}
                    >
                      P{pax.index}: Ida [{outSeat || '?'}] | Vta [{retSeat || '?'}]
                    </span>
                  );
                }
                const seat = assignedSeats[pax.id];
                return (
                  <span
                    key={pax.id}
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: seat ? '#065f46' : '#991b1b',
                      backgroundColor: seat ? '#d1fae5' : '#fee2e2',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: seat ? '1px solid #a7f3d0' : '1px solid #fecaca'
                    }}
                  >
                    P{pax.index} ({pax.type === 'CHILD' ? 'Niño' : 'Adulto'}): {seat ? seat : 'Sin asignar'}
                  </span>
                );
              })}
            </div>
          </div>

          {isRoundTrip ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeFlightLeg === 'return' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveFlightLeg('outbound');
                    setFareAlertMessage(null);
                    const firstUnassigned = effectivePaxList.find(p => !assignedSeatsOutbound[p.id]);
                    setActivePaxId(firstUnassigned ? firstUnassigned.id : (effectivePaxList[0]?.id || 'pax-1'));
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#334155',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  ⬅ Asientos de Ida
                </button>
              )}

              <button
                type="button"
                disabled={activeFlightLeg === 'outbound' 
                  ? outboundAssignedCount < effectivePaxList.length 
                  : (returnAssignedCount < effectivePaxList.length || outboundAssignedCount < effectivePaxList.length)}
                onClick={handleConfirm}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  backgroundColor: (activeFlightLeg === 'outbound' ? outboundAssignedCount === effectivePaxList.length : (returnAssignedCount === effectivePaxList.length && outboundAssignedCount === effectivePaxList.length))
                    ? 'var(--color-latam-coral)' 
                    : '#94a3b8',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: (activeFlightLeg === 'outbound' ? outboundAssignedCount === effectivePaxList.length : (returnAssignedCount === effectivePaxList.length && outboundAssignedCount === effectivePaxList.length)) ? 'pointer' : 'not-allowed',
                  opacity: (activeFlightLeg === 'outbound' ? outboundAssignedCount === effectivePaxList.length : (returnAssignedCount === effectivePaxList.length && outboundAssignedCount === effectivePaxList.length)) ? 1 : 0.6,
                  border: 'none',
                  boxShadow: (activeFlightLeg === 'outbound' ? outboundAssignedCount === effectivePaxList.length : (returnAssignedCount === effectivePaxList.length && outboundAssignedCount === effectivePaxList.length)) ? '0 4px 12px rgba(232, 17, 75, 0.3)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {activeFlightLeg === 'outbound'
                  ? (outboundAssignedCount === effectivePaxList.length ? 'Continuar a Asientos de Vuelta ➔' : `Faltan ${effectivePaxList.length - outboundAssignedCount} asiento(s) de Ida`)
                  : (returnAssignedCount === effectivePaxList.length && outboundAssignedCount === effectivePaxList.length ? '✓ Confirmar Asientos (Ida y Vuelta) y Continuar al Pago ➔' : `Faltan ${effectivePaxList.length - returnAssignedCount} asiento(s) de Vuelta`)}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isAllAssigned}
              onClick={handleConfirm}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: isAllAssigned ? 'var(--color-latam-coral)' : '#94a3b8',
                color: '#fff',
                fontWeight: '800',
                fontSize: '13px',
                cursor: isAllAssigned ? 'pointer' : 'not-allowed',
                opacity: isAllAssigned ? 1 : 0.6,
                border: 'none',
                boxShadow: isAllAssigned ? '0 4px 12px rgba(232, 17, 75, 0.3)' : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isAllAssigned 
                ? `Confirmar Asientos (${effectivePaxList.map(p => assignedSeats[p.id]).join(', ')}) y Continuar ➔` 
                : `Falta asignar ${effectivePaxList.length - totalAssignedCount} asiento(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
