import React, { useState } from 'react';
import { 
  Server, Radio, Send, RefreshCw, CheckCircle, AlertTriangle, 
  ExternalLink, Code, Layers, ShieldCheck, Box, Terminal, ArrowRight, Zap, Play
} from 'lucide-react';
import { invokeSoapPostSale, SOAP_POSTSALE_URL, SOAP_POSTSALE_WSDL } from '../api';

export default function SoapAndEventsDashboard({ recentBookings = [] }) {
  const [selectedOperation, setSelectedOperation] = useState('GetPostSaleSummary');
  const [pnrInput, setPnrInput] = useState(recentBookings?.[0]?.pnr || 'AC5222X');
  const [baggagePieces, setBaggagePieces] = useState(1);
  const [cancellationReason, setCancellationReason] = useState('Solicitud del cliente por cambio de planes');
  const [targetFlightNumber, setTargetFlightNumber] = useState('AC1403');
  const [targetFlightDate, setTargetFlightDate] = useState('2026-10-30T10:00:00Z');
  const [changeOfferId, setChangeOfferId] = useState('');
  const [newSeatNumber, setNewSeatNumber] = useState('14C');

  const [loading, setLoading] = useState(false);
  const [soapResult, setSoapResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [eventHistory, setEventHistory] = useState([
    {
      time: new Date().toLocaleTimeString(),
      routingKey: 'booking.confirmed',
      exchange: 'aerocache.events',
      summary: 'Reserva inicial confirmada via REST Booking Engine',
      consumer: 'MS.G.Webhooks (aerocache.webhooks.queue)'
    }
  ]);

  // Generate XML Request based on selected operation
  const generateXmlBody = () => {
    const cleanPnr = (pnrInput || '').trim().toUpperCase();

    switch (selectedOperation) {
      case 'GetPostSaleSummary':
        return `<posts:GetPostSaleSummary>
      <posts:request>
        <posts:Pnr>${cleanPnr}</posts:Pnr>
      </posts:request>
    </posts:GetPostSaleSummary>`;

      case 'AddBaggage':
        return `<posts:AddBaggage>
      <posts:request>
        <posts:Pnr>${cleanPnr}</posts:Pnr>
        <posts:PiecesToAdd>${baggagePieces}</posts:PiecesToAdd>
        <posts:PassengerIndex>0</posts:PassengerIndex>
      </posts:request>
    </posts:AddBaggage>`;

      case 'QuoteCancellation':
        return `<posts:QuoteCancellation>
      <posts:request>
        <posts:Pnr>${cleanPnr}</posts:Pnr>
        <posts:Reason>${cancellationReason}</posts:Reason>
      </posts:request>
    </posts:QuoteCancellation>`;

      case 'CancelBooking':
        return `<posts:CancelBooking>
      <posts:request>
        <posts:Pnr>${cleanPnr}</posts:Pnr>
        <posts:Reason>${cancellationReason}</posts:Reason>
      </posts:request>
    </posts:CancelBooking>`;

      case 'QuoteReschedule':
        return `<posts:QuoteReschedule>
      <posts:request>
        <posts:Pnr>${cleanPnr}</posts:Pnr>
        <posts:TargetFlightNumber>${targetFlightNumber}</posts:TargetFlightNumber>
        <posts:NewDepartureDate>${targetFlightDate}</posts:NewDepartureDate>
      </posts:request>
    </posts:QuoteReschedule>`;

      case 'RescheduleBooking':
        return `<posts:RescheduleBooking>
      <posts:request>
        <posts:Pnr>${cleanPnr}</posts:Pnr>
        <posts:ChangeOfferId>${changeOfferId || 'OFFER-PREVIEW'}</posts:ChangeOfferId>
        <posts:TargetFlightNumber>${targetFlightNumber}</posts:TargetFlightNumber>
        <posts:NewSeatNumber>${newSeatNumber}</posts:NewSeatNumber>
      </posts:request>
    </posts:RescheduleBooking>`;

      default:
        return '';
    }
  };

  const handleSendSoap = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSoapResult(null);

    try {
      const xmlBody = generateXmlBody();
      const res = await invokeSoapPostSale(selectedOperation, xmlBody);
      setSoapResult(res);

      // Track simulated event in UI if operation produces an event
      let generatedEvent = null;
      if (selectedOperation === 'AddBaggage') {
        generatedEvent = {
          time: new Date().toLocaleTimeString(),
          routingKey: 'booking.baggage_added',
          exchange: 'aerocache.events',
          summary: `Se agregaron ${baggagePieces} maleta(s) al PNR ${pnrInput.trim().toUpperCase()}`,
          consumer: 'MS.G.Webhooks (aerocache.webhooks.queue)'
        };
      } else if (selectedOperation === 'CancelBooking') {
        generatedEvent = {
          time: new Date().toLocaleTimeString(),
          routingKey: 'booking.cancelled',
          exchange: 'aerocache.events',
          summary: `Cancelación y reembolso de reserva PNR ${pnrInput.trim().toUpperCase()}`,
          consumer: 'MS.G.Webhooks (aerocache.webhooks.queue)'
        };
      } else if (selectedOperation === 'RescheduleBooking') {
        generatedEvent = {
          time: new Date().toLocaleTimeString(),
          routingKey: 'booking.rescheduled',
          exchange: 'aerocache.events',
          summary: `Reprogramación de vuelo para PNR ${pnrInput.trim().toUpperCase()}`,
          consumer: 'MS.G.Webhooks (aerocache.webhooks.queue)'
        };
      }

      if (generatedEvent) {
        setEventHistory(prev => [generatedEvent, ...prev]);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al ejecutar petición SOAP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Microservice Architecture Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '24px',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}>
                FASE 2 • ARQUITECTURA DISTRIBUIDA
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                ● En Línea & Conectado
              </span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
              Microservicio SOAP (MS.G.PostSale) & Bus RabbitMQ
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, maxWidth: '750px', lineHeight: '1.5' }}>
              Implementación formal de la arquitectura de microservicios: contrato WSDL para gestión de post-venta 
              (cambios, maletas, cancelaciones) y mensajería orientada a eventos con RabbitMQ Topic Exchange <code>aerocache.events</code> hacia el microservicio despachador de webhooks <code>MS.G.Webhooks</code>.
            </p>
          </div>

          {/* Quick links to WSDL & RabbitMQ UI */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={SOAP_POSTSALE_WSDL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} />
              Ver WSDL (XML Contract)
            </a>

            <a
              href="http://localhost:15672"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(249, 115, 22, 0.15)',
                color: '#fdba74',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              <Box size={14} />
              RabbitMQ Manager (:15672)
            </a>
          </div>
        </div>

        {/* Microservices flow badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: '700', fontSize: '13px' }}>
              <Server size={16} /> 1. Contrato SOAP WSDL
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              Endpoint: <code>/services/postsale.asmx</code><br />
              Namespace: <code>http://aerocache.ec/services/postsale</code>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: '700', fontSize: '13px' }}>
              <Radio size={16} /> 2. RabbitMQ Topic Exchange
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              Exchange: <code>aerocache.events</code> (amq.topic)<br />
              Puerto AMQP: <code>5672</code> (RabbitMQ v3.13)
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: '700', fontSize: '13px' }}>
              <Zap size={16} /> 3. Consumidor MS.G.Webhooks
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
              Cola: <code>aerocache.webhooks.queue</code><br />
              Routing Keys: <code>booking.*</code>, <code>flight.*</code>, <code>postsale.*</code>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive SOAP Tester & RabbitMQ Event Bus Monitor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Card: Interactive SOAP Tester */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <Code size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--color-latam-navy)' }}>
                  Ejecutor de Operaciones SOAP 1.1 / 1.2
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Invoca el servicio XML WSDL en tiempo real
                </span>
              </div>
            </div>
          </div>

          {/* Operation Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Operación SOAP a Invocar
            </label>
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: '#f8fafc'
              }}
            >
              <option value="GetPostSaleSummary">GetPostSaleSummary (Consultar resumen de reserva, maletas y políticas)</option>
              <option value="AddBaggage">AddBaggage (Añadir maletas extra y emitir booking.baggage_added)</option>
              <option value="QuoteCancellation">QuoteCancellation (Cotizar penalidades y reembolsos de cancelación)</option>
              <option value="CancelBooking">CancelBooking (Ejecutar cancelación, liberar asientos y emitir booking.cancelled)</option>
              <option value="QuoteReschedule">QuoteReschedule (Cotizar diferencia de tarifa y cargo por cambio de fecha)</option>
              <option value="RescheduleBooking">RescheduleBooking (Confirmar cambio de vuelo y emitir booking.rescheduled)</option>
            </select>
          </div>

          {/* PNR Input with Quick Select */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                Código PNR de Reserva
              </label>
              {recentBookings && recentBookings.length > 0 && (
                <span style={{ fontSize: '11px', color: '#3b82f6' }}>
                  PNRs disponibles en sistema:
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value.toUpperCase())}
                placeholder="Ej. AC5222X"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '700',
                  letterSpacing: '1px'
                }}
              />
            </div>

            {/* Quick PNR Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {recentBookings.slice(0, 5).map(b => (
                <button
                  key={b.pnr}
                  type="button"
                  onClick={() => setPnrInput(b.pnr)}
                  style={{
                    backgroundColor: pnrInput === b.pnr ? '#2563eb' : '#f1f5f9',
                    color: pnrInput === b.pnr ? '#fff' : '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '2px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {b.pnr} ({b.passengerName?.split(' ')[0] || 'Pax'})
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPnrInput('AC5222X')}
                style={{
                  backgroundColor: pnrInput === 'AC5222X' ? '#2563eb' : '#f1f5f9',
                  color: pnrInput === 'AC5222X' ? '#fff' : '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                AC5222X (Demo)
              </button>
            </div>
          </div>

          {/* Dynamic Inputs according to operation */}
          {selectedOperation === 'AddBaggage' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Piezas de Equipaje a Agregar (+20 USD c/u):
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={baggagePieces}
                onChange={(e) => setBaggagePieces(parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          )}

          {(selectedOperation === 'QuoteCancellation' || selectedOperation === 'CancelBooking') && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Motivo de Cancelación:
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          )}

          {selectedOperation === 'QuoteReschedule' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Número de Vuelo Destino:
                </label>
                <input
                  type="text"
                  value={targetFlightNumber}
                  onChange={(e) => setTargetFlightNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Nueva Fecha de Salida (ISO):
                </label>
                <input
                  type="text"
                  value={targetFlightDate}
                  onChange={(e) => setTargetFlightDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSendSoap}
            disabled={loading || !pnrInput}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#2563eb',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            {loading ? 'Transmitiendo SOAP Envelope...' : `Ejecutar SOAP: ${selectedOperation}`}
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '13px', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live XML Request Preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                XML Envelope Enviado (HTTP POST text/xml)
              </span>
            </div>
            <pre style={{
              backgroundColor: '#0f172a',
              color: '#38bdf8',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              overflowX: 'auto',
              maxHeight: '160px',
              margin: 0
            }}>
{`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:posts="http://aerocache.ec/services/postsale">
  <soapenv:Header/>
  <soapenv:Body>
    ${generateXmlBody()}
  </soapenv:Body>
</soapenv:Envelope>`}
            </pre>
          </div>
        </div>

        {/* Right Card: SOAP Response Inspector & RabbitMQ Live Trace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SOAP Response Panel */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={18} color="#059669" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--color-latam-navy)' }}>
                  Respuesta del Servidor SOAP
                </h3>
              </div>
              {soapResult && (
                <span style={{
                  backgroundColor: soapResult.ok ? '#ecfdf5' : '#fef2f2',
                  color: soapResult.ok ? '#059669' : '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  HTTP {soapResult.status} {soapResult.ok ? 'OK (200)' : 'Error'}
                </span>
              )}
            </div>

            {soapResult ? (
              <div>
                <pre style={{
                  backgroundColor: '#090d16',
                  color: '#4ade80',
                  padding: '14px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '260px',
                  margin: 0,
                  border: '1px solid #1e293b'
                }}>
                  {soapResult.responseXml}
                </pre>
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                fontSize: '13px'
              }}>
                Selecciona una operación y presiona <strong>"Ejecutar SOAP"</strong> para inspeccionar la respuesta XML en vivo.
              </div>
            )}
          </div>

          {/* Event Bus Trace Panel (RabbitMQ) */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} color="#d97706" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--color-latam-navy)' }}>
                  Traza de Eventos RabbitMQ (Exchange: aerocache.events)
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 'bold' }}>
                Topic: booking.*, flight.*, postsale.*
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {eventHistory.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        backgroundColor: '#d97706',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}>
                        {ev.routingKey}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400e' }}>
                        {ev.summary}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#b45309' }}>{ev.time}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#78350f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowRight size={10} /> Consumido asíncronamente por: <code>{ev.consumer}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
