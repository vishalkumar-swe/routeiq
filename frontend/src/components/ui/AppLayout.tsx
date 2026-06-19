import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, Truck, Map, BarChart3, Zap, 
  LogOut, Shield, Brain, Package, Network, Gavel
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authAPI } from '@/services/api'
import clsx from 'clsx'

interface NavItem {
  to: string
  icon: any
  label: string
  roles?: string[]
  badge?: number
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Control Tower', roles: ['admin', 'superadmin'] },
  { to: '/shipments', icon: Package,         label: 'Cargo Manifest', roles: ['admin', 'superadmin'] },
  { to: '/fleet',     icon: Truck,           label: 'Fleet Assets', roles: ['admin', 'superadmin'] },
  { to: '/routes',    icon: Map,             label: 'Route Grid', roles: ['admin', 'superadmin'] },
  { to: '/optimize',  icon: Zap,             label: 'Neural Reroute', roles: ['admin', 'superadmin'] },
  { to: '/analytics', icon: BarChart3,       label: 'Intel Dashboard', roles: ['admin', 'superadmin'] },
  { to: '/ai-hub',    icon: Brain,           label: 'Nexus AI Hub', roles: ['admin', 'superadmin'] },
  { to: '/cargo-network', icon: Network,     label: 'Cargo Network', roles: ['admin', 'superadmin'] },
  { to: '/bidding',   icon: Gavel,           label: 'Freight Bidding', roles: ['admin', 'superadmin'] },
  { to: '/track',     icon: Shield,          label: 'Tracking Portal' },
  { to: '/superadmin', icon: Shield,          label: 'Superadmin', roles: ['superadmin'] },
]

export default function AppLayout() {
  const clearAuth = useAuthStore(s => s.clearAuth)
  const role = useAuthStore(s => s.role)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (e) {
      console.error('Logout error', e)
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <div className="bg-mesh" />
      <div className="bg-grid opacity-20" />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-surface border-r border-border flex flex-col py-8 z-[100] shadow-2xl shadow-black/5">
        {/* Logo */}
        <div className="px-8 mb-12">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <div className="text-bg font-display font-black text-2xl">RI</div>
              </div>
              <div>
                <div className="font-display font-black text-xl text-text tracking-tight uppercase leading-tight">
                  <span className="truncate">ROUTEIQ</span>
                </div>
                <div className="font-display font-bold text-[9px] text-primary uppercase tracking-[0.12em]">
                  by Prudata Logistics
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-2">
          {navItems
            .filter(item => !item.roles || item.roles.includes(role || ''))
            .map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(
                'flex items-center gap-4 px-6 py-4 rounded-2xl text-sm transition-all relative group overflow-hidden',
                isActive ? 'text-text font-bold bg-primary/10 shadow-sm shadow-primary/5' : 'text-muted hover:text-text hover:bg-surface2'
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full shadow-[2px_0_12px_rgba(79,172,254,0.6)]" />
                  )}
                  <Icon size={20} className={clsx('transition-all duration-300', isActive ? 'text-primary scale-110' : 'text-muted group-hover:text-primary-dark')} />
                  <span className="flex-1 tracking-tight">{label}</span>
                  {badge && (
                    <span className="bg-primary text-bg text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Bottom */}
        <div className="px-6 mt-auto pt-6 border-t border-border">
          <button 
            className="flex items-center gap-4 w-full px-6 py-4 rounded-2xl text-sm font-bold text-muted hover:text-error hover:bg-error/10 transition-all group"
            onClick={handleLogout}
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[280px] flex-1 p-10 min-h-screen relative z-10">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
