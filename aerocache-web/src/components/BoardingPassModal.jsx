import React, { useState } from 'react';
import { X, Plane, Printer, QrCode, Download, CheckCircle, Users } from 'lucide-react';

export default function BoardingPassModal({ isOpen, onClose, booking, boardingPasses }) {
  const [activePaxIndex, setActivePaxIndex] = useState(0);

  if (!isOpen || !booking) return null;

  const passengers = booking.passengers || [];
  const safeIndex = (activePaxIndex >= 0 && activePaxIndex < passengers.length) ? activePaxIndex : 0;
  const pax = passengers[safeIndex] || passengers[0] || {};
  const bp = (boardingPasses && boardingPasses[safeIndex]) || (boardingPasses && boardingPasses[0]) || {};
  const itin = booking.itineraries?.[0];
  const seg = itin?.segments?.[0];

  const handleDownloadAll = () => {
    let fullText = `=== PASES DE ABORDAR ELECTRÓNICOS AEROCACHE ===\n`;
    fullText += `CÓDIGO DE RESERVA PNR: ${booking.pnr}\n`;
    fullText += `VUELO: ${seg?.flightNumber || 'AC1401'}\n`;
    fullText += `RUTA: ${seg?.departure?.iataCode || booking.originIata} -> ${seg?.arrival?.iataCode || booking.destinationIata}\n`;
    fullText += `TOTAL PASAJEROS: ${passengers.length}\n`;
    fullText += `--------------------------------------------------\n\n`;

    passengers.forEach((p, i) => {
      const pBp = (boardingPasses && boardingPasses[i]) || bp;
      const seat = pBp.seat || p.assignedSeatNumber || '14A';
      fullText += `PASAJERO ${i + 1}: ${p.firstName} ${p.lastName} (${p.passengerType === 'CHILD' ? 'Niño' : 'Adulto'})\n`;
      fullText += `DOCUMENTO: ${p.documentNumber}\n`;
      fullText += `ASIENTO: ${seat}\n`;
      fullText += `GRUPO DE ABORDAJE: ${pBp.boardingGroup || 'Grupo 2'}\n`;
      fullText += `ESTADO: CONFIRMADO / CHECK-IN COMPLETO\n\n`;
    });

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AEROCACHE-Pases-${booking.pnr}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
        maxWidth: '720px',
        maxHeight: '94vh',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
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
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Multi-Passenger Tab Switcher */}
        {passengers.length > 1 && (
          <div style={{
            backgroundColor: '#0a2540',
            padding: '10px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto'
          }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <Users size={14} color="var(--color-latam-coral)" />
              PASAJEROS ({passengers.length}):
            </span>
            {passengers.map((p, idx) => {
              const isActive = idx === safeIndex;
              const pBp = (boardingPasses && boardingPasses[idx]) || {};
              const seat = pBp.seat || p.assignedSeatNumber || '14A';
              const isChild = p.passengerType === 'CHILD';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePaxIndex(idx)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: isActive ? '2px solid var(--color-latam-coral)' : '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: isActive ? 'rgba(232, 17, 75, 0.2)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: isActive ? '700' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{isChild ? '🧒' : '👤'}</span>
                  <span>{p.firstName} {p.lastName}</span>
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: isActive ? 'var(--color-latam-coral)' : '#334155',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    {seat}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Boarding Pass Body (Airline Style) */}
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', flex: 1, overflowY: 'auto' }}>
          <div className="boarding-pass-cutout" style={{ border: '1px solid #cbd5e1', padding: '24px', backgroundColor: '#fff', borderRadius: '12px' }}>
            
            {/* Top Row: Origin -> Dest */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ORIGEN</span>
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
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>DESTINO</span>
                <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
                  {seg?.arrival?.iataCode || booking.destinationIata || 'GYE'}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>Terminal {seg?.arrival?.terminal || '1'}</div>
              </div>
            </div>

            {/* Middle Grid: Passenger, Seat, Gate, PNR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>PASAJERO</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                  {pax.lastName}, {pax.firstName}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  {pax.passengerType === 'CHILD' ? '🧒 Niño (2-11)' : '👤 Adulto'}
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
                <div style={{ fontSize: '12px', color: '#64748b' }}>Vuelo: <strong>{seg?.flightNumber || 'AC1401'}</strong> • Flota Airbus A320</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Fecha: <strong>{new Date(booking.createdAt).toLocaleDateString()}</strong></div>
                <div style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', marginTop: '4px' }}>✓ Check-in Confirmado y Asiento Bloqueado</div>
              </div>

              {/* Simulated 2D Barcode */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#000',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}>
                  <QrCode size={48} />
                </div>
                <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>{bp.barcodeType || 'QR'} CODE</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} color="#16a34a" />
            <span style={{ fontSize: '13px', color: '#475569' }}>
              Asiento: <strong style={{ color: 'var(--color-latam-coral)', fontSize: '16px' }}>{bp.seat || pax.assignedSeatNumber || '14A'}</strong>
              {passengers.length > 1 && <> ({safeIndex + 1} de {passengers.length} pasajeros)</>}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDownloadAll}
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
              <Download size={16} /> Guardar Todos los Pases (.txt)
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
