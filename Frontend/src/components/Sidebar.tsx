import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, UserPlus, Building2, Calendar, Clock, Grid, DollarSign, Wallet, ShoppingBag, BarChart2, Settings, ChevronRight, UserCheck, AlertTriangle, Menu, X, LogOut, MapPin, Package, ToggleLeft, Archive, Users, QrCode, Megaphone, HelpCircle, ShieldCheck, UserCog, BookOpen, Sparkles, Crown, Star, CreditCard } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import logo from './logo.jpg';
import { useAuth } from '../context/AuthContext';
import { isCordova } from '../utils/platformUtils';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onBarcodeClick: () => void;
}

const hasPermission = (user, permission) => {
    if (!user || !user.permissions) return false;
    if (user.role === 'admin') return true;
    
    // Special case for lockers - allow both admin and staff users
    if (permission === 'manage_lockers_or_staff') {
        return user.role === 'admin' || user.role === 'staff';
    }
    
    return user.permissions.includes(permission);
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, onBarcodeClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showHostelDropdown, setShowHostelDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' });
  // Allow collapse on all screen sizes
  const effectiveIsCollapsed = isCollapsed;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', permission: null, iconBg: 'bg-gradient-to-r from-indigo-100 to-indigo-200', iconBgHover: 'group-hover:from-indigo-200 group-hover:to-indigo-300', iconActive: 'from-indigo-300 to-indigo-400', iconColor: 'text-indigo-600', iconColorHover: 'group-hover:text-indigo-700', iconColorActive: 'text-indigo-800' },
    { path: '/students', icon: UserPlus, label: 'Library Students', hasDropdown: true, permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-violet-100 to-violet-200', iconBgHover: 'group-hover:from-violet-200 group-hover:to-violet-300', iconActive: 'from-violet-300 to-violet-400', iconColor: 'text-violet-600', iconColorHover: 'group-hover:text-violet-700', iconColorActive: 'text-violet-800' },
    { path: '/attendance', icon: Users, label: 'Attendance', permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-cyan-100 to-cyan-200', iconBgHover: 'group-hover:from-cyan-200 group-hover:to-cyan-300', iconActive: 'from-cyan-300 to-cyan-400', iconColor: 'text-cyan-600', iconColorHover: 'group-hover:text-cyan-700', iconColorActive: 'text-cyan-800' },
    { path: '#', icon: QrCode, label: 'Barcode Scanner', permission: 'manage_library_students', onClick: onBarcodeClick, iconBg: 'bg-gradient-to-r from-emerald-100 to-emerald-200', iconBgHover: 'group-hover:from-emerald-200 group-hover:to-emerald-300', iconActive: 'from-emerald-300 to-emerald-400', iconColor: 'text-emerald-600', iconColorHover: 'group-hover:text-emerald-700', iconColorActive: 'text-emerald-800' },
    { path: '/announcements', icon: Megaphone, label: 'Announcements', permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-amber-100 to-amber-200', iconBgHover: 'group-hover:from-amber-200 group-hover:to-amber-300', iconActive: 'from-amber-300 to-amber-400', iconColor: 'text-amber-600', iconColorHover: 'group-hover:text-amber-700', iconColorActive: 'text-amber-800' },
    { path: '/admission-requests', icon: UserCog, label: 'Admission Requests', permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-blue-100 to-blue-200', iconBgHover: 'group-hover:from-blue-200 group-hover:to-blue-300', iconActive: 'from-blue-300 to-blue-400', iconColor: 'text-blue-600', iconColorHover: 'group-hover:text-blue-700', iconColorActive: 'text-blue-800' },
    { path: '/admin/queries', icon: ShieldCheck, label: 'Admin Queries', permission: 'admin_only', iconBg: 'bg-gradient-to-r from-rose-100 to-rose-200', iconBgHover: 'group-hover:from-rose-200 group-hover:to-rose-300', iconActive: 'from-rose-300 to-rose-400', iconColor: 'text-rose-600', iconColorHover: 'group-hover:text-rose-700', iconColorActive: 'text-rose-800' },
    { path: '/schedule', icon: Calendar, label: 'Schedule', permission: 'manage_schedules', iconBg: 'bg-gradient-to-r from-sky-100 to-sky-200', iconBgHover: 'group-hover:from-sky-200 group-hover:to-sky-300', iconActive: 'from-sky-300 to-sky-400', iconColor: 'text-sky-600', iconColorHover: 'group-hover:text-sky-700', iconColorActive: 'text-sky-800' },
    { path: '/shifts', icon: Clock, label: 'Shifts', permission: 'manage_schedules', iconBg: 'bg-gradient-to-r from-teal-100 to-teal-200', iconBgHover: 'group-hover:from-teal-200 group-hover:to-teal-300', iconActive: 'from-teal-300 to-teal-400', iconColor: 'text-teal-600', iconColorHover: 'group-hover:text-teal-700', iconColorActive: 'text-teal-800' },
    { path: '/seats', icon: Grid, label: 'Seats', permission: 'manage_seats', iconBg: 'bg-gradient-to-r from-purple-100 to-purple-200', iconBgHover: 'group-hover:from-purple-200 group-hover:to-purple-300', iconActive: 'from-purple-300 to-purple-400', iconColor: 'text-purple-600', iconColorHover: 'group-hover:text-purple-700', iconColorActive: 'text-purple-800' },
    { path: '/branches', icon: MapPin, label: 'Manage Branches', permission: 'manage_branches', iconBg: 'bg-gradient-to-r from-fuchsia-100 to-fuchsia-200', iconBgHover: 'group-hover:from-fuchsia-200 group-hover:to-fuchsia-300', iconActive: 'from-fuchsia-300 to-fuchsia-400', iconColor: 'text-fuchsia-600', iconColorHover: 'group-hover:text-fuchsia-700', iconColorActive: 'text-fuchsia-800' },
    { path: '/products', icon: Package, label: 'Products', permission: 'manage_products', iconBg: 'bg-gradient-to-r from-pink-100 to-pink-200', iconBgHover: 'group-hover:from-pink-200 group-hover:to-pink-300', iconActive: 'from-pink-300 to-pink-400', iconColor: 'text-pink-600', iconColorHover: 'group-hover:text-pink-700', iconColorActive: 'text-pink-800' },
    { path: '/transactions', icon: DollarSign, label: 'Transactions', permission: 'view_transactions', iconBg: 'bg-gradient-to-r from-green-100 to-green-200', iconBgHover: 'group-hover:from-green-200 group-hover:to-green-300', iconActive: 'from-green-300 to-green-400', iconColor: 'text-green-600', iconColorHover: 'group-hover:text-green-700', iconColorActive: 'text-green-800' },
    { path: '/advanced-payment', icon: CreditCard, label: 'Advanced Payment', permission: 'view_transactions', iconBg: 'bg-gradient-to-r from-indigo-100 to-indigo-200', iconBgHover: 'group-hover:from-indigo-200 group-hover:to-indigo-300', iconActive: 'from-indigo-300 to-indigo-400', iconColor: 'text-indigo-600', iconColorHover: 'group-hover:text-indigo-700', iconColorActive: 'text-indigo-800' },
    { path: '/collections', icon: Wallet, label: 'Collection & Due', permission: 'view_collections', iconBg: 'bg-gradient-to-r from-emerald-100 to-emerald-200', iconBgHover: 'group-hover:from-emerald-200 group-hover:to-emerald-300', iconActive: 'from-emerald-300 to-emerald-400', iconColor: 'text-emerald-600', iconColorHover: 'group-hover:text-emerald-700', iconColorActive: 'text-emerald-800' },
    { path: '/expenses', icon: ShoppingBag, label: 'Expenses', permission: 'manage_expenses', iconBg: 'bg-gradient-to-r from-orange-100 to-orange-200', iconBgHover: 'group-hover:from-orange-200 group-hover:to-orange-300', iconActive: 'from-orange-300 to-orange-400', iconColor: 'text-orange-600', iconColorHover: 'group-hover:text-orange-700', iconColorActive: 'text-orange-800' },
    { path: '/profit-loss', icon: BarChart2, label: 'Profit & Loss', permission: 'view_reports', iconBg: 'bg-gradient-to-r from-indigo-100 to-indigo-200', iconBgHover: 'group-hover:from-indigo-200 group-hover:to-indigo-300', iconActive: 'from-indigo-300 to-indigo-400', iconColor: 'text-indigo-600', iconColorHover: 'group-hover:text-indigo-700', iconColorActive: 'text-indigo-800' },
    { path: '/lockers', icon: Archive, label: 'Lockers', permission: 'manage_lockers_or_staff', iconBg: 'bg-gradient-to-r from-slate-100 to-slate-200', iconBgHover: 'group-hover:from-slate-200 group-hover:to-slate-300', iconActive: 'from-slate-300 to-slate-400', iconColor: 'text-slate-600', iconColorHover: 'group-hover:text-slate-700', iconColorActive: 'text-slate-800' },
    { path: '/settings', icon: Settings, label: 'Settings', permission: 'admin_only', iconBg: 'bg-gradient-to-r from-gray-100 to-gray-200', iconBgHover: 'group-hover:from-gray-200 group-hover:to-gray-300', iconActive: 'from-gray-300 to-gray-400', iconColor: 'text-gray-600', iconColorHover: 'group-hover:text-gray-700', iconColorActive: 'text-gray-800' },
    ...(isCordova ? [
      { path: '/subscription', icon: Crown, label: 'Subscription', permission: 'admin_only', iconBg: 'bg-gradient-to-r from-violet-100 to-violet-200', iconBgHover: 'group-hover:from-violet-200 group-hover:to-violet-300', iconActive: 'from-violet-300 to-violet-400', iconColor: 'text-violet-600', iconColorHover: 'group-hover:text-violet-700', iconColorActive: 'text-violet-800' },
    ] : []),
  ];

  const handleLogout = () => {
    navigate('/');
    if (isMobile) setIsSidebarOpen(false);
  };

  return (
    <>
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-white shadow-md"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={24} />
        </button>
      )}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-r-2 border-purple-200 flex flex-col min-h-0 transition-all duration-300 shadow-2xl ${
          isMobile ? (isSidebarOpen ? 'fixed top-0 left-0 z-50 w-64' : 'hidden') : (effectiveIsCollapsed ? 'w-16' : 'w-64')
        }`}
      >
        {/* Clean Logo Section */}
        <div className="p-4 flex items-center justify-between bg-white border-b border-gray-200">
          {!effectiveIsCollapsed && (
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
                <img src={logo} alt="HAVENN Logo" className="h-6 w-6 rounded object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  HAVENN
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Library Management
                </p>
              </div>
            </div>
          )}
          {effectiveIsCollapsed && (
            <div className="flex justify-center w-full">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
                <img src={logo} alt="HAVENN Logo" className="h-5 w-5 rounded object-cover" />
              </div>
            </div>
          )}
          {isMobile ? (
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-600" />
            </button>
          ) : (
            !effectiveIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            )
          )}
        </div>
        {/* Collapse Button - Always Visible */}
        {!isMobile && (
          <div className="px-4 py-2 border-b border-gray-200">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              title={effectiveIsCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight size={18} className={`transition-transform ${effectiveIsCollapsed ? 'rotate-180' : ''}`} />
              {!effectiveIsCollapsed && <span className="ml-2 text-sm font-medium">Collapse</span>}
            </button>
          </div>
        )}
        
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              let canView = false;
              if (item.permission === null) {
                canView = true;
              } else if (item.permission === 'admin_only') {
                canView = user?.role === 'admin';
              } else {
                canView = hasPermission(user, item.permission);
              }

              if (canView) {
                return (
                  <li key={item.path}>
                    {item.onClick ? (
                      <button
                        onClick={() => {
                          console.log('Barcode button clicked!', item.label);
                          if (item.onClick) {
                            console.log('Calling onClick handler');
                            item.onClick();
                          } else {
                            console.log('No onClick handler found');
                          }
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        className={`group flex items-center w-full text-left py-3 px-4 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                          effectiveIsCollapsed ? 'justify-center' : ''
                        } ${
                          isActive(item.path)
                            ? 'bg-gradient-to-r from-indigo-200 to-indigo-300 text-indigo-800 shadow-xl'
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200'
                        }`}>
                        <span className={`${effectiveIsCollapsed ? '' : 'mr-4'}`}>
                          <span className={`inline-flex items-center justify-center p-2 rounded-xl shadow-md transition-all duration-300 ${
                            isActive(item.path) 
                              ? `bg-gradient-to-r ${item.iconActive} ${item.iconColorActive}` 
                              : `${item.iconBg} ${item.iconBgHover} ${item.iconColor} ${item.iconColorHover}`
                          }`}>
                            {(() => { const Icon = item.icon; return <Icon size={20} className="transition-all duration-300" />; })()}
                          </span>
                        </span>
                        {!effectiveIsCollapsed && <span className="font-bold text-sm tracking-wide">{item.label}</span>}
                      </button>
                    ) : (
                      <Link
                        to={item.path}
                        onClick={(e) => {
                          if (item.hasDropdown && !effectiveIsCollapsed) {
                            e.preventDefault();
                            if (item.label === 'Library Students') {
                              setShowStudentDropdown(!showStudentDropdown);
                            } else if (item.label === 'Hostel Students') {
                              setShowHostelDropdown(!showHostelDropdown);
                            }
                          } else if (isMobile) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className={`group flex items-center py-3 px-4 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                          effectiveIsCollapsed ? 'justify-center' : ''
                        } ${
                          isActive(item.path)
                            ? 'bg-gradient-to-r from-indigo-200 to-indigo-300 text-indigo-800 shadow-xl'
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200'
                        }`}>
                        <span className={`${effectiveIsCollapsed ? '' : 'mr-4'}`}>
                          <span className={`inline-flex items-center justify-center p-2 rounded-xl shadow-md transition-all duration-300 ${
                            isActive(item.path) 
                              ? `bg-gradient-to-r ${item.iconActive} ${item.iconColorActive}` 
                              : `${item.iconBg} ${item.iconBgHover} ${item.iconColor} ${item.iconColorHover}`
                          }`}>
                            {(() => { const Icon = item.icon; return <Icon size={20} className="transition-all duration-300" />; })()}
                          </span>
                        </span>
                        {!effectiveIsCollapsed && (
                          <div className="flex justify-between items-center w-full">
                            <span className="font-bold text-sm tracking-wide">{item.label}</span>
                            {item.hasDropdown && (
                              <ChevronRight
                                size={16}
                                className={`transition-transform ${
                                  (item.label === 'Library Students' && showStudentDropdown) ||
                                  (item.label === 'Hostel Students' && showHostelDropdown)
                                    ? 'rotate-90'
                                    : ''
                                }`}
                              />
                            )}
                          </div>
                        )}
                      </Link>
                    )}
                    {!effectiveIsCollapsed && item.hasDropdown && showStudentDropdown && item.label === 'Library Students' && (
                      <div className="ml-8 mt-1 space-y-1 animate-fade-in">
                        <Link to="/students/add" className={`block py-2 px-3 rounded-md text-sm font-medium ${isActive('/students/add') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Add Student</Link>
                        <Link to="/students" className={`block py-2 px-3 rounded-md text-sm font-medium ${isActive('/students') && location.pathname.split('/').length === 2 ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>View All</Link>
                        <Link to="/active-students" className={`flex items-center py-2 px-3 rounded-md text-sm font-medium ${isActive('/active-students') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><UserCheck size={14} className="mr-1.5" />Active Students</Link>
                        <Link to="/expired-memberships" className={`flex items-center py-2 px-3 rounded-md text-sm font-medium ${isActive('/expired-memberships')? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><AlertTriangle size={14} className="mr-1.5" />Expired Members</Link>
                        <Link to="/inactive-students" className={`flex items-center py-2 px-3 rounded-md text-sm font-medium ${isActive('/inactive-students') ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-slate-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><ToggleLeft size={14} className="mr-1.5" />Inactive Students</Link>
                      </div>
                    )}
                    {!effectiveIsCollapsed && item.hasDropdown && showHostelDropdown && item.label === 'Hostel Students' && (
                      <div className="ml-8 mt-1 space-y-1 animate-fade-in">
                        <Link to="/hostel-dashboard" className={`block py-2 px-3 rounded-md text-sm font-medium ${isActive('/hostel-dashboard') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Hostel Dashboard</Link>
                        <Link to="/hostel/active-students" className={`flex items-center py-2 px-3 rounded-md text-sm font-medium ${isActive('/hostel/active-students') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><UserCheck size={14} className="mr-1.5" />Active Students</Link>
                        <Link to="/hostel/collections" className={`block py-2 px-3 rounded-md text-sm font-medium ${isActive('/hostel/collections') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Collection & Due</Link>
                        <Link to="/hostel/expired" className={`block py-2 px-3 rounded-md text-sm font-medium ${isActive('/hostel/expired') ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Expired Memberships</Link>
                        <Link to="/hostel" className={`block py-2 px-3 rounded-md text-sm font-medium ${isActive('/hostel') && location.pathname.split('/').length === 2 ? 'bg-purple-50 text-purple-600' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Student Management</Link>
                      </div>
                    )}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </nav>
        <div className="p-2">
          <button
            className={`flex items-center w-full px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
              effectiveIsCollapsed ? 'justify-center' : ''
            }`}
            onClick={handleLogout}
          >
            <div className={`flex items-center gap-3 ${effectiveIsCollapsed ? 'justify-center' : ''}`}>
              <LogOut size={20} className="text-gray-500" />
              {!effectiveIsCollapsed && <span className="font-medium">Logout</span>}
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;