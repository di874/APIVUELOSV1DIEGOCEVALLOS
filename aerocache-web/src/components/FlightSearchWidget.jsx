import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, Calendar, Users, Search, MapPin, ChevronDown, Plus, Minus, UserCheck } from 'lucide-react';

const CITIES = [
  { code: 'UIO', name: 'Quito', airport: 'Mariscal Sucre (UIO)' },
  { code: 'GYE', name: 'Guayaquil', airport: 'José Joaquín de Olmedo (GYE)' },
  { code: 'CUE', name: 'Cuenca', airport: 'Mariscal La Mar (CUE)' }
];

export default function FlightSearchWidget({ onSearch, loading }) {
  const [origin, setOrigin] = useState('UIO');
  const [destination, setDestination] = useState('GYE');
  const [departureDate, setDepartureDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [showPaxDropdown, setShowPaxDropdown] = useState(false);
  const [tripType, setTripType] = useState('oneway');
  const paxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (paxRef.current && !paxRef.current.contains(e.target)) {
        setShowPaxDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const totalPassengers = adults + children;

  const getPassengersLabel = () => {
    if (totalPassengers === 1) return '1 Adulto';
    let parts = [];
    if (adults > 0) parts.push(`${adults} ${adults === 1 ? 'Adulto' : 'Adultos'}`);
    if (children > 0) parts.push(`${children} ${children === 1 ? 'Niño' : 'Niños'}`);
    return `${totalPassengers} Pasajeros (${parts.join(', ')})`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin === destination) {
      alert('El origen y el destino no pueden ser iguales.');
      return;
    }

    const passengerList = [];
    for (let i = 1; i <= adults; i++) {
      passengerList.push({ id: `pax-adult-${i}`, index: passengerList.length + 1, type: 'ADULT', label: `Pasajero ${passengerList.length + 1} (Adulto)` });
    }
    for (let i = 1; i <= children; i++) {
      passengerList.push({ id: `pax-child-${i}`, index: passengerList.length + 1, type: 'CHILD', label: `Pasajero ${passengerList.length + 1} (Niño)` });
    }

    onSearch({ 
      origin, 
      destination, 
      departureDate, 
      passengers: { adults, youths: 0, children, infants: 0 },
      passengerList,
      totalPassengers
    });
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      padding: '24px 32px',
      boxShadow: '0 12px 35px rgba(0, 25, 53, 0.12)',
      border: '1px solid #e1e8f0',
      maxWidth: '1140px',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Trip Type Selector */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#1b2734', cursor: 'pointer' }}>
          <input
            type="radio"
            name="trip"
            checked={tripType === 'oneway'}
            onChange={() => setTripType('oneway')}
            style={{ accentColor: 'var(--color-latam-coral)' }}
          />
          Solo Ida
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#1b2734', cursor: 'pointer' }}>
          <input
            type="radio"
            name="trip"
            checked={tripType === 'roundtrip'}
            onChange={() => setTripType('roundtrip')}
            style={{ accentColor: 'var(--color-latam-coral)' }}
          />
          Ida y Vuelta
        </label>
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--color-latam-coral)', fontWeight: 'bold' }}>
          ✓ Tarifas exclusivas Ecuador con hasta 15% de descuento
        </span>
      </div>

      {/* Main Search Inputs Grid */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 48px 1.2fr 1.1fr 1.5fr auto', gap: '12px', alignItems: 'center' }}>
        
        {/* Origin */}
        <div style={{ border: '1px solid var(--color-latam-border)', borderRadius: '10px', padding: '10px 14px', background: '#fafbfc' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-latam-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>
            Origen
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--color-latam-coral)" />
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: '700', color: '#001935', outline: 'none' }}
            >
              {CITIES.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={handleSwap}
          title="Intercambiar origen y destino"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-latam-blue-light)',
            color: 'var(--color-latam-coral)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <ArrowLeftRight size={18} />
        </button>

        {/* Destination */}
        <div style={{ border: '1px solid var(--color-latam-border)', borderRadius: '10px', padding: '10px 14px', background: '#fafbfc' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-latam-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>
            Destino
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--color-latam-coral)" />
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: '700', color: '#001935', outline: 'none' }}
            >
              {CITIES.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Departure Date */}
        <div style={{ border: '1px solid var(--color-latam-border)', borderRadius: '10px', padding: '10px 14px', background: '#fafbfc' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-latam-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>
            Fecha de Salida
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#001935" />
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '600', color: '#001935', outline: 'none' }}
            />
          </div>
        </div>

        {/* Passengers Dropdown (Adults & Children) */}
        <div ref={paxRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowPaxDropdown(!showPaxDropdown)}
            style={{ 
              border: '1px solid var(--color-latam-border)', 
              borderRadius: '10px', 
              padding: '10px 14px', 
              background: '#fafbfc',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-latam-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>
              Pasajeros
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <Users size={18} color="#001935" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#001935', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {getPassengersLabel()}
                </span>
              </div>
              <ChevronDown size={16} color="#64748b" />
            </div>
          </div>

          {/* Interactive Popover for Adults and Children */}
          {showPaxDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '280px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0, 25, 53, 0.2)',
              border: '1px solid #cbd5e1',
              padding: '16px',
              zIndex: 100,
              marginTop: '6px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-latam-navy)', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                Selecciona Pasajeros
              </div>

              {/* Adults Counter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Adultos</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>12 años o más</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={adults <= 1}
                    onClick={() => setAdults(prev => Math.max(1, prev - 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      background: adults <= 1 ? '#f1f5f9' : '#fff',
                      color: adults <= 1 ? '#94a3b8' : 'var(--color-latam-coral)',
                      cursor: adults <= 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '800', width: '16px', textAlign: 'center' }}>
                    {adults}
                  </span>
                  <button
                    type="button"
                    disabled={adults + children >= 6}
                    onClick={() => setAdults(prev => Math.min(6 - children, prev + 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      background: (adults + children >= 6) ? '#f1f5f9' : '#fff',
                      color: (adults + children >= 6) ? '#94a3b8' : 'var(--color-latam-coral)',
                      cursor: (adults + children >= 6) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Children Counter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Niños</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>2-11 años</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Asiento propio</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    disabled={children <= 0}
                    onClick={() => setChildren(prev => Math.max(0, prev - 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      background: children <= 0 ? '#f1f5f9' : '#fff',
                      color: children <= 0 ? '#94a3b8' : 'var(--color-latam-coral)',
                      cursor: children <= 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '800', width: '16px', textAlign: 'center' }}>
                    {children}
                  </span>
                  <button
                    type="button"
                    disabled={adults + children >= 6}
                    onClick={() => setChildren(prev => Math.min(6 - adults, prev + 1))}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '1px solid #cbd5e1',
                      background: (adults + children >= 6) ? '#f1f5f9' : '#fff',
                      color: (adults + children >= 6) ? '#94a3b8' : 'var(--color-latam-coral)',
                      cursor: (adults + children >= 6) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPaxDropdown(false)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-latam-navy)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Aplicar Pasajeros ({totalPassengers})
              </button>
            </div>
          )}
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={loading}
          style={{
            height: '56px',
            padding: '0 24px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-latam-coral)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(232, 17, 75, 0.35)',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            border: 'none'
          }}
        >
          <Search size={20} />
          {loading ? 'Buscando...' : 'Buscar Vuelos'}
        </button>
      </form>
    </div>
  );
}
