import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Luggage, AlertTriangle, CheckCircle, RefreshCw, 
  XCircle, Plane, Ticket, ArrowRight, User, ShieldCheck, ChevronRight, ArrowLeft 
} from 'lucide-react';
import { 
  getBookingByPnr, getBookingDetail, getMyBookings, addBaggage, 
  searchDateChange, confirmDateChange, getCancellationQuote, 
  cancelBooking, performCheckIn, getSeatMap, changeSeat 
} from '../api';
import SeatMapModal from '../components/SeatMapModal';

export default function MyBookingsView({ 
  onOpenBoardingPass, 
  currentUser, 
  onOpenAuthModal, 
  setActiveTab 
}) {
  const [pnrInput, setPnrInput] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // User-specific bookings list state
  const [userBookings, setUserBookings] = useState([]);
  const [loadingUserBookings, setLoadingUserBookings] = useState(false);
  const [userBookingsError, setUserBookingsError] = useState(null);

  // Post-sale modals state
  const [dateChangeOffer, setDateChangeOffer] = useState(null);
  const [cancellationQuote, setCancellationQuote] = useState(null);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapData, setSeatMapData] = useState(null);

  // Load bookings for current buyer
  const loadUserBookings = async () => {
    if (!currentUser?.email) {
      setUserBookings([]);
      return;
    }
    setLoadingUserBookings(true);
    setUserBookingsError(null);
    try {
      const items = await getMyBookings(currentUser.email);

      // Check localStorage for any recent session PNRs
      const localKey = `aerocache_user_bookings_${currentUser.email.trim().toLowerCase()}`;
      const localPnrs = JSON.parse(localStorage.getItem(localKey) || '[]');
      const existingPnrs = new Set((items || []).map(b => (b.pnr || '').toUpperCase()));
      const missingPnrs = localPnrs.filter(p => !existingPnrs.has((p || '').toUpperCase()));

      if (missingPnrs.length > 0) {
        const extraItems = await Promise.all(
          missingPnrs.map(async p => {
            try {
              const det = await getBookingByPnr(p);
              const p0 = det.passengers?.[0];
              const seg0 = det.itineraries?.[0]?.segments?.[0];
              return {
                bookingId: det.bookingId,
                pnr: det.pnr,
                status: det.status,
                origin: seg0?.departure?.iataCode || 'UIO',
                destination: seg0?.arrival?.iataCode || 'GYE',
                departureDate: seg0?.departure?.at ? seg0.departure.at.split('T')[0] : '',
                flightNumber: seg0?.flightNumber,
                passengerName: p0 ? `${p0.firstName || ''} ${p0.lastName || ''}`.trim() : null,
                contactEmail: p0?.contact?.email,
                grandTotal: det.grandTotal
              };
            } catch {
              return null;
            }
          })
        );
        items.unshift(...extraItems.filter(Boolean));
      }

      setUserBookings(items || []);
    } catch (err) {
      console.error('Error al cargar vuelos del usuario:', err);
      setUserBookingsError(err.message);
    } finally {
      setLoadingUserBookings(false);
    }
  };

  useEffect(() => {
    loadUserBookings();
  }, [currentUser]);

  const handleSelectBooking = async (b) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let detail = null;
      if (b.bookingId) {
        try {
          detail = await getBookingDetail(b.bookingId);
        } catch {
          // fallback to PNR
        }
      }
      if (!detail && b.pnr) {
        detail = await getBookingByPnr(b.pnr);
      }
      if (detail) {
        setBooking(detail);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      } else {
        throw new Error('No se pudo obtener el detalle de la reserva');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSeatChange = async () => {
    if (!booking) return;
    setLoading(true);
    setError(null);
    try {
      const segId = booking.itineraries?.[0]?.segments?.[0]?.segmentId || 'SEG-1';
      const flightId = booking.itineraries?.[0]?.itineraryId ? booking.itineraries[0].itineraryId.replace('ITIN-', '') : '';
      const data = await getSeatMap(`OFF-${flightId}`, segId);
      setSeatMapData(data);
      setSeatMapOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSeatChange = async (newSeat) => {
    if (!booking || !newSeat) return;
    setLoading(true);
    try {
      const pax = booking.passengers?.[0];
      await changeSeat(booking.bookingId, newSeat, pax?.passengerId);
      const updated = await getBookingByPnr(booking.pnr);
      setBooking(updated);
      setSeatMapOpen(false);
      setSuccessMsg(`¡Asiento actualizado exitosamente a ${newSeat}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pnrInput.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await getBookingByPnr(pnrInput.trim().toUpperCase());
      setBooking(data);
    } catch (err) {
      setError(err.message);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBag = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const pax = booking.passengers?.[0];
      await addBaggage(booking.bookingId, pax?.passengerId, booking.itineraries?.[0]?.itineraryId, 1);
      const updated = await getBookingByPnr(booking.pnr);
      setBooking(updated);
      setSuccessMsg('¡Maleta adicional de 23 kg agregada correctamente!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDateChange = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const res = await searchDateChange(booking.bookingId, booking.itineraries?.[0]?.itineraryId, nextWeek.toISOString().split('T')[0]);
      setDateChangeOffer(res[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDateChange = async () => {
    if (!dateChangeOffer) return;
    setLoading(true);
    try {
      const updated = await confirmDateChange(booking.bookingId, dateChangeOffer.changeOfferId);
      setBooking(updated);
      setDateChangeOffer(null);
      setSuccessMsg('¡Cambio de fecha confirmado y billete reemitido!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteCancel = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const quote = await getCancellationQuote(booking.bookingId);
      setCancellationQuote(quote);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellationQuote) return;
    setLoading(true);
    try {
      await cancelBooking(booking.bookingId, cancellationQuote.quoteId, 'Solicitud de usuario');
      const updated = await getBookingByPnr(booking.pnr);
      setBooking(updated);
      setCancellationQuote(null);
      setSuccessMsg('Reserva cancelada exitosamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      await performCheckIn(booking.bookingId);
      const updated = await getBookingByPnr(booking.pnr);
      setBooking(updated);
      setSuccessMsg('¡Check-in realizado! Ya puedes ver tu pase de abordar.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
      
      {/* Top Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <span style={{ 
          backgroundColor: 'rgba(232, 17, 75, 0.1)', 
          color: '#e8114b', 
          padding: '4px 14px', 
          borderRadius: '20px', 
          fontSize: '12px', 
          fontWeight: 'bold' 
        }}>
          GESTIÓN DE VIAJES Y POSTVENTA
        </span>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-latam-navy)', marginTop: '8px', marginBottom: '6px' }}>
          {currentUser ? `Mis Vuelos — ${currentUser.nombre}` : 'Mis Viajes y Check-in'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
          {currentUser 
            ? `Consulta tus vuelos comprados con tu cuenta (${currentUser.email}), cambia asientos, agrega maletas o realiza check-in.`
            : 'Consulta tu itinerario, agrega maletas, cambia fechas o cotiza cancelación usando tu código PNR.'}
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '14px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Guest Banner if not logged in */}
      {!currentUser && !booking && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '18px 24px',
          marginBottom: '26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
              <User size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#1e3a8a', fontSize: '15px' }}>
                ¿Tienes una cuenta registrada en AEROCACHE?
              </div>
              <div style={{ fontSize: '13px', color: '#3b82f6' }}>
                Inicia sesión para ver automáticamente todos tus vuelos comprados sin tener que recordar el código PNR.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAuthModal}
            style={{
              padding: '9px 18px',
              backgroundColor: '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Iniciar Sesión / Registrarme
          </button>
        </div>
      )}

      {/* SECTION 1: LOGGED IN USER'S PURCHASED FLIGHTS (ONLY IF NO SPECIFIC BOOKING OPEN) */}
      {currentUser && !booking && (
        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-latam-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plane size={20} color="var(--color-latam-coral)" /> Vuelos Comprados en tu Cuenta
            </h2>
            <button
              onClick={loadUserBookings}
              disabled={loadingUserBookings}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '12px',
                fontWeight: '600',
                border: '1px solid #cbd5e1',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} className={loadingUserBookings ? 'spin-animation' : ''} />
              {loadingUserBookings ? 'Actualizando...' : 'Actualizar mis vuelos'}
            </button>
          </div>

          {loadingUserBookings ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--color-latam-coral)', margin: '0 auto 10px auto' }} />
              <p style={{ color: '#64748b', fontSize: '14px' }}>Cargando tus vuelos reservados...</p>
            </div>
          ) : userBookings.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: '#fff',
              borderRadius: '14px',
              border: '1px dashed #cbd5e1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: '#94a3b8' }}>
                <Calendar size={26} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '6px' }}>
                Aún no tienes vuelos reservados con {currentUser.email}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '450px', margin: '0 auto 18px auto' }}>
                Cuando compres un vuelo nacional en Ecuador (Quito, Guayaquil, Cuenca, Galápagos), se guardará automáticamente en este panel.
              </p>
              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('search')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-latam-coral)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Buscar y Comprar Vuelos Ahora
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {userBookings.map((b, idx) => {
                const isConfirmed = b.status === 'CONFIRMED';
                const isCheckedIn = b.status === 'CHECKED_IN';
                return (
                  <div
                    key={b.pnr || b.bookingId || idx}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 16px rgba(0, 25, 53, 0.05)',
                      padding: '18px 22px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-latam-navy)'
                      }}>
                        <Plane size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            fontSize: '14px',
                            color: '#e8114b',
                            backgroundColor: '#fef2f2',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca'
                          }}>
                            PNR: {b.pnr}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: isConfirmed ? '#dcfce7' : isCheckedIn ? '#e0f2fe' : '#fee2e2',
                            color: isConfirmed ? '#15803d' : isCheckedIn ? '#0369a1' : '#b91c1c'
                          }}>
                            {b.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-latam-navy)', marginTop: '4px' }}>
                          {b.origin || 'UIO'} ➔ {b.destination || 'GYE'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {b.passengerName && <span>Pasajero: <strong>{b.passengerName}</strong> • </span>}
                          {b.departureDate && <span>Salida: <strong>{b.departureDate}</strong> • </span>}
                          <span>Total: <strong>${b.grandTotal?.total || '0.00'} {b.grandTotal?.currency || 'USD'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleSelectBooking(b)}
                        disabled={loading}
                        style={{
                          padding: '9px 16px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--color-latam-navy)',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        Gestionar Vuelo <ChevronRight size={14} />
                      </button>
                      
                      {onOpenBoardingPass && (
                        <button
                          onClick={async () => {
                            try {
                              const detail = await getBookingDetail(b.bookingId);
                              onOpenBoardingPass(detail);
                            } catch {
                              const detail = await getBookingByPnr(b.pnr);
                              onOpenBoardingPass(detail);
                            }
                          }}
                          style={{
                            padding: '9px 16px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--color-latam-coral)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '700',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Ticket size={14} /> Pase de Abordar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MANUAL PNR SEARCH FORM */}
      {!booking && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
          marginBottom: '30px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '8px' }}>
            {currentUser ? '¿Deseas consultar otra reserva por código PNR?' : 'Consulta tu reserva con tu código PNR'}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Ingresa el código alfanumérico de 6 caracteres que recibiste al comprar (ejemplo: <strong>AC9521X</strong>).
          </p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Código PNR (ej: AC9521X)"
              value={pnrInput}
              onChange={e => setPnrInput(e.target.value)}
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
              {loading ? 'Buscando...' : 'Buscar Reserva'}
            </button>
          </form>
        </div>
      )}

      {/* Booking Details Card */}
      {booking && (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 8px 30px rgba(0, 25, 53, 0.08)', border: '1px solid #e2e8f0' }}>
          
          {/* Back button to list */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => { setBooking(null); setError(null); setSuccessMsg(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Volver a la lista de mis vuelos
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Código de Reserva (PNR)</span>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--color-latam-coral)', letterSpacing: '1px' }}>
                {booking.pnr}
              </div>
            </div>
            <span style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 'bold',
              backgroundColor: booking.status === 'CONFIRMED' ? '#dcfce7' : (booking.status === 'CANCELLED' ? '#fee2e2' : '#fef9c3'),
              color: booking.status === 'CONFIRMED' ? '#15803d' : (booking.status === 'CANCELLED' ? '#b91c1c' : '#854d0e')
            }}>
              {booking.status}
            </span>
          </div>

          {/* Flight Details */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '8px' }}>
              Vuelo {booking.itineraries?.[0]?.segments?.[0]?.flightNumber || 'AC1401'} • {booking.originIata} ✈ {booking.destinationIata}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Pasajero: <strong>{booking.passengers?.[0]?.lastName}, {booking.passengers?.[0]?.firstName}</strong>
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Asiento asignado: <strong style={{ color: 'var(--color-latam-coral)', fontSize: '14px', backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fecaca' }}>{booking.passengers?.[0]?.assignedSeats?.[0]?.seatNumber || '14A'}</strong>
              </span>
              {booking.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={handleOpenSeatChange}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    border: '1px solid var(--color-latam-coral)',
                    color: 'var(--color-latam-coral)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💺 Cambiar Asiento
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Maletas en bodega compradas: <strong>{booking.passengers?.[0]?.extraBaggage?.[0]?.quantity || 0}</strong>
            </p>
          </div>

          {/* Post-Sale Actions Bar */}
          {booking.status !== 'CANCELLED' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={handleCheckIn}
                style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#001935', color: '#fff', fontWeight: '700', fontSize: '13px' }}
              >
                ✓ Hacer Check-in
              </button>

              <button
                onClick={() => onOpenBoardingPass(booking)}
                style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0284c7', color: '#fff', fontWeight: '700', fontSize: '13px' }}
              >
                Pase de Abordar
              </button>

              <button
                onClick={handleAddBag}
                style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <Luggage size={14} /> +1 Maleta ($20)
              </button>

              <button
                onClick={handleSearchDateChange}
                style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <RefreshCw size={14} /> Cambiar Fecha
              </button>
            </div>
          )}

          {/* Cancellation section */}
          {booking.status !== 'CANCELLED' && (
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={handleQuoteCancel}
                style={{ background: 'transparent', color: '#b91c1c', fontSize: '13px', fontWeight: '600', textDecoration: 'underline' }}
              >
                Cotizar cancelación y reembolso
              </button>
            </div>
          )}

          {/* Date Change Offer Preview */}
          {dateChangeOffer && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <h4 style={{ fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>Disponibilidad de Cambio de Fecha:</h4>
              <p style={{ fontSize: '13px', color: '#1e3a8a' }}>
                Diferencia de Tarifa: ${dateChangeOffer.priceDifference?.fareDifference} • Cargo de Cambio: ${dateChangeOffer.priceDifference?.changeFee}
              </p>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', marginTop: '6px' }}>
                Total a pagar: ${dateChangeOffer.priceDifference?.totalToPay} USD
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleConfirmDateChange} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                  Aceptar y Confirmar Cambio
                </button>
                <button onClick={() => setDateChangeOffer(null)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '13px' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Cancellation Quote Preview */}
          {cancellationQuote && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <h4 style={{ fontWeight: 'bold', color: '#b91c1c', marginBottom: '8px' }}>Cotización de Cancelación:</h4>
              <p style={{ fontSize: '13px', color: '#991b1b' }}>
                Monto de Reembolso Acreditado: <strong>${cancellationQuote.refundAmount} USD</strong> (Penalidad: ${cancellationQuote.penaltyAmount} USD)
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleConfirmCancel} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#dc2626', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                  Confirmar Cancelación de Reserva
                </button>
                <button onClick={() => setCancellationQuote(null)} style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '13px' }}>
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seat Map Modal for Post-Sale Seat Change */}
      <SeatMapModal
        isOpen={seatMapOpen}
        onClose={() => setSeatMapOpen(false)}
        seatMapData={seatMapData}
        onSelectSeat={handleConfirmSeatChange}
        selectedSeat={booking?.passengers?.[0]?.assignedSeats?.[0]?.seatNumber}
      />
    </div>
  );
}
