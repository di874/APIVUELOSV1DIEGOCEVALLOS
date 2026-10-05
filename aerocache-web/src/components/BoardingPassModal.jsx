import React from 'react';
import { X, Plane, Printer, QrCode, Download, CheckCircle } from 'lucide-react';

export default function BoardingPassModal({ isOpen, onClose, booking, boardingPasses }) {
  if (!isOpen || !booking) return null;

  const bp = boardingPasses?.[0] || {};
  const pax = booking.passengers?.[0] || {};
  const itin = booking.itineraries?.[0];
  const seg = itin?.segments?.[0];

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
        maxWidth: '680px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'var(--color-latam-navy)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plane size={20} color="var(--color-latam-coral)" />
            <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '1px' }}>
              AEROCACHE • Pase de Abordar Digital
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff' }}>
            <X size={22} />
          </button>
        </div>

        {/* Boarding Pass Body (Airline Style) */}
        <div style={{ padding: '28px', backgroundColor: '#f8fafc' }}>
          <div className="boarding-pass-cutout" style={{ border: '1px solid #cbd5e1', padding: '24px' }}>
            
            {/* Top Row: Origin -> Dest */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ORIGEN</span>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                  {seg?.departure?.iataCode || booking.originIata || 'UIO'}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Terminal {seg?.departure?.terminal || '1'}</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Plane size={28} color="var(--color-latam-coral)" />
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>VUELO DIRECTO</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>DESTINO</span>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                  {seg?.arrival?.iataCode || booking.destinationIata || 'GYE'}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Terminal {seg?.arrival?.terminal || '1'}</div>
              </div>
            </div>

            {/* Middle Grid: Passenger, Seat, Gate, PNR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>PASAJERO</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  {pax.lastName}, {pax.firstName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ASIENTO</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-latam-coral)' }}>
                  {bp.seat || pax.assignedSeatNumber || '14A'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>GRUPO</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  {bp.boardingGroup || 'Grupo 2'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>CÓDIGO PNR</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--color-latam-navy)', letterSpacing: '1px' }}>
                  {booking.pnr}
                </div>
              </div>
            </div>

            {/* Flight info & Barcode */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Vuelo: <strong>{seg?.flightNumber || 'AC1401'}</strong> • Operado por AEROCACHE</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Fecha: <strong>{new Date(booking.createdAt).toLocaleDateString()}</strong></div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', marginTop: '4px' }}>✓ Check-in Confirmado</div>
              </div>

              {/* Simulated 2D Barcode */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  backgroundColor: '#000',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}>
                  <QrCode size={52} />
                </div>
                <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{bp.barcodeType || 'QR'} CODE</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="#16a34a" />
            <span style={{ fontSize: '13px', color: '#475569' }}>
              Asiento Asignado: <strong style={{ color: 'var(--color-latam-coral)', fontSize: '16px' }}>{bp.seat || pax.assignedSeatNumber || '14A'}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                // Save digital ticket confirmation
                const ticketText = `PASE DE ABORDAR AEROCACHE\nPNR: ${booking.pnr}\nPasajero: ${pax.firstName} ${pax.lastName}\nDocumento: ${pax.documentNumber}\nVuelo: ${seg?.flightNumber || 'AC1401'}\nRuta: ${seg?.departure?.iataCode || booking.originIata} -> ${seg?.arrival?.iataCode || booking.destinationIata}\nAsiento: ${bp.seat || pax.assignedSeatNumber || '14A'}\nGrupo: ${bp.boardingGroup || 'Grupo 2'}\nEstado: CHECKED_IN`;
                const blob = new Blob([ticketText], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `AEROCACHE-Pase-${booking.pnr}-${bp.seat || '14A'}.txt`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#001935',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Download size={16} /> Guardar Pase Digital
            </button>

            <button
              onClick={() => window.print()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-latam-coral)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Printer size={16} /> Imprimir Pase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
