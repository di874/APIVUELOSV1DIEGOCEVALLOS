import React from 'react';
import { Plane, Calendar, UserCheck, Search, ShieldCheck, LayoutDashboard } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header style={{ backgroundColor: 'var(--color-latam-navy)', color: '#fff', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
      {/* Top Utility Bar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '6px 24px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '16px', color: '#9bb1c9' }}>
          <span>✈ Vuelos Domésticos Ecuador: <strong>Quito (UIO) • Guayaquil (GYE) • Cuenca (CUE)</strong></span>
          <span>• Moneda: <strong>USD ($)</strong></span>
        </div>
        <div style={{ display: 'flex', gap: '16px', color: '#9bb1c9' }}>
          <span style={{ cursor: 'pointer' }}>Ayuda 24/7</span>
          <span style={{ cursor: 'pointer' }}>Atención al Cliente</span>
          <span 
            onClick={() => setActiveTab('admin')} 
            style={{ color: '#ff8da1', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🔒 Portal Administrador
          </span>
        </div>
      </div>

      {/* Main Brand & Nav Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('search')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          {/* Logo Mark Inspired by LATAM Wings */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #e8114b 0%, #ff4b72 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232, 17, 75, 0.4)'
          }}>
            <Plane size={24} color="#fff" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '1px', lineHeight: '1' }}>
              AERO<span style={{ color: 'var(--color-latam-coral)' }}>CACHE</span>
            </div>
            <div style={{ fontSize: '10px', color: '#8fa8c4', letterSpacing: '2px', textTransform: 'uppercase' }}>
              AIRLINES ECUADOR
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'search', label: 'Comprar Vuelos', icon: Search },
            { id: 'bookings', label: 'Mis Viajes', icon: Calendar },
            { id: 'checkin', label: 'Check-in', icon: UserCheck },
            { id: 'status', label: 'Estado de Vuelo', icon: ShieldCheck },
            { id: 'admin', label: 'Panel Admin', icon: LayoutDashboard }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#fff' : '#c5d5e6',
                  backgroundColor: isActive ? 'var(--color-latam-coral)' : 'transparent',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                }}
                onMouseOut={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
