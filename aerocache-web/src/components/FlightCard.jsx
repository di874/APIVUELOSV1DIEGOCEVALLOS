import React, { useState } from 'react';
import { Plane, Luggage, Clock, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function FlightCard({ offer, onSelectFare, onOpenSeatMap }) {
  const [expanded, setExpanded] = useState(false);
  const itinerary = offer.itineraries?.[0];
  const segment = itinerary?.segments?.[0];

  if (!segment) return null;

  const depTime = new Date(segment.departure?.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const arrTime = new Date(segment.arrival?.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '14px',
      border: '1px solid #e1e8f0',
      marginBottom: '20px',
      boxShadow: '0 4px 16px rgba(0, 25, 53, 0.06)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        backgroundColor: '#fafbfc',
        borderBottom: '1px solid #edf2f7',
        fontSize: '13px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: 'var(--color-latam-navy)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
            {segment.flightNumber}
          </span>
          <span style={{ fontWeight: '600', color: '#1b2734' }}>Operado por AEROCACHE</span>
          <span style={{ color: 'var(--color-latam-text-muted)' }}>• {segment.aircraft || 'Airbus A320'}</span>
        </div>
        <button
          onClick={() => onOpenSeatMap(offer.offerId, segment.segmentId)}
          style={{
            background: 'transparent',
            color: 'var(--color-latam-coral)',
            fontWeight: '600',
            fontSize: '13px',
            textDecoration: 'underline'
          }}
        >
          Ver mapa de asientos
        </button>
      </div>

      {/* Flight Timing & Base Price Section */}
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {/* Departure */}
          <div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>{depTime}</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#4b5563' }}>{segment.departure?.iataCode}</div>
            <div style={{ fontSize: '12px', color: '#8898aa' }}>Terminal {segment.departure?.terminal || '1'}</div>
          </div>

          {/* Duration Graphic */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} /> {segment.durationMinutes || 50} min
            </span>
            <div style={{ width: '100%', height: '2px', backgroundColor: '#d1d5db', position: 'relative', margin: '8px 0' }}>
              <Plane size={14} color="var(--color-latam-coral)" style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)' }} />
            </div>
            <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', textTransform: 'uppercase' }}>Directo</span>
          </div>

          {/* Arrival */}
          <div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>{arrTime}</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#4b5563' }}>{segment.arrival?.iataCode}</div>
            <div style={{ fontSize: '12px', color: '#8898aa' }}>Terminal {segment.arrival?.terminal || '1'}</div>
          </div>
        </div>

        {/* Price & Expand trigger */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-latam-text-muted)' }}>Precio desde</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--color-latam-navy)' }}>
            <span style={{ fontSize: '18px', verticalAlign: 'top', marginRight: '2px' }}>$</span>
            {offer.grandTotal?.total}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginBottom: '8px' }}>Tasas e impuestos incluidos</div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              backgroundColor: expanded ? '#e5e7eb' : 'var(--color-latam-coral)',
              color: expanded ? '#1b2734' : '#fff',
              fontWeight: '700',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {expanded ? 'Ocultar tarifas' : 'Seleccionar tarifa'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable Cabin Fares (LATAM Style: Light, Plus, Top) */}
      {expanded && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}>
          {itinerary.pricingOptions?.map((pricing, idx) => {
            const isTop = pricing.fareBrand === 'Top';
            const isPlus = pricing.fareBrand === 'Plus';
            const price = pricing.pricePerPassengerType?.[0]?.price?.total || offer.grandTotal?.total;

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: isTop ? '2px solid var(--color-latam-coral)' : '1px solid #cbd5e1',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isTop ? '0 6px 20px rgba(232, 17, 75, 0.15)' : 'none',
                  position: 'relative'
                }}
              >
                {isTop && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--color-latam-coral)',
                    color: '#fff',
                    padding: '2px 14px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    letterSpacing: '1px'
                  }}>
                    RECOMENDADA
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-latam-navy)' }}>
                      {pricing.fareBrand}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
                      {pricing.cabinClass === 'PREMIUM_ECONOMY' ? 'Premium Economy' : 'Economy'}
                    </span>
                  </div>

                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-latam-navy)', marginBottom: '16px' }}>
                    ${price} <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#64748b' }}>USD</span>
                  </div>

                  {/* Benefit items list */}
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#334155' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={16} color="#059669" />
                      <span>Bolso o mochila pequeña (bajo asiento)</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: pricing.baggageAllowance?.carryOnIncluded ? '#334155' : '#94a3b8' }}>
                      <Check size={16} color={pricing.baggageAllowance?.carryOnIncluded ? '#059669' : '#cbd5e1'} />
                      <span>Equipaje de mano (10 kg)</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: pricing.baggageAllowance?.checkedBaggageIncluded ? '#334155' : '#94a3b8' }}>
                      <Check size={16} color={pricing.baggageAllowance?.checkedBaggageIncluded ? '#059669' : '#cbd5e1'} />
                      <span>{pricing.baggageAllowance?.checkedBaggageIncluded ? `${pricing.baggageAllowance.checkedBaggageIncluded} maleta en bodega (23 kg)` : 'Sin maleta en bodega'}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={16} color={pricing.fareRules?.isRefundable ? '#059669' : '#e11d48'} />
                      <span>{pricing.fareRules?.isRefundable ? 'Reembolso permitido' : 'Tarifa no reembolsable'}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Check size={16} color="#059669" />
                      <span>Cambios de fecha permitidos</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => onSelectFare({
                    offerId: offer.offerId,
                    itineraryId: itinerary.itineraryId,
                    cabinClass: pricing.cabinClass,
                    fareBrand: pricing.fareBrand,
                    price,
                    segment
                  })}
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: isTop ? 'var(--color-latam-coral)' : 'var(--color-latam-navy)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  Elegir {pricing.fareBrand}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
