import React from 'react';
import { Plane, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--color-latam-navy)', color: '#fff', marginTop: '60px', padding: '40px 24px 20px 24px', borderTop: '3px solid var(--color-latam-coral)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '30px', marginBottom: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Plane size={20} color="var(--color-latam-coral)" />
            <strong style={{ fontSize: '18px', letterSpacing: '1px' }}>AEROCACHE</strong>
          </div>
          <p style={{ fontSize: '13px', color: '#9bb1c9', lineHeight: '1.6' }}>
            La aerolínea inteligente de Ecuador. Conectando con vuelos diarios directos entre Quito, Guayaquil y Cuenca con los más altos estándares de puntualidad y servicio.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '12px', textTransform: 'uppercase' }}>Rutas Nacionales</h4>
          <ul style={{ listStyle: 'none', fontSize: '13px', color: '#9bb1c9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Quito (UIO) ↔ Guayaquil (GYE)</li>
            <li>Quito (UIO) ↔ Cuenca (CUE)</li>
            <li>Guayaquil (GYE) ↔ Cuenca (CUE)</li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '12px', textTransform: 'uppercase' }}>Servicios & Ayuda</h4>
          <ul style={{ listStyle: 'none', fontSize: '13px', color: '#9bb1c9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Check-in en línea (24h antes)</li>
            <li>Pases de Abordar Digitales</li>
            <li>Equipaje de Bodega y Cabina</li>
            <li>Cambios de Fecha y Reembolsos</li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '12px', textTransform: 'uppercase' }}>Seguridad & Confianza</h4>
          <p style={{ fontSize: '13px', color: '#9bb1c9', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <ShieldCheck size={18} color="#059669" /> Microservicio REST Certificado
          </p>
          <p style={{ fontSize: '12px', color: '#8898aa' }}>
            API con Idempotency-Key y RFC 7807 ProblemDetails integrada nativamente con Visual Studio 2022 y Docker.
          </p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', textAlign: 'center', fontSize: '12px', color: '#8898aa' }}>
        © {new Date().getFullYear()} AEROCACHE Airlines Ecuador. Todos los derechos reservados. Inspirado en el diseño y experiencia de LATAM Airlines.
      </div>
    </footer>
  );
}
