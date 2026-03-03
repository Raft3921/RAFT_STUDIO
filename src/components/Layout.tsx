import { Link, NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/home', label: 'ホーム' },
  { to: '/plans', label: '企画' },
  { to: '/events', label: '撮影日' },
  { to: '/me', label: '自分' },
]

export const Layout = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/home" className="brand">
          YouTube撮影プランナー
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
