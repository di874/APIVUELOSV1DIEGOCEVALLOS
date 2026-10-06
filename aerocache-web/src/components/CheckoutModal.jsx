import React, { useState, useEffect } from 'react';
import { X, Clock, ShieldCheck, CreditCard, CheckCircle, Users, User, Baby } from 'lucide-react';
import { createBooking } from '../api';

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  holdData, 
  selectedFare, 
  passengerList,
  assignedSeatsMap,
  onBookingSuccess, 
  onOpenSeatMap 
}) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 min default
  const [contactEmail, setContactEmail] = useState('diego.cevallos@gmail.com');
  const [contactPhone, setContactPhone] = useState('+593991234567');
  const [paymentRef, setPaymentRef] = useState('PAY-LATAM-' + Math.floor(100000 + Math.random() * 900000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const effectivePaxList = Array.isArray(passengerList) && passengerList.length > 0 
    ? passengerList 
    : [{ id: 'pax-1', index: 1, type: 'ADULT', label: 'Pasajero 1 (Adulto)' }];

  const [passengersData, setPassengersData] = useState([]);

  // Initialize or update passengers list
  useEffect(() => {
    if (isOpen) {
      const seatsMap = assignedSeatsMap || selectedFare?.assignedSeatsMap || {};
      const initial = effectivePaxList.map((pax, idx) => {
        const isChild = pax.type === 'CHILD';
        const assignedSeat = seatsMap[pax.id] || (idx === 0 ? selectedFare?.selectedSeat : '') || (14 + idx) + 'A';

        // Prepopulate default sensible names
        let defaultFirstName = 'Diego';
        let defaultLastName = 'Cevallos';
        let defaultDocNum = '1751030295';
        let defaultBirth = '1998-05-15';

        if (idx === 1) {
          defaultFirstName = isChild ? 'Mateo' : 'Andrea';
          defaultLastName = 'Cevallos';
          defaultDocNum = isChild ? '1728491823' : '1719284736';
          defaultBirth = isChild ? '2017-08-20' : '1999-10-12';
        } else if (idx > 1) {
          defaultFirstName = isChild ? `Hijo${idx}` : `Pasajero${idx}`;
          defaultLastName = 'Cevallos';
          defaultDocNum = '17' + Math.floor(10000000 + Math.random() * 90000000);
          defaultBirth = isChild ? '2018-03-10' : '1996-02-14';
        }

        return {
          id: pax.id,
          index: pax.index,
          passengerType: pax.type,
          firstName: defaultFirstName,
          lastName: defaultLastName,
          documentType: 'NATIONAL_ID',
          documentNumber: defaultDocNum,
          birthDate: defaultBirth,
          gender: 'M',
          assignedSeat
        };
      });
      setPassengersData(initial);
    }
  }, [isOpen, passengerList, assignedSeatsMap, selectedFare]);

  // Sync assigned seat changes if updated from seat map
  useEffect(() => {
    if (assignedSeatsMap && Object.keys(assignedSeatsMap).length > 0) {
      setPassengersData(prev => prev.map(p => ({
        ...p,
        assignedSeat: assignedSeatsMap[p.id] || p.assignedSeat
      })));
    } else if (selectedFare?.selectedSeat) {
      setPassengersData(prev => prev.map((p, idx) => idx === 0 ? { ...p, assignedSeat: selectedFare.selectedSeat } : p));
    }
  }, [assignedSeatsMap, selectedFare?.selectedSeat]);

  // Hold Countdown Timer
  useEffect(() => {
    if (!holdData?.holdId) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [holdData]);

  if (!isOpen || !holdData) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const updatePassenger = (index, field, value) => {
    setPassengersData(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const bookingPayload = {
        passengers: passengersData.map(p => ({
          ...p,
          contact: {
            email: contactEmail,
            phone: contactPhone
          }
        })),
        contactEmail,
        contactPhone
      };
      const booking = await createBooking(holdData.holdId, bookingPayload, paymentRef);
      onBookingSuccess(booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Hold Timer Banner */}
        <div style={{
          backgroundColor: timeLeft > 120 ? '#001935' : '#b91c1c',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--color-latam-coral)" />
            <span>Tarifa congelada por <strong>AEROCACHE Hold System</strong>:</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '1px' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
              Finalizar Reserva y Emisión de Billete
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Tarifa <strong>{selectedFare?.fareBrand}</strong> • Vuelo {selectedFare?.segment?.flightNumber} ({selectedFare?.segment?.departure?.iataCode} ✈ {selectedFare?.segment?.arrival?.iataCode}) • {passengersData.length} {passengersData.length === 1 ? 'Pasajero' : 'Pasajeros'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Section 1: Passenger Cards */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-latam-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={18} color="var(--color-latam-coral)" />
                1. Datos de los Pasajeros ({passengersData.length})
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Requerido para emisión de billete electrónico
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {passengersData.map((pax, idx) => {
                const isChild = pax.passengerType === 'CHILD';

                return (
                  <div
                    key={pax.id || idx}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      backgroundColor: '#fafbfc',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Passenger Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          color: '#fff',
                          backgroundColor: 'var(--color-latam-navy)',
                          padding: '3px 10px',
                          borderRadius: '6px'
                        }}>
                          {isChild ? '🧒 Niño (2-11 años)' : '👤 Adulto'} • Pasajero {idx + 1}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                          {pax.firstName} {pax.lastName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Asiento:</span>
                        <strong style={{
                          fontSize: '13px',
                          color: '#fff',
                          backgroundColor: 'var(--color-latam-coral)',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {pax.assignedSeat || '14A'}
                        </strong>
                      </div>
                    </div>

                    {/* Passenger Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Nombres</label>
                        <input
                          type="text"
                          required
                          value={pax.firstName}
                          onChange={e => updatePassenger(idx, 'firstName', e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Apellidos</label>
                        <input
                          type="text"
                          required
                          value={pax.lastName}
                          onChange={e => updatePassenger(idx, 'lastName', e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Documento</label>
                        <select
                          value={pax.documentType}
                          onChange={e => updatePassenger(idx, 'documentType', e.target.value)}
                          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="NATIONAL_ID">Cédula</option>
                          <option value="PASSPORT">Pasaporte</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Número Doc.</label>
                        <input
                          type="text"
                          required
                          value={pax.documentNumber}
                          onChange={e => updatePassenger(idx, 'documentNumber', e.target.value)}
                          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Nacimiento</label>
                        <input
                          type="date"
                          required
                          value={pax.birthDate}
                          onChange={e => updatePassenger(idx, 'birthDate', e.target.value)}
                          style={{ width: '100%', padding: '9px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Género</label>
                        <select
                          value={pax.gender}
                          onChange={e => updatePassenger(idx, 'gender', e.target.value)}
                          style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="M">Masc.</option>
                          <option value="F">Fem.</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Shared Contact Information */}
          <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '10px' }}>
              2. Datos de Contacto para Envío de Billetes
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Correo Electrónico (E-Ticket y Pase)</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Teléfono Móvil (SMS)</label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Seat Assignment Summary */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-latam-navy)' }}>
                Asientos Asignados ({passengersData.map(p => p.assignedSeat).join(', ')})
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Flota Airbus A320 • Todos los pasajeros cuentan con asiento reservado y confirmado
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const segId = selectedFare?.segment?.segmentId || `SEG-${selectedFare?.offerId?.replace('OFF-', '')}`;
                onOpenSeatMap(selectedFare?.offerId, segId);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: '#fff',
                border: '1.5px solid var(--color-latam-coral)',
                color: 'var(--color-latam-coral)',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              💺 Modificar en el Mapa
            </button>
          </div>

          {/* Section 4: Payment Simulation */}
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '10px' }}>
            3. Pago & Acreditación de Referencia
          </h3>
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="var(--color-latam-coral)" />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Referencia de Pago Bancario / Pasarela</span>
              </div>
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                APROBADO
              </span>
            </div>
            <input
              type="text"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
            />
          </div>

          {/* Pricing Summary & Submit */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total a pagar con impuestos ({passengersData.length} pax, IVA 15%)</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                ${holdData.lockedPrice?.total} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>USD</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || timeLeft <= 0}
              style={{
                padding: '14px 28px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-latam-coral)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                cursor: loading || timeLeft <= 0 ? 'not-allowed' : 'pointer',
                opacity: loading || timeLeft <= 0 ? 0.6 : 1
              }}
            >
              <CheckCircle size={18} />
              {loading ? 'Emitiendo billetes...' : `Confirmar y Emitir Reserva (${passengersData.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
