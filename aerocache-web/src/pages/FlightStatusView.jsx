import React, { useState, useEffect } from 'react';
import { Search, Plane, Clock, CheckCircle, AlertCircle, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { getFlightStatus } from '../api';

const QUICK_FLIGHTS = [
  { number: 'AC1401', route: 'UIO ➔ GYE' },
  { number: 'AC1402', route: 'GYE ➔ UIO' },
  { number: 'AC1501', route: 'UIO ➔ CUE' },
  { number: 'AC1601', route: 'UIO ➔ GPS' },
  { number: 'AC1701', route: 'GYE ➔ GPS' },
];

const LIFECYCLE_STEPS = [
  { key: 'SCHEDULED', label: 'Programado', sub: '> 2h antes' },
  { key: 'CHECK_IN_OPEN', label: 'Check-in Abierto', sub: '2h a 45m antes' },
  { key: 'BOARDING', label: 'Abordando', sub: '45m a despegue' },
  { key: 'IN_FLIGHT', label: 'En Vuelo', sub: 'En ruta aérea' },
  { key: 'ARRIVED', label: 'Aterrizado', sub: 'En destino' },
];

export default function FlightStatusView() {
  const [flightNumber, setFlightNumber] = useState('AC1401');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = async (fn) => {
    const query = (fn || flightNumber).trim().toUpperCase();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFlightStatus(query);
      setStatusData(data);
    } catch (err) {
      setError(err.message || 'No se pudo obtener el estado del vuelo');
      setStatusData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus('AC1401');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStatus(flightNumber);
  };

  const getStatusStepIndex = (status) => {
    switch (status) {
      case 'SCHEDULED': return 0;
      case 'CHECK_IN_OPEN': return 1;
      case 'BOARDING': return 2;
      case 'IN_FLIGHT':
      case 'DEPARTED': return 3;
      case 'ARRIVED': return 4;
      default: return -1;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ARRIVED': return '#059669';
      case 'IN_FLIGHT':
      case 'DEPARTED': return '#4f46e5';
      case 'BOARDING': return '#2563eb';
      case 'CHECK_IN_OPEN': return '#0891b2';
      case 'SCHEDULED': return '#001935';
      case 'DELAYED': return '#d97706';
      case 'CANCELLED': return '#dc2626';
      default: return '#001935';
    }
  };

  const currentStepIdx = statusData ? getStatusStepIndex(statusData.status) : -1;
  const isSpecialStatus = statusData && (statusData.status === 'DELAYED' || statusData.status === 'CANCELLED');

  return (
    <div style={{ maxWidth: '850px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span style={{ 
          backgroundColor: 'rgba(0, 25, 53, 0.08)', 
          color: 'var(--color-latam-navy)', 
          padding: '4px 14px', 
          borderRadius: '20px', 
          fontSize: '12px', 
          fontWeight: 'bold' 
        }}>
          RADAR Y OPERACIONES EN VIVO
        </span>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-latam-navy)', marginTop: '8px', marginBottom: '6px' }}>
          Estado de Vuelos en Vivo
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
          Transición operativa automática según horario y tiempo real en los aeropuertos de Quito, Guayaquil, Cuenca y Galápagos.
        </p>
      </div>

      {/* Quick Flight Selectors */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {QUICK_FLIGHTS.map(f => (
          <button
            key={f.number}
            type="button"
            onClick={() => {
              setFlightNumber(f.number);
              fetchStatus(f.number);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: flightNumber.toUpperCase() === f.number ? '1px solid var(--color-latam-coral)' : '1px solid #cbd5e1',
              backgroundColor: flightNumber.toUpperCase() === f.number ? '#fff1f2' : '#fff',
              color: flightNumber.toUpperCase() === f.number ? 'var(--color-latam-coral)' : '#334155',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <span>{f.number}</span>
            <span style={{ fontSize: '11px', opacity: 0.75 }}>({f.route})</span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', maxWidth: '480px', margin: '0 auto 30px auto' }}>
        <input
          type="text"
          placeholder="Número de Vuelo (ej: AC1401, AC1402)"
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
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px' }}>
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
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>VUELO OPERATIVO</span>
              <div style={{ fontSize: '30px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                {statusData.flightNumber}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                Aeronave: <strong>{statusData.aircraft || 'Airbus A320'}</strong> • Operado por: <strong>AEROCACHE Ecuador</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block',
                padding: '6px 18px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: getStatusColor(statusData.status),
                color: '#fff',
                letterSpacing: '0.5px'
              }}>
                {statusData.status}
              </span>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Fecha: {statusData.date}</div>
            </div>
          </div>

          {/* Stepper Visualizer for Lifecycle */}
          {!isSpecialStatus && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px 14px',
              marginBottom: '26px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center', letterSpacing: '0.5px' }}>
                Ciclo de Vida Automático del Vuelo
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const isPassed = currentStepIdx >= idx;
                  const isCurrent = currentStepIdx === idx;
                  return (
                    <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                      <div style={{
                        width: isCurrent ? '34px' : '26px',
                        height: isCurrent ? '34px' : '26px',
                        borderRadius: '50%',
                        backgroundColor: isCurrent ? 'var(--color-latam-coral)' : (isPassed ? '#10b981' : '#e2e8f0'),
                        color: isPassed || isCurrent ? '#fff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: isCurrent ? '14px' : '12px',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(232, 17, 75, 0.2)' : 'none',
                        transition: 'all 0.2s'
                      }}>
                        {isPassed && !isCurrent ? '✓' : idx + 1}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: isCurrent ? '800' : (isPassed ? '700' : '500'),
                        color: isCurrent ? 'var(--color-latam-coral)' : (isPassed ? '#1e293b' : '#94a3b8'),
                        marginTop: '6px',
                        textAlign: 'center'
                      }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>
                        {step.sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isSpecialStatus && (
            <div style={{
              backgroundColor: statusData.status === 'DELAYED' ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${statusData.status === 'DELAYED' ? '#fde68a' : '#fecaca'}`,
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: statusData.status === 'DELAYED' ? '#92400e' : '#991b1b'
            }}>
              <AlertTriangle size={24} />
              <div>
                <div style={{ fontWeight: '800', fontSize: '14px' }}>
                  {statusData.status === 'DELAYED' ? 'Vuelo Demorado' : 'Vuelo Cancelado'}
                </div>
                <div style={{ fontSize: '12px' }}>
                  {statusData.status === 'DELAYED' 
                    ? 'El vuelo presenta un retraso operativo. El personal en aeropuerto brindará información actualizada.'
                    : 'Este vuelo ha sido cancelado. Puedes solicitar reubicación o reembolso desde Mis Viajes.'}
                </div>
              </div>
            </div>
          )}

          {/* Timing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>ORIGEN</div>
              <div style={{ fontSize: '38px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                {statusData.departure?.iataCode}
              </div>
              <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                Programado: {new Date(statusData.departure?.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Terminal {statusData.departure?.terminal || '1'} • Puerta {statusData.departure?.gate || 'A2'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Plane size={32} color="var(--color-latam-coral)" />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Vuelo Directo</span>
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>DESTINO</div>
              <div style={{ fontSize: '38px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                {statusData.arrival?.iataCode}
              </div>
              <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                Programado: {new Date(statusData.arrival?.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Terminal {statusData.arrival?.terminal || '1'} • Sala {statusData.arrival?.gate || 'B1'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
