import React, { useState } from 'react';
import { Search, Calendar, Luggage, AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { getBookingByPnr, addBaggage, searchDateChange, confirmDateChange, getCancellationQuote, cancelBooking, performCheckIn, getSeatMap, changeSeat } from '../api';
import SeatMapModal from '../components/SeatMapModal';

export default function MyBookingsView({ onOpenBoardingPass }) {
  const [pnrInput, setPnrInput] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Post-sale modals state
  const [dateChangeOffer, setDateChangeOffer] = useState(null);
  const [cancellationQuote, setCancellationQuote] = useState(null);
  const [seatMapOpen, setSeatMapOpen] = useState(false);
  const [seatMapData, setSeatMapData] = useState(null);

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
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--color-latam-navy)', marginBottom: '8px' }}>
          Gestión de Reserva y Postventa
        </h1>
        <p style={{ color: '#64748b' }}>
          Consulta tu itinerario, agrega maletas, cambia fechas o cotiza cancelación usando tu código PNR.
        </p>
      </div>

      {/* PNR Search Form */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto 30px auto' }}>
        <input
          type="text"
          placeholder="Código de Reserva PNR (ej: AC9521X)"
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
            fontSize: '15px'
          }}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

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

      {/* Booking Details Card */}
      {booking && (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 8px 30px rgba(0, 25, 53, 0.08)', border: '1px solid #e2e8f0' }}>
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
