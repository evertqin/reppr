import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettingsStore } from '../features/settings/store';

export function Layout() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <div className="layout">
      <nav className="nav" aria-label="Main">
        <span className="brand">reppr</span>
        <NavLink to="/" end>
          Build
        </NavLink>
        <NavLink to="/library">Library</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <span className="spacer" />
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
