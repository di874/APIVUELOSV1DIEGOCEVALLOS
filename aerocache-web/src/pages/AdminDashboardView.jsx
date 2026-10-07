import React, { useState, useEffect } from 'react';
import { 
  Users, DollarSign, Ticket, Plane, CheckCircle, AlertTriangle, 
  Clock, LogOut, RefreshCw, Eye, TrendingUp, BarChart3, ShieldCheck, Lock, X, Plus, MapPin, Calendar, Edit, Trash2
} from 'lucide-react';
import { 
  adminLogin, getAdminDashboardStats, updateFlightStatus, getFlightPassengers, createFlight,
  getRoutes, createRoute, updateRoute, deleteRoute
} from '../api';

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

  // Create Flight Modal State
  const [showCreateFlightModal, setShowCreateFlightModal] = useState(false);
  const [creatingFlight, setCreatingFlight] = useState(false);
  const [newFlightData, setNewFlightData] = useState({
    flightNumber: 'AC1502',
    originIata: 'UIO',
    originCity: 'Quito',
    destinationIata: 'GPS',
    destinationCity: 'Galápagos (Baltra)',
    departureTime: '',
    durationMinutes: 50,
    aircraft: 'Airbus A320',
    basePrice: 49.00
  });

  // Routes CRUD State
  const [routesList, setRoutesList] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showCreateRouteModal, setShowCreateRouteModal] = useState(false);
  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [selectedRouteForEdit, setSelectedRouteForEdit] = useState(null);
  const [savingRoute, setSavingRoute] = useState(false);

  const [newRouteData, setNewRouteData] = useState({
    originIata: 'UIO',
    originCity: 'Quito',
    destinationIata: 'GPS',
    destinationCity: 'Galápagos (Baltra)',
    airportName: 'Aeropuerto Seymour de Baltra (GPS)',
    durationMinutes: 50,
    basePrice: 55.00,
    priceLight: 68.25,
    pricePlus: 92.50,
    priceTop: 126.75,
    initialFlightNumber: 'AC1701'
  });

  const [editRouteData, setEditRouteData] = useState({
    routeKey: '',
    originCity: '',
    destinationCity: '',
    airportName: '',
    durationMinutes: 50,
    basePrice: 55.00,
    priceLight: 68.25,
    pricePlus: 92.50,
    priceTop: 126.75
  });

  useEffect(() => {
    if (adminUser) {
      loadStats();
      loadRoutes();
    }
  }, [adminUser]);

  useEffect(() => {
    if (adminUser && subTab === 'routes') {
      loadRoutes();
    }
  }, [subTab, adminUser]);

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

  const handleCreateFlightSubmit = async (e) => {
    e.preventDefault();
    setCreatingFlight(true);
    try {
      const orig = newFlightData.originIata.trim().toUpperCase();
      const dest = newFlightData.destinationIata.trim().toUpperCase();
      if (orig === dest) {
        alert('El origen y el destino no pueden ser iguales.');
        setCreatingFlight(false);
        return;
      }

      const res = await createFlight({
        flightNumber: newFlightData.flightNumber.trim().toUpperCase(),
        originIata: orig,
        destinationIata: dest,
        originCity: newFlightData.originCity,
        destinationCity: newFlightData.destinationCity,
        departureTime: newFlightData.departureTime || new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: parseInt(newFlightData.durationMinutes) || 50,
        aircraft: newFlightData.aircraft || 'Airbus A320',
        basePrice: parseFloat(newFlightData.basePrice) || 45.00
      });

      // Save new destination to localStorage so the search widget has it immediately
      const destCityName = newFlightData.destinationCity || dest;
      const newDestObj = {
        code: dest,
        name: destCityName,
        airport: `Aeropuerto de ${destCityName} (${dest})`
      };

      try {
        const existing = JSON.parse(localStorage.getItem('aerocache_custom_destinations') || '[]');
        const updated = [...existing.filter(d => d.code !== dest), newDestObj];
        localStorage.setItem('aerocache_custom_destinations', JSON.stringify(updated));
      } catch {}

      // Notify FlightSearchWidget
      window.dispatchEvent(new Event('destinationsUpdated'));

      setShowCreateFlightModal(false);
      setStatusSuccessMsg(`¡Vuelo ${newFlightData.flightNumber} (${orig} ➔ ${dest}) creado con éxito! Ya está disponible en la página principal.`);
      setTimeout(() => setStatusSuccessMsg(null), 6000);
      loadStats();
    } catch (err) {
      alert('Error al crear vuelo: ' + err.message);
    } finally {
      setCreatingFlight(false);
    }
  };

  const loadRoutes = async () => {
    setLoadingRoutes(true);
    try {
      const data = await getRoutes();
      setRoutesList(data || []);
    } catch (err) {
      console.warn('Error al cargar rutas:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleCreateRouteSubmit = async (e) => {
    e.preventDefault();
    setSavingRoute(true);
    try {
      const orig = newRouteData.originIata.trim().toUpperCase();
      const dest = newRouteData.destinationIata.trim().toUpperCase();
      if (orig === dest) {
        alert('El origen y el destino no pueden ser iguales.');
        setSavingRoute(false);
        return;
      }

      await createRoute({
        originIata: orig,
        originCity: newRouteData.originCity,
        destinationIata: dest,
        destinationCity: newRouteData.destinationCity,
        airportName: newRouteData.airportName,
        durationMinutes: parseInt(newRouteData.durationMinutes) || 50,
        basePrice: parseFloat(newRouteData.basePrice) || 45.00,
        priceLight: parseFloat(newRouteData.priceLight),
        pricePlus: parseFloat(newRouteData.pricePlus),
        priceTop: parseFloat(newRouteData.priceTop),
        initialFlightNumber: newRouteData.initialFlightNumber
      });

      // Update destination in localStorage
      const destCityName = newRouteData.destinationCity || dest;
      const newDestObj = {
        code: dest,
        name: destCityName,
        airport: newRouteData.airportName || `Aeropuerto de ${destCityName} (${dest})`
      };
      try {
        const existing = JSON.parse(localStorage.getItem('aerocache_custom_destinations') || '[]');
        const updated = [...existing.filter(d => d.code !== dest), newDestObj];
        localStorage.setItem('aerocache_custom_destinations', JSON.stringify(updated));
      } catch {}
      window.dispatchEvent(new Event('destinationsUpdated'));

      setShowCreateRouteModal(false);
      setStatusSuccessMsg(`¡Ruta ${orig} ➔ ${dest} creada con éxito con precios LIGHT $${newRouteData.priceLight}, PLUS $${newRouteData.pricePlus}, TOP $${newRouteData.priceTop}!`);
      setTimeout(() => setStatusSuccessMsg(null), 6000);
      loadRoutes();
      loadStats();
    } catch (err) {
      alert('Error al crear ruta: ' + err.message);
    } finally {
      setSavingRoute(false);
    }
  };

  const handleOpenEditRoute = (route) => {
    setSelectedRouteForEdit(route);
    setEditRouteData({
      routeKey: route.routeKey,
      originCity: route.originCity,
      destinationCity: route.destinationCity,
      airportName: route.airportName,
      durationMinutes: route.durationMinutes,
      basePrice: route.basePrice,
      priceLight: route.priceLight,
      pricePlus: route.pricePlus,
      priceTop: route.priceTop
    });
    setShowEditRouteModal(true);
  };

  const handleUpdateRouteSubmit = async (e) => {
    e.preventDefault();
    setSavingRoute(true);
    try {
      await updateRoute(editRouteData.routeKey, {
        destinationCity: editRouteData.destinationCity,
        airportName: editRouteData.airportName,
        durationMinutes: parseInt(editRouteData.durationMinutes) || 50,
        basePrice: parseFloat(editRouteData.basePrice) || 45.00,
        priceLight: parseFloat(editRouteData.priceLight),
        pricePlus: parseFloat(editRouteData.pricePlus),
        priceTop: parseFloat(editRouteData.priceTop)
      });
      setShowEditRouteModal(false);
      setStatusSuccessMsg(`¡Ruta ${editRouteData.routeKey} actualizada con éxito! Nuevos precios aplicados a todos sus vuelos.`);
      setTimeout(() => setStatusSuccessMsg(null), 5000);
      loadRoutes();
      loadStats();
    } catch (err) {
      alert('Error al actualizar ruta: ' + err.message);
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (routeKey) => {
    if (!window.confirm(`¿Estás seguro de eliminar la ruta ${routeKey} y todos sus vuelos de la base de datos? Esta acción es irreversible.`)) {
      return;
    }
    try {
      await deleteRoute(routeKey);
      setStatusSuccessMsg(`Ruta ${routeKey} eliminada exitosamente.`);
      setTimeout(() => setStatusSuccessMsg(null), 5000);
      loadRoutes();
      loadStats();
    } catch (err) {
      alert('Error al eliminar ruta: ' + err.message);
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
            onClick={() => setShowCreateFlightModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
            }}
          >
            <Plus size={16} />
            Crear Vuelo / Ruta
          </button>

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
      {/* SUB-TAB 3: RUTAS ECUADOR (CRUD OFICIAL ADMINISTRADOR)      */}
      {/* ========================================================= */}
      {subTab === 'routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Action Bar for Routes CRUD */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-latam-navy)', margin: 0 }}>
                ✈️ Rutas de Ecuador y Gestión de Destinos (CRUD Oficial)
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Administra destinos, programa itinerarios y personaliza precios por clase tarifaria (LIGHT, PLUS, TOP).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={loadRoutes}
                disabled={loadingRoutes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: 'var(--color-latam-navy)',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} className={loadingRoutes ? 'spin-animation' : ''} />
                Refrescar
              </button>

              <button
                onClick={() => setShowCreateRouteModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
                }}
              >
                <Plus size={16} />
                ➕ Nueva Ruta / Destino
              </button>
            </div>
          </div>

          {/* Routes Table */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                Catálogo de Rutas Activas ({routesList.length})
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Cualquier cambio se refleja instantáneamente en el buscador de vuelos.
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', fontSize: '12px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px' }}>Código Ruta</th>
                    <th style={{ padding: '12px 16px' }}>Ciudades (Origen ➔ Destino)</th>
                    <th style={{ padding: '12px 16px' }}>Aeropuerto</th>
                    <th style={{ padding: '12px 16px' }}>Duración</th>
                    <th style={{ padding: '12px 16px' }}>Tarifas (LIGHT / PLUS / TOP)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Vuelos</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRoutes ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Cargando rutas de Ecuador...
                      </td>
                    </tr>
                  ) : routesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        No hay rutas configuradas. Haz clic en "Nueva Ruta / Destino" para crear la primera.
                      </td>
                    </tr>
                  ) : (
                    routesList.map((r) => (
                      <tr key={r.routeKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            color: '#001935',
                            backgroundColor: '#f1f5f9',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                          }}>
                            {r.originIata} ➔ {r.destinationIata}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--color-latam-navy)' }}>
                          {r.originCity} ➔ {r.destinationCity}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px' }}>
                          {r.airportName}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: '600', color: '#334155' }}>
                          ⏱️ {r.durationMinutes} min
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold' }}>
                              LIGHT: ${r.priceLight.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }}>
                              PLUS: ${r.pricePlus.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f3e8ff', color: '#7e22ce', fontWeight: 'bold' }}>
                              TOP: ${r.priceTop.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                            {r.flightsCount}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEditRoute(r)}
                              title="Editar precios y detalles de la ruta"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: '1px solid #bfdbfe',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit size={13} />
                              Editar
                            </button>

                            <button
                              onClick={() => handleDeleteRoute(r.routeKey)}
                              title="Eliminar esta ruta y sus vuelos"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: '1px solid #fecaca',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div style={{ marginTop: '10px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-latam-navy)', marginBottom: '14px' }}>
              📊 Desempeño Comercial por Ruta
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {(stats?.routeStats || []).map(r => (
                <div key={r.route} style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
                      {r.route}
                    </span>
                    <span style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 7px', borderRadius: '5px', fontWeight: 'bold' }}>
                      {r.flightsCount} vuelos
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                    <span>Reservas:</span>
                    <strong style={{ color: 'var(--color-latam-navy)' }}>{r.bookingsCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                    <span>Ingresos:</span>
                    <strong style={{ color: '#15803d' }}>${r.totalRevenue.toFixed(2)} USD</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {/* Modal: Crear Nuevo Vuelo / Destino */}
      {showCreateFlightModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 25, 53, 0.7)',
          backdropFilter: 'blur(4px)',
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
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              backgroundColor: 'var(--color-latam-navy)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  ✈️ Crear Nuevo Vuelo y Ruta
                </h3>
                <span style={{ fontSize: '12px', color: '#9bb1c9' }}>
                  El nuevo destino se publicará automáticamente en el buscador de la página principal.
                </span>
              </div>
              <button
                onClick={() => setShowCreateFlightModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateFlightSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Número de Vuelo
                  </label>
                  <input
                    type="text"
                    required
                    value={newFlightData.flightNumber}
                    onChange={(e) => setNewFlightData({ ...newFlightData, flightNumber: e.target.value })}
                    placeholder="ej: AC1602"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Aeronave
                  </label>
                  <input
                    type="text"
                    value={newFlightData.aircraft}
                    onChange={(e) => setNewFlightData({ ...newFlightData, aircraft: e.target.value })}
                    placeholder="Airbus A320"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Origen y Destino */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Origen (IATA)
                  </label>
                  <select
                    value={newFlightData.originIata}
                    onChange={(e) => {
                      const val = e.target.value;
                      const names = { UIO: 'Quito', GYE: 'Guayaquil', CUE: 'Cuenca', GPS: 'Galápagos' };
                      setNewFlightData({ ...newFlightData, originIata: val, originCity: names[val] || val });
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold' }}
                  >
                    <option value="UIO">Quito (UIO)</option>
                    <option value="GYE">Guayaquil (GYE)</option>
                    <option value="CUE">Cuenca (CUE)</option>
                    <option value="GPS">Galápagos (GPS)</option>
                    <option value="MEC">Manta (MEC)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Destino (Seleccionar o Escribir)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={newFlightData.destinationIata}
                      onChange={(e) => {
                        const val = e.target.value;
                        const names = {
                          GPS: 'Galápagos (Baltra)',
                          SCY: 'San Cristóbal (Galápagos)',
                          MEC: 'Manta',
                          LOH: 'Loja (Catamayo)',
                          ETR: 'Santa Rosa (Machala)',
                          OCC: 'Coca (Orellana)',
                          ESM: 'Esmeraldas',
                          UIO: 'Quito',
                          GYE: 'Guayaquil',
                          CUE: 'Cuenca'
                        };
                        setNewFlightData({
                          ...newFlightData,
                          destinationIata: val,
                          destinationCity: names[val] || val
                        });
                      }}
                      style={{ width: '60%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      <option value="GPS">GPS - Galápagos</option>
                      <option value="SCY">SCY - San Cristóbal</option>
                      <option value="MEC">MEC - Manta</option>
                      <option value="LOH">LOH - Loja</option>
                      <option value="ETR">ETR - Santa Rosa</option>
                      <option value="OCC">OCC - Coca</option>
                      <option value="ESM">ESM - Esmeraldas</option>
                      <option value="UIO">UIO - Quito</option>
                      <option value="GYE">GYE - Guayaquil</option>
                      <option value="CUE">CUE - Cuenca</option>
                    </select>

                    <input
                      type="text"
                      maxLength={3}
                      placeholder="IATA"
                      value={newFlightData.destinationIata}
                      onChange={(e) => setNewFlightData({ ...newFlightData, destinationIata: e.target.value.toUpperCase() })}
                      style={{ width: '40%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Nombre de la Ciudad / Aeropuerto Destino
                  </label>
                  <input
                    type="text"
                    required
                    value={newFlightData.destinationCity}
                    onChange={(e) => setNewFlightData({ ...newFlightData, destinationCity: e.target.value })}
                    placeholder="ej: Galápagos (Baltra)"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Horario y Precio */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Fecha y Hora de Salida
                  </label>
                  <input
                    type="datetime-local"
                    value={newFlightData.departureTime}
                    onChange={(e) => setNewFlightData({ ...newFlightData, departureTime: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Duración (Minutos)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="300"
                    value={newFlightData.durationMinutes}
                    onChange={(e) => setNewFlightData({ ...newFlightData, durationMinutes: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Precio Base Tarifa (USD)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="10"
                      value={newFlightData.basePrice}
                      onChange={(e) => setNewFlightData({ ...newFlightData, basePrice: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              {/* Resumen de Tarifas que se crearán */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#166534' }}>
                <strong>Tarifas creadas automáticamente:</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span>🟢 <strong>LIGHT:</strong> ${(parseFloat(newFlightData.basePrice || 45) + (parseFloat(newFlightData.basePrice || 45)*0.15 + 5)).toFixed(2)}</span>
                  <span>🔵 <strong>PLUS:</strong> ${(parseFloat(newFlightData.basePrice || 45)*1.35 + (parseFloat(newFlightData.basePrice || 45)*1.35*0.15 + 5)).toFixed(2)}</span>
                  <span>🟣 <strong>TOP:</strong> ${(parseFloat(newFlightData.basePrice || 45)*1.85 + (parseFloat(newFlightData.basePrice || 45)*1.85*0.15 + 5)).toFixed(2)}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateFlightModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creatingFlight}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: creatingFlight ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    opacity: creatingFlight ? 0.7 : 1
                  }}
                >
                  {creatingFlight ? 'Publicando Vuelo...' : '✓ Crear Vuelo y Publicar Destino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREAR NUEVA RUTA / DESTINO CON PRECIOS             */}
      {/* ========================================================= */}
      {showCreateRouteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 25, 53, 0.7)',
          backdropFilter: 'blur(4px)',
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
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              backgroundColor: 'var(--color-latam-navy)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  🗺️ Crear Nueva Ruta y Destino en Ecuador
                </h3>
                <span style={{ fontSize: '12px', color: '#9bb1c9' }}>
                  Define origen, destino, duración y precios exactos para las clases LIGHT, PLUS y TOP.
                </span>
              </div>
              <button
                onClick={() => setShowCreateRouteModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRouteSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Origen y Destino */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Origen IATA
                  </label>
                  <select
                    value={newRouteData.originIata}
                    onChange={(e) => {
                      const val = e.target.value;
                      const names = { UIO: 'Quito', GYE: 'Guayaquil', CUE: 'Cuenca', GPS: 'Galápagos', MEC: 'Manta' };
                      setNewRouteData({ ...newRouteData, originIata: val, originCity: names[val] || val });
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold' }}
                  >
                    <option value="UIO">Quito (UIO)</option>
                    <option value="GYE">Guayaquil (GYE)</option>
                    <option value="CUE">Cuenca (CUE)</option>
                    <option value="GPS">Galápagos (GPS)</option>
                    <option value="MEC">Manta (MEC)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Destino IATA
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={newRouteData.destinationIata}
                      onChange={(e) => {
                        const val = e.target.value;
                        const names = {
                          GPS: 'Galápagos (Baltra)',
                          SCY: 'San Cristóbal (Galápagos)',
                          MEC: 'Manta',
                          LOH: 'Loja (Catamayo)',
                          ETR: 'Santa Rosa (Machala)',
                          OCC: 'Coca (Orellana)',
                          ESM: 'Esmeraldas',
                          UIO: 'Quito',
                          GYE: 'Guayaquil',
                          CUE: 'Cuenca'
                        };
                        setNewRouteData({
                          ...newRouteData,
                          destinationIata: val,
                          destinationCity: names[val] || val,
                          airportName: `Aeropuerto de ${names[val] || val} (${val})`
                        });
                      }}
                      style={{ width: '60%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold' }}
                    >
                      <option value="GPS">GPS - Galápagos</option>
                      <option value="SCY">SCY - San Cristóbal</option>
                      <option value="MEC">MEC - Manta</option>
                      <option value="LOH">LOH - Loja</option>
                      <option value="ETR">ETR - Santa Rosa</option>
                      <option value="OCC">OCC - Coca</option>
                      <option value="ESM">ESM - Esmeraldas</option>
                      <option value="UIO">UIO - Quito</option>
                      <option value="GYE">GYE - Guayaquil</option>
                      <option value="CUE">CUE - Cuenca</option>
                    </select>

                    <input
                      type="text"
                      maxLength={3}
                      placeholder="IATA"
                      value={newRouteData.destinationIata}
                      onChange={(e) => setNewRouteData({ ...newRouteData, destinationIata: e.target.value.toUpperCase() })}
                      style={{ width: '40%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Ciudad Destino
                  </label>
                  <input
                    type="text"
                    required
                    value={newRouteData.destinationCity}
                    onChange={(e) => setNewRouteData({ ...newRouteData, destinationCity: e.target.value })}
                    placeholder="ej: Galápagos (Baltra)"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Nombre del Aeropuerto
                  </label>
                  <input
                    type="text"
                    required
                    value={newRouteData.airportName}
                    onChange={(e) => setNewRouteData({ ...newRouteData, airportName: e.target.value })}
                    placeholder="ej: Aeropuerto Seymour de Baltra"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Parámetros Operativos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Duración Estimada (Minutos)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="240"
                    value={newRouteData.durationMinutes}
                    onChange={(e) => setNewRouteData({ ...newRouteData, durationMinutes: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Número de Vuelo Inicial
                  </label>
                  <input
                    type="text"
                    value={newRouteData.initialFlightNumber}
                    onChange={(e) => setNewRouteData({ ...newRouteData, initialFlightNumber: e.target.value })}
                    placeholder="ej: AC1701"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {/* Precios Solicitados por Clase */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                  💵 Configuración de Precios por Clase Tarifaria (USD)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                      🟢 Tarifa LIGHT (Total USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newRouteData.priceLight}
                      onChange={(e) => setNewRouteData({ ...newRouteData, priceLight: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>
                      🔵 Tarifa PLUS (Total USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newRouteData.pricePlus}
                      onChange={(e) => setNewRouteData({ ...newRouteData, pricePlus: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#7e22ce', marginBottom: '4px' }}>
                      🟣 Tarifa TOP (Total USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newRouteData.priceTop}
                      onChange={(e) => setNewRouteData({ ...newRouteData, priceTop: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateRouteModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingRoute}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: savingRoute ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                    opacity: savingRoute ? 0.7 : 1
                  }}
                >
                  {savingRoute ? 'Creando Ruta...' : '✓ Crear Ruta y Publicar Destino'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR RUTA Y PRECIOS                              */}
      {/* ========================================================= */}
      {showEditRouteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 25, 53, 0.7)',
          backdropFilter: 'blur(4px)',
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
            maxWidth: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              backgroundColor: 'var(--color-latam-navy)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  ✏️ Editar Ruta {editRouteData.routeKey}
                </h3>
                <span style={{ fontSize: '12px', color: '#9bb1c9' }}>
                  Ajusta los precios comerciales y duración de todos los vuelos de esta ruta.
                </span>
              </div>
              <button
                onClick={() => setShowEditRouteModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateRouteSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Ciudad Destino
                  </label>
                  <input
                    type="text"
                    required
                    value={editRouteData.destinationCity}
                    onChange={(e) => setEditRouteData({ ...editRouteData, destinationCity: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                    Duración (Minutos)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="240"
                    value={editRouteData.durationMinutes}
                    onChange={(e) => setEditRouteData({ ...editRouteData, durationMinutes: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                  Nombre del Aeropuerto
                </label>
                <input
                  type="text"
                  required
                  value={editRouteData.airportName}
                  onChange={(e) => setEditRouteData({ ...editRouteData, airportName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              {/* Precios Editables */}
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                  💵 Precios Actualizados por Clase Tarifaria (USD)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                      🟢 LIGHT (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editRouteData.priceLight}
                      onChange={(e) => setEditRouteData({ ...editRouteData, priceLight: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>
                      🔵 PLUS (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editRouteData.pricePlus}
                      onChange={(e) => setEditRouteData({ ...editRouteData, pricePlus: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#7e22ce', marginBottom: '4px' }}>
                      🟣 TOP (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editRouteData.priceTop}
                      onChange={(e) => setEditRouteData({ ...editRouteData, priceTop: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditRouteModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingRoute}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    backgroundColor: '#1d4ed8',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: savingRoute ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
                    opacity: savingRoute ? 0.7 : 1
                  }}
                >
                  {savingRoute ? 'Guardando...' : '✓ Guardar Cambios de Precios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
