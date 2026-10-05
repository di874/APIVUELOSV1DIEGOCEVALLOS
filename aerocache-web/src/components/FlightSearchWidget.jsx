import React, { useState } from 'react';
import { ArrowLeftRight, Calendar, Users, Search, MapPin } from 'lucide-react';

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
  const [tripType, setTripType] = useState('oneway');

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin === destination) {
      alert('El origen y el destino no pueden ser iguales.');
      return;
    }
    onSearch({ origin, destination, departureDate, passengers: { adults, youths: 0, children: 0, infants: 0 } });
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '16px',
      padding: '24px 32px',
      boxShadow: '0 12px 35px rgba(0, 25, 53, 0.12)',
      border: '1px solid #e1e8f0',
      maxWidth: '1100px',
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
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 48px 1.2fr 1fr 1fr auto', gap: '12px', alignItems: 'center' }}>
        
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
            margin: '0 auto'
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

        {/* Passengers */}
        <div style={{ border: '1px solid var(--color-latam-border)', borderRadius: '10px', padding: '10px 14px', background: '#fafbfc' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-latam-text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>
            Pasajeros
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#001935" />
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: '700', color: '#001935', outline: 'none' }}
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Adulto' : 'Adultos'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={loading}
          style={{
            height: '56px',
            padding: '0 28px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-latam-coral)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(232, 17, 75, 0.35)',
            opacity: loading ? 0.7 : 1
          }}
        >
          <Search size={20} />
          {loading ? 'Buscando...' : 'Buscar Vuelos'}
        </button>
      </form>
    </div>
  );
}
