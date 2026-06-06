import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Megaphone, Calendar, Settings } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/attendance', label: 'Attend', icon: Calendar },
  { to: '/announcements', label: 'News', icon: Megaphone },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MobileNav: React.FC = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => `flex flex-col items-center justify-center py-2.5 text-xs ${
                isActive ? 'text-indigo-600' : 'text-gray-600'
              }`}
            >
              <Icon size={20} />
              <span className="mt-1.5 leading-none">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileNav;
