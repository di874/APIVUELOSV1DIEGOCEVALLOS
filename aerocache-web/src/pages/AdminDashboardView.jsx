import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Ticket, Plane, CheckCircle, AlertTriangle, 
  Clock, LogOut, RefreshCw, Eye, TrendingUp, BarChart3, ShieldCheck, Lock, X
} from 'lucide-react';
import { adminLogin, getAdminDashboardStats, updateFlightStatus, getFlightPassengers } from '../api';

export default function AdminDashboardView() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('aerocache_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [emailInput, setEmailInput] = useState('admin@aerocache.ec');
  const [passwordInput, setPasswordInput] = useState('admin123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Dashboard Data State
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Active view tab inside admin
  const [subTab, setSubTab] = useState('flights'); // 'flights' | 'bookings' | 'routes'
  const [searchFilter, setSearchFilter] = useState('');

  // Passengers Modal for a specific flight
  const [selectedFlightForPax, setSelectedFlightForPax] = useState(null);
  const [flightPaxList, setFlightPaxList] = useState([]);
  const [loadingPax, setLoadingPax] = useState(false);

  // Status updating state
  const [updatingFlight, setUpdatingFlight] = useState(null);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState(null);

  useEffect(() => {
    if (adminUser) {
      loadStats();
    }
  }, [adminUser]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const user = await adminLogin(emailInput, passwordInput);
      setAdminUser(user);
      localStorage.setItem('aerocache_admin_user', JSON.stringify(user));
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('aerocache_admin_user');
    setStats(null);
  };

  const loadStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const data = await getAdminDashboardStats();
      setStats(data);
      setLastRefreshed(new Date().toLocaleTimeString('es-EC'));
    } catch (err) {
      setStatsError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleStatusChange = async (flightNumber, newStatus) => {
    setUpdatingFlight(flightNumber);
    setStatusSuccessMsg(null);
    try {
      await updateFlightStatus(flightNumber, newStatus);
      // Update local state smoothly
      if (stats && stats.flightOccupancies) {
        setStats(prev => ({
          ...prev,
          flightOccupancies: prev.flightOccupancies.map(f => 
            f.flightNumber === flightNumber ? { ...f, status: newStatus } : f
          )
        }));
      }
      setStatusSuccessMsg(`Estado del vuelo ${flightNumber} actualizado a ${newStatus}`);
      setTimeout(() => setStatusSuccessMsg(null), 4000);
    } catch (err) {
      alert('Error al actualizar estado: ' + err.message);
    } finally {
      setUpdatingFlight(null);
    }
  };

  const handleViewPassengers = async (flight) => {
    setSelectedFlightForPax(flight);
    setLoadingPax(true);
    try {
      const list = await getFlightPassengers(flight.flightNumber);
      setFlightPaxList(list);
    } catch (err) {
      alert('Error al obtener lista de pasajeros: ' + err.message);
      setFlightPaxList([]);
    } finally {
      setLoadingPax(false);
    }
  };

  // -------------------------------------------------------------
  // LOGIN FORM
  // -------------------------------------------------------------
  if (!adminUser) {
    return (
      <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 12px 30px rgba(0,25,53,0.12)',
          border: '1px solid #e2e8f0',
          padding: '36px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #001935 0%, #1e3a8a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#fff',
            boxShadow: '0 6px 16px rgba(0,25,53,0.25)'
          }}>
            <ShieldCheck size={32} color="#e8114b" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-latam-navy)', marginBottom: '6px' }}>
            Portal Administrativo
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Gestión y Monitoreo de Operaciones • <strong>AEROCACHE</strong>
          </p>

          {loginError && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '18px',
              textAlign: 'left'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                Correo Institucional Admin
              </label>
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@aerocache.ec"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-latam-coral)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                border: 'none',
                marginTop: '10px',
                transition: 'opacity 0.2s',
                opacity: loginLoading ? 0.7 : 1
              }}
            >
              {loginLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '11px', color: '#64748b', textAlign: 'left' }}>
            <strong>Credenciales por defecto:</strong><br />
            • Usuario: <code>admin@aerocache.ec</code><br />
            • Clave: <code>admin123</code> (o <code>admin</code>)
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ADMIN DASHBOARD CONTENT
  // -------------------------------------------------------------
  const flightsList = stats?.flightOccupancies || [];
  const filteredFlights = flightsList.filter(f => 
    f.flightNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.route.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.status.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const rawBookings = stats?.recentBookings || [];
  const bookingsList = rawBookings.map(b => {
    const p0 = b.passengers?.[0] || {};
    return {
      pnr: b.pnr,
      bookingId: b.bookingId,
      passengerName: `${p0.firstName || 'Pasajero'} ${p0.lastName || ''}`.trim(),
      documentNumber: p0.documentNumber || 'N/A',
      route: b.itineraries?.[0]?.itineraryId ? b.itineraries[0].itineraryId.replace('ITIN-', '').replace(/-\d{8}$/, '') : 'Ecuador',
      totalAmount: b.grandTotal?.total ? parseFloat(b.grandTotal.total) : 0,
      currency: b.grandTotal?.currency || 'USD',
      status: b.status,
      createdAt: b.createdAt
    };
  });

  const filteredBookings = bookingsList.filter(b => 
    b.pnr.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.passengerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.route.toLowerCase().includes(searchFilter.toLowerCase()) ||
    b.status.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '30px auto 60px auto', padding: '0 20px' }}>
      
      {/* Top Banner & Profile Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--color-latam-navy)',
        color: '#fff',
        padding: '20px 28px',
        borderRadius: '16px',
        marginBottom: '28px',
        boxShadow: '0 8px 24px rgba(0,25,53,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#e8114b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232,17,75,0.4)'
          }}>
            <BarChart3 size={24} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>
                Panel de Control de Operaciones
              </h1>
              <span style={{
                backgroundColor: 'rgba(232,17,75,0.25)',
                color: '#ff6b8b',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '1px solid rgba(232,17,75,0.4)'
              }}>
                AEROCACHE ADMIN
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#9bb1c9', margin: '4px 0 0 0' }}>
              Sesión activa: <strong>{adminUser.email}</strong> • {lastRefreshed && `Actualizado: ${lastRefreshed}`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadStats}
            disabled={loadingStats}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loadingStats ? 'spin-animation' : ''} />
            {loadingStats ? 'Cargando...' : 'Actualizar'}
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              backgroundColor: '#e8114b',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
            Salir
          </button>
        </div>
      </div>

      {statusSuccessMsg && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={18} color="#059669" />
          {statusSuccessMsg}
        </div>
      )}

      {statsError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          {statsError}
        </div>
      )}

      {/* 4 KPI Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '32px'
      }}>
        {/* Total Bookings */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
            <Ticket size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Total Reservas
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
              {stats?.totalBookings ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <TrendingUp size={12} /> Confirmadas en sistema
            </div>
          </div>
        </div>

        {/* Total Passengers */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Personas que Compraron
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
              {stats?.totalPassengers ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Pasajeros registrados
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Ingresos Totales (USD)
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803d' }}>
              ${stats ? stats.totalRevenue.toFixed(2) : '0.00'}
            </div>
            <div style={{ fontSize: '11px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <TrendingUp size={12} /> Facturación cobrada
            </div>
          </div>
        </div>

        {/* Flights Today */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-latam-navy)' }}>
            <Plane size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Vuelos Programados Hoy
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
              {stats?.totalFlightsToday ?? 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Flota Airbus A320 Ecuador
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          {[
            { id: 'flights', label: '✈ Control de Vuelos y Ocupación' },
            { id: 'bookings', label: '📋 Pasajeros y Reservas' },
            { id: 'routes', label: '📊 Rutas Ecuador (UIO, GYE, CUE)' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: subTab === t.id ? '700' : '500',
                color: subTab === t.id ? 'var(--color-latam-navy)' : '#64748b',
                backgroundColor: subTab === t.id ? '#fff' : 'transparent',
                border: 'none',
                boxShadow: subTab === t.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        {subTab !== 'routes' && (
          <input
            type="text"
            placeholder={subTab === 'flights' ? 'Buscar vuelo, ruta o estado...' : 'Buscar por PNR, pasajero o ruta...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              width: '280px'
            }}
          />
        )}
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: FLIGHTS & OCCUPANCY                            */}
      {/* ========================================================= */}
      {subTab === 'flights' && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-latam-navy)', margin: 0 }}>
              Operación de Vuelos y Ocupación en Tiempo Real
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Mostrando {filteredFlights.length} vuelos activos
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Vuelo</th>
                  <th style={{ padding: '12px 18px' }}>Ruta</th>
                  <th style={{ padding: '12px 18px' }}>Fecha y Hora Salida</th>
                  <th style={{ padding: '12px 18px' }}>Aeronave</th>
                  <th style={{ padding: '12px 18px' }}>Ocupación de Asientos</th>
                  <th style={{ padding: '12px 18px' }}>Estado Operacional</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron vuelos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((flight) => {
                    const occPct = Math.min(100, Math.round(flight.occupancyPercentage));
                    const isFull = occPct >= 80;
                    
                    return (
                      <tr key={flight.flightId || flight.flightNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 'bold', color: 'var(--color-latam-navy)' }}>
                          {flight.flightNumber}
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: '600' }}>
                          {flight.route}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#334155' }}>
                          {flight.scheduledDeparture}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#64748b' }}>
                          Airbus A320
                        </td>
                        <td style={{ padding: '14px 18px', minWidth: '170px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', fontWeight: '600' }}>
                            <span>{flight.bookedSeats} / {flight.totalSeats} PAX</span>
                            <span style={{ color: isFull ? '#e8114b' : '#0369a1' }}>{occPct}%</span>
                          </div>
                          <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${occPct}%`,
                              backgroundColor: isFull ? '#e8114b' : '#0284c7',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {/* Live Status Selector */}
                          <select
                            value={flight.status}
                            disabled={updatingFlight === flight.flightNumber}
                            onChange={(e) => handleStatusChange(flight.flightNumber, e.target.value)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              border: '1px solid #cbd5e1',
                              backgroundColor: 
                                flight.status === 'SCHEDULED' ? '#eff6ff' :
                                flight.status === 'BOARDING' ? '#fef3c7' :
                                flight.status === 'DEPARTED' ? '#dcfce7' :
                                flight.status === 'DELAYED' ? '#fee2e2' :
                                flight.status === 'ARRIVED' ? '#f1f5f9' : '#fff',
                              color:
                                flight.status === 'SCHEDULED' ? '#1d4ed8' :
                                flight.status === 'BOARDING' ? '#b45309' :
                                flight.status === 'DEPARTED' ? '#15803d' :
                                flight.status === 'DELAYED' ? '#dc2626' :
                                flight.status === 'ARRIVED' ? '#334155' : '#000',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="SCHEDULED">SCHEDULED (Programado)</option>
                            <option value="BOARDING">BOARDING (Abordando)</option>
                            <option value="DEPARTED">DEPARTED (En Vuelo)</option>
                            <option value="DELAYED">DELAYED (Demorado)</option>
                            <option value="ARRIVED">ARRIVED (Aterrizó)</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleViewPassengers(flight)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              color: 'var(--color-latam-navy)',
                              fontSize: '12px',
                              fontWeight: '600',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} />
                            Ver ({flight.bookedSeats})
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: BOOKINGS & PASSENGERS                          */}
      {/* ========================================================= */}
      {subTab === 'bookings' && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-latam-navy)', margin: 0 }}>
              Registro de Personas que Compraron y Reservas
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {filteredBookings.length} compras registradas
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Código PNR</th>
                  <th style={{ padding: '12px 18px' }}>Pasajero Titular</th>
                  <th style={{ padding: '12px 18px' }}>Cédula / Pasaporte</th>
                  <th style={{ padding: '12px 18px' }}>Ruta de Vuelo</th>
                  <th style={{ padding: '12px 18px' }}>Total Pagado</th>
                  <th style={{ padding: '12px 18px' }}>Estado</th>
                  <th style={{ padding: '12px 18px' }}>Fecha de Compra</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Aún no hay compras registradas en el sistema.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.pnr} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          color: '#e8114b',
                          backgroundColor: '#fef2f2',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid #fecaca'
                        }}>
                          {b.pnr}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--color-latam-navy)' }}>
                        {b.passengerName}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        {b.documentNumber}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: '600' }}>
                        {b.route}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 'bold', color: '#15803d' }}>
                        ${b.totalAmount.toFixed(2)} {b.currency}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: b.status === 'CONFIRMED' ? '#dcfce7' : b.status === 'CHECKED_IN' ? '#e0f2fe' : '#fee2e2',
                          color: b.status === 'CONFIRMED' ? '#15803d' : b.status === 'CHECKED_IN' ? '#0369a1' : '#b91c1c'
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '12px' }}>
                        {new Date(b.createdAt).toLocaleDateString('es-EC', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: ROUTES PERFORMANCE                             */}
      {/* ========================================================= */}
      {subTab === 'routes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {(stats?.routeStats || []).map(r => (
            <div key={r.route} style={{
              backgroundColor: '#fff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
                  {r.route}
                </span>
                <span style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                  {r.flightsCount} vuelos
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Reservas Confirmadas:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--color-latam-navy)' }}>{r.bookingsCount} reservas</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Ingresos Generados:</span>
                <span style={{ fontWeight: 'bold', color: '#15803d' }}>${r.totalRevenue.toFixed(2)} USD</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PASSENGERS IN SPECIFIC FLIGHT                      */}
      {/* ========================================================= */}
      {selectedFlightForPax && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 25, 53, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: 'var(--color-latam-navy)',
              color: '#fff',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                  Manifiesto de Pasajeros • Vuelo {selectedFlightForPax.flightNumber}
                </h3>
                <span style={{ fontSize: '12px', color: '#9bb1c9' }}>
                  Ruta: {selectedFlightForPax.route} • Salida: {selectedFlightForPax.scheduledDeparture}
                </span>
              </div>
              <button
                onClick={() => setSelectedFlightForPax(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {loadingPax ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Cargando manifiesto de pasajeros...
                </div>
              ) : flightPaxList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No hay pasajeros asignados a este vuelo en la base de datos actual.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Pasajero</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Documento</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Asiento</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Contacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flightPaxList.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 'bold', color: 'var(--color-latam-navy)' }}>
                          {p.firstName} {p.lastName}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>
                          {p.documentNumber}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontWeight: 'bold', color: '#e8114b' }}>
                            {p.assignedSeats?.[0]?.seatNumber || '12A'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#64748b' }}>
                          {p.contact?.email || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
              <button
                onClick={() => setSelectedFlightForPax(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-latam-navy)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
