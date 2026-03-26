import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  CalendarDays,
  Heart,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invitees', icon: Users, label: 'Guest Book' },
  { to: '/routes', icon: MapPin, label: 'Route Planner' },
  { to: '/timeline', icon: CalendarDays, label: 'Timeline' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <aside
      className={`
        bg-white border-r border-blush-100 flex flex-col
        transition-all duration-300 ease-out shrink-0
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
    >
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-3 px-5 py-6 border-b border-blush-100 cursor-pointer hover:bg-blush-50 transition-colors w-full text-left"
      >
        <div className="shrink-0 w-9 h-9 bg-blush-200 rounded-full flex items-center justify-center">
          <Heart size={18} className="text-blush-500" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-warm-700 whitespace-nowrap">
            Shaadi Flow
          </span>
        )}
      </button>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold
              transition-all duration-200
              ${
                isActive
                  ? 'bg-blush-100 text-blush-600'
                  : 'text-warm-400 hover:bg-blush-50 hover:text-warm-600'
              }
              ${collapsed ? 'justify-center' : ''}
              `
            }
          >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-blush-100 pt-3">
        <NavLink
          to="/team"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold
            transition-all duration-200
            ${
              isActive
                ? 'bg-blush-100 text-blush-600'
                : 'text-warm-400 hover:bg-blush-50 hover:text-warm-600'
            }
            ${collapsed ? 'justify-center' : ''}
            `
          }
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span>Team & Settings</span>}
        </NavLink>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 mx-3 mb-4 rounded-sm text-warm-300 hover:bg-blush-50 hover:text-warm-500 transition-colors cursor-pointer flex items-center justify-center"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
