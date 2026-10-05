import React, { useState, useEffect } from 'react';
import { X, Clock, ShieldCheck, CreditCard, CheckCircle } from 'lucide-react';
import { getHoldStatus, createBooking } from '../api';

export default function CheckoutModal({ isOpen, onClose, holdData, selectedFare, onBookingSuccess, onOpenSeatMap }) {
  const [timeLeft, setTimeLeft] = useState(900); // 15 min default
  const [formData, setFormData] = useState({
    firstName: 'Diego',
    lastName: 'Cevallos',
    documentType: 'NATIONAL_ID',
    documentNumber: '1751030295',
    birthDate: '1998-05-15',
    gender: 'M',
    email: 'diego.cevallos@gmail.com',
    phone: '+593991234567',
    assignedSeat: selectedFare?.selectedSeat || '14A'
  });
  const [paymentRef, setPaymentRef] = useState('PAY-LATAM-' + Math.floor(100000 + Math.random() * 900000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedFare?.selectedSeat) {
      setFormData(prev => ({ ...prev, assignedSeat: selectedFare.selectedSeat }));
    }
  }, [selectedFare?.selectedSeat]);

  useEffect(() => {
    if (!holdData?.holdId) return;

    // Timer countdown
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const booking = await createBooking(holdData.holdId, formData, paymentRef);
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
        maxWidth: '750px',
        maxHeight: '90vh',
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
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Tarifa {selectedFare?.fareBrand} • Vuelo {selectedFare?.segment?.flightNumber} ({selectedFare?.segment?.departure?.iataCode} ✈ {selectedFare?.segment?.arrival?.iataCode})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#64748b' }}>
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

          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '12px' }}>
            1. Datos del Pasajero
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Nombres</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Apellidos</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Tipo Documento</label>
              <select
                value={formData.documentType}
                onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
              >
                <option value="NATIONAL_ID">Cédula de Identidad</option>
                <option value="PASSPORT">Pasaporte</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Número Documento</label>
              <input
                type="text"
                required
                value={formData.documentNumber}
                onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Fecha Nacimiento</label>
              <input
                type="date"
                required
                value={formData.birthDate}
                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Correo Electrónico (para e-ticket)</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>Teléfono Móvil</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '12px' }}>
            2. Selección de Asiento en el Vuelo
          </h3>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-latam-navy)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '17px',
                boxShadow: '0 4px 10px rgba(0,25,53,0.2)'
              }}>
                {formData.assignedSeat || '14A'}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-latam-navy)' }}>
                  Asiento {formData.assignedSeat || '14A'} reservado
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Flota Airbus A320 • Asignado a {formData.firstName} {formData.lastName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const segId = selectedFare?.segment?.segmentId || `SEG-${selectedFare?.offerId?.replace('OFF-', '')}`;
                onOpenSeatMap(selectedFare?.offerId, segId);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#fff',
                border: '1.5px solid var(--color-latam-coral)',
                color: 'var(--color-latam-coral)',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              💺 Cambiar Asiento en el Mapa
            </button>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-latam-navy)', marginBottom: '12px' }}>
            3. Pago & Acreditación de Referencia
          </h3>
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="var(--color-latam-coral)" />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Referencia de Pago Acreditada (Payment Gateway)</span>
              </div>
              <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px' }}>
                APROBADO
              </span>
            </div>
            <input
              type="text"
              value={paymentRef}
              onChange={e => setPaymentRef(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
            />
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Conforme al contrato OpenAPI, la API recibe la referencia de pago gestionada por el dominio de pagos.
            </p>
          </div>

          {/* Pricing Summary */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total a pagar con impuestos (IVA 15%)</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                ${holdData.lockedPrice?.total} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>USD</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || timeLeft <= 0}
              style={{
                padding: '14px 32px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-latam-coral)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loading || timeLeft <= 0 ? 0.6 : 1
              }}
            >
              <CheckCircle size={20} />
              {loading ? 'Emitiendo billete...' : 'Confirmar y Emitir Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
