import React, { useState } from 'react';
import { Search, Plane, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getFlightStatus } from '../api';

export default function FlightStatusView() {
  const [flightNumber, setFlightNumber] = useState('AC1401');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!flightNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFlightStatus(flightNumber.trim().toUpperCase());
      setStatusData(data);
    } catch (err) {
      setError(err.message);
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ARRIVED': return '#059669';
      case 'BOARDING': return '#2563eb';
      case 'DEPARTED': return '#4f46e5';
      case 'DELAYED': return '#dc2626';
      default: return '#001935';
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-latam-navy)', marginBottom: '8px' }}>
          Estado de Vuelos en Vivo
        </h1>
        <p style={{ color: '#64748b' }}>
          Consulta el estado operativo, puertas y horarios en tiempo real en nuestra red Quito, Guayaquil y Cuenca.
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', maxWidth: '450px', margin: '0 auto 30px auto' }}>
        <input
          type="text"
          placeholder="Número de Vuelo (ej: AC1401, AC1501)"
          value={flightNumber}
          onChange={e => setFlightNumber(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', textTransform: 'uppercase' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-latam-coral)',
            color: '#fff',
            fontWeight: '700',
            fontSize: '15px'
          }}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {statusData && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 10px 30px rgba(0, 25, 53, 0.08)',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>VUELO</span>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                {statusData.flightNumber}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Aeronave: {statusData.aircraft || 'Airbus A320'}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: getStatusColor(statusData.status),
                color: '#fff'
              }}>
                {statusData.status}
              </span>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Fecha: {statusData.date}</div>
            </div>
          </div>

          {/* Timing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>SALIDA</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                {statusData.departure?.iataCode}
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
                Programado: {new Date(statusData.departure?.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Terminal {statusData.departure?.terminal || '1'}</div>
            </div>

            <div>
              <Plane size={32} color="var(--color-latam-coral)" />
            </div>

            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>LLEGADA</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                {statusData.arrival?.iataCode}
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
                Programado: {new Date(statusData.arrival?.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Terminal {statusData.arrival?.terminal || '1'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
