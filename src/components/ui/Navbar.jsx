import React, { useState, useEffect } from 'react';
import { LayoutGrid, Database, KeyRound, LogOut, Plus, Sun, Moon } from 'lucide-react';

export default function Navbar({ 
  user, 
  onOpenAuth, 
  onLogout, 
  onOpenSqlModal, 
  isSupabaseConnected,
  onNewProject 
}) {
  const [isDark, setIsDark] = useState(true);

  // Init from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  };

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <LayoutGrid size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
              Task<span className="gradient-text">Flow</span> Pro
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Seguimiento de Proyectos y Actividades
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          
          {/* Supabase Status Indicator */}
          <button 
            onClick={onOpenSqlModal}
            className="btn-secondary" 
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
            title="Ver configuración SQL y estado de Supabase"
          >
            <Database size={15} color={isSupabaseConnected ? '#10b981' : '#f59e0b'} />
            <span style={{ color: isSupabaseConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {isSupabaseConnected ? 'Supabase Conectado' : 'Modo Preview / SQL Setup'}
            </span>
          </button>

          {user && (
            <button 
              onClick={onNewProject}
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <Plus size={16} />
              <span>Nuevo Proyecto</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} color="#fcd34d" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* User Auth Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-glass)', padding: '0.35rem 0.75rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-light)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>
                  ID: {user.id ? `${user.id.substring(0, 8)}...` : ''}
                </span>
              </div>
              <button 
                onClick={onLogout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.3rem', display: 'flex', alignItems: 'center' }}
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn-primary" style={{ fontSize: '0.85rem' }}>
              <KeyRound size={16} />
              <span>Iniciar Sesión / Registro</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
