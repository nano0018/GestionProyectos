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

  // Al montar: lee el tema guardado (o el del sistema) y lo aplica
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

  // Alterna el tema y lo guarda en localStorage
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
    <header className="glass-panel barra-superior">
      <div className="barra-superior-contenido">

        {/* Marca: logo y nombre de la aplicación */}
        <div className="marca">
          <div className="marca-logo">
            <LayoutGrid size={22} color="#fff" />
          </div>
          <div>
            <h1 className="marca-titulo">
              Task<span className="gradient-text">Flow</span> Pro
            </h1>
            <span className="marca-subtitulo">Seguimiento de Proyectos y Actividades</span>
          </div>
        </div>

        {/* Controles de la derecha */}
        <div className="barra-acciones">

          {/* Estado de Supabase: abre el instalador SQL */}
          <button
            onClick={onOpenSqlModal}
            className="btn-secondary boton-estado-bd"
            title="Ver configuración SQL y estado de Supabase"
          >
            <Database size={15} color={isSupabaseConnected ? '#10b981' : '#f59e0b'} />
            <span style={{ color: isSupabaseConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
              {isSupabaseConnected ? 'Supabase Conectado' : 'Modo Preview / SQL Setup'}
            </span>
          </button>

          {/* Crear proyecto (solo con sesión iniciada) */}
          {user && (
            <button onClick={onNewProject} className="btn-primary boton-nuevo-proyecto">
              <Plus size={16} />
              <span>Nuevo Proyecto</span>
            </button>
          )}

          {/* Cambio de tema claro / oscuro */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} color="#fcd34d" /> : <Moon size={18} color="#6366f1" />}
          </button>

          {/* Sesión: datos del usuario y salir, o botón para iniciar sesión */}
          {user ? (
            <div className="usuario-activo">
              <div className="usuario-avatar">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="usuario-datos">
                <span className="usuario-email">{user.email}</span>
                <span className="usuario-id">
                  ID: {user.id ? `${user.id.substring(0, 8)}...` : ''}
                </span>
              </div>
              <button onClick={onLogout} className="boton-salir" title="Cerrar sesión">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn-primary boton-iniciar-sesion">
              <KeyRound size={16} />
              <span>Iniciar Sesión / Registro</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
