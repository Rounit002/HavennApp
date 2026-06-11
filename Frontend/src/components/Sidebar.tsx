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
    { path: '/dashboard', icon: Home, label: 'Dashboard', permission: null, iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/students', icon: UserPlus, label: 'Library Students', hasDropdown: true, permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/attendance', icon: Users, label: 'Attendance', permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-cyan-100 to-cyan-200', iconBgHover: 'group-hover:from-cyan-200 group-hover:to-cyan-300', iconActive: 'from-cyan-300 to-cyan-400', iconColor: 'text-cyan-600', iconColorHover: 'group-hover:text-cyan-700', iconColorActive: 'text-cyan-800' },
    { path: '#', icon: QrCode, label: 'Barcode Scanner', permission: 'manage_library_students', onClick: onBarcodeClick, iconBg: 'bg-gradient-to-r from-emerald-100 to-emerald-200', iconBgHover: 'group-hover:from-emerald-200 group-hover:to-emerald-300', iconActive: 'from-emerald-300 to-emerald-400', iconColor: 'text-emerald-600', iconColorHover: 'group-hover:text-emerald-700', iconColorActive: 'text-emerald-800' },
    { path: '/announcements', icon: Megaphone, label: 'Announcements', permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-amber-100 to-amber-200', iconBgHover: 'group-hover:from-amber-200 group-hover:to-amber-300', iconActive: 'from-amber-300 to-amber-400', iconColor: 'text-amber-600', iconColorHover: 'group-hover:text-amber-700', iconColorActive: 'text-amber-800' },
    { path: '/admission-requests', icon: UserCog, label: 'Admission Requests', permission: 'manage_library_students', iconBg: 'bg-gradient-to-r from-blue-100 to-blue-200', iconBgHover: 'group-hover:from-blue-200 group-hover:to-blue-300', iconActive: 'from-blue-300 to-blue-400', iconColor: 'text-blue-600', iconColorHover: 'group-hover:text-blue-700', iconColorActive: 'text-blue-800' },
    { path: '/admin/queries', icon: ShieldCheck, label: 'Admin Queries', permission: 'admin_only', iconBg: 'bg-gradient-to-r from-rose-100 to-rose-200', iconBgHover: 'group-hover:from-rose-200 group-hover:to-rose-300', iconActive: 'from-rose-300 to-rose-400', iconColor: 'text-rose-600', iconColorHover: 'group-hover:text-rose-700', iconColorActive: 'text-rose-800' },
    { path: '/schedule', icon: Calendar, label: 'Schedule', permission: 'manage_schedules', iconBg: 'bg-gradient-to-r from-sky-100 to-sky-200', iconBgHover: 'group-hover:from-sky-200 group-hover:to-sky-300', iconActive: 'from-sky-300 to-sky-400', iconColor: 'text-sky-600', iconColorHover: 'group-hover:text-sky-700', iconColorActive: 'text-sky-800' },
    { path: '/shifts', icon: Clock, label: 'Shifts', permission: 'manage_schedules', iconBg: 'bg-gradient-to-r from-teal-100 to-teal-200', iconBgHover: 'group-hover:from-teal-200 group-hover:to-teal-300', iconActive: 'from-teal-300 to-teal-400', iconColor: 'text-teal-600', iconColorHover: 'group-hover:text-teal-700', iconColorActive: 'text-teal-800' },
    { path: '/seats', icon: Grid, label: 'Seats', permission: 'manage_seats', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/branches', icon: MapPin, label: 'Manage Branches', permission: 'manage_branches', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/products', icon: Package, label: 'Products', permission: 'manage_products', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/transactions', icon: DollarSign, label: 'Transactions', permission: 'view_transactions', iconBg: 'bg-gradient-to-r from-green-100 to-green-200', iconBgHover: 'group-hover:from-green-200 group-hover:to-green-300', iconActive: 'from-green-300 to-green-400', iconColor: 'text-green-600', iconColorHover: 'group-hover:text-green-700', iconColorActive: 'text-green-800' },
    { path: '/advanced-payment', icon: CreditCard, label: 'Advanced Payment', permission: 'view_transactions', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/collections', icon: Wallet, label: 'Collection & Due', permission: 'view_collections', iconBg: 'bg-gradient-to-r from-emerald-100 to-emerald-200', iconBgHover: 'group-hover:from-emerald-200 group-hover:to-emerald-300', iconActive: 'from-emerald-300 to-emerald-400', iconColor: 'text-emerald-600', iconColorHover: 'group-hover:text-emerald-700', iconColorActive: 'text-emerald-800' },
    { path: '/expenses', icon: ShoppingBag, label: 'Expenses', permission: 'manage_expenses', iconBg: 'bg-gradient-to-r from-orange-100 to-orange-200', iconBgHover: 'group-hover:from-orange-200 group-hover:to-orange-300', iconActive: 'from-orange-300 to-orange-400', iconColor: 'text-orange-600', iconColorHover: 'group-hover:text-orange-700', iconColorActive: 'text-orange-800' },
    { path: '/profit-loss', icon: BarChart2, label: 'Profit & Loss', permission: 'view_reports', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
    { path: '/lockers', icon: Archive, label: 'Lockers', permission: 'manage_lockers_or_staff', iconBg: 'bg-gradient-to-r from-slate-100 to-slate-200', iconBgHover: 'group-hover:from-slate-200 group-hover:to-slate-300', iconActive: 'from-slate-300 to-slate-400', iconColor: 'text-slate-600', iconColorHover: 'group-hover:text-slate-700', iconColorActive: 'text-slate-800' },
    { path: '/settings', icon: Settings, label: 'Settings', permission: 'admin_only', iconBg: 'bg-gradient-to-r from-gray-100 to-gray-200', iconBgHover: 'group-hover:from-gray-200 group-hover:to-gray-300', iconActive: 'from-gray-300 to-gray-400', iconColor: 'text-gray-600', iconColorHover: 'group-hover:text-gray-700', iconColorActive: 'text-gray-800' },
    ...(isCordova ? [
      { path: '/subscription', icon: Crown, label: 'Subscription', permission: 'admin_only', iconBg: 'bg-gradient-to-r from-[#1D9E75] to-[#1A8FA8]', iconBgHover: 'group-hover:from-[#0F6E56] group-hover:to-[#1D9E75]', iconActive: 'from-[#0F6E56] to-[#1D9E75]', iconColor: 'text-[#1D9E75]', iconColorHover: 'group-hover:text-[#0F6E56]', iconColorActive: 'text-[#085041]' },
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
          className="fixed bottom-4 right-4 z-50 md:hidden p-3 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={24} className="text-gray-700" />
        </button>
      )}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div
        className={`h-screen bg-white flex flex-col min-h-0 transition-all duration-300 border-r border-gray-200 ${
          isMobile ? (isSidebarOpen ? 'fixed top-0 left-0 z-50 w-64 shadow-xl' : 'hidden') : (effectiveIsCollapsed ? 'w-16' : 'w-64')
        }`}
      >
        {/* Clean Logo Section */}
        <div className="p-4 flex items-center justify-between border-b border-gray-200">
          {!effectiveIsCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg">
                <img src={logo} alt="HAVENN Logo" className="h-7 w-7 rounded object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
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
              <div className="p-1.5 rounded-lg">
                <img src={logo} alt="HAVENN Logo" className="h-6 w-6 rounded object-cover" />
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
          <div className="px-3 py-2 border-b border-gray-200">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors text-gray-600 group"
              title={effectiveIsCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronRight size={16} className={`transition-transform group-hover:text-teal-600 ${effectiveIsCollapsed ? 'rotate-180' : ''}`} />
              {!effectiveIsCollapsed && <span className="text-sm font-medium">Collapse</span>}
            </button>
          </div>
        )}
        
        <nav className="flex-1 px-3 py-4 overflow-y-auto bg-white">
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
                        className={`group flex items-center w-full text-left py-2.5 px-3 rounded-lg transition-all duration-200 ${
                          effectiveIsCollapsed ? 'justify-center' : ''
                        } ${
                          isActive(item.path)
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                        }`}>
                        {(() => { 
                          const Icon = item.icon; 
                          return <Icon size={20} className={`${effectiveIsCollapsed ? '' : 'mr-3'} ${isActive(item.path) ? 'text-teal-600' : 'text-gray-500 group-hover:text-teal-600'}`} />; 
                        })()}
                        {!effectiveIsCollapsed && <span className="font-medium text-sm">{item.label}</span>}
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
                        className={`group flex items-center py-2.5 px-3 rounded-lg transition-all duration-200 ${
                          effectiveIsCollapsed ? 'justify-center' : ''
                        } ${
                          isActive(item.path)
                            ? 'bg-teal-50 text-teal-700'
                            : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                        }`}>
                        {(() => { 
                          const Icon = item.icon; 
                          return <Icon size={20} className={`${effectiveIsCollapsed ? '' : 'mr-3'} ${isActive(item.path) ? 'text-teal-600' : 'text-gray-500 group-hover:text-teal-600'}`} />; 
                        })()}
                        {!effectiveIsCollapsed && (
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium text-sm">{item.label}</span>
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
                      <div className="ml-9 mt-1 space-y-0.5 animate-fade-in">
                        <Link to="/students/add" className={`block py-2 px-3 rounded-md text-sm ${isActive('/students/add') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Add Student</Link>
                        <Link to="/students" className={`block py-2 px-3 rounded-md text-sm ${isActive('/students') && location.pathname.split('/').length === 2 ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>View All</Link>
                        <Link to="/active-students" className={`flex items-center py-2 px-3 rounded-md text-sm ${isActive('/active-students') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><UserCheck size={14} className="mr-2" />Active Students</Link>
                        <Link to="/expired-memberships" className={`flex items-center py-2 px-3 rounded-md text-sm ${isActive('/expired-memberships')? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><AlertTriangle size={14} className="mr-2" />Expired Members</Link>
                        <Link to="/inactive-students" className={`flex items-center py-2 px-3 rounded-md text-sm ${isActive('/inactive-students') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><ToggleLeft size={14} className="mr-2" />Inactive Students</Link>
                      </div>
                    )}
                    {!effectiveIsCollapsed && item.hasDropdown && showHostelDropdown && item.label === 'Hostel Students' && (
                      <div className="ml-9 mt-1 space-y-0.5 animate-fade-in">
                        <Link to="/hostel-dashboard" className={`block py-2 px-3 rounded-md text-sm ${isActive('/hostel-dashboard') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Hostel Dashboard</Link>
                        <Link to="/hostel/active-students" className={`flex items-center py-2 px-3 rounded-md text-sm ${isActive('/hostel/active-students') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}><UserCheck size={14} className="mr-2" />Active Students</Link>
                        <Link to="/hostel/collections" className={`block py-2 px-3 rounded-md text-sm ${isActive('/hostel/collections') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Collection & Due</Link>
                        <Link to="/hostel/expired" className={`block py-2 px-3 rounded-md text-sm ${isActive('/hostel/expired') ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Expired Memberships</Link>
                        <Link to="/hostel" className={`block py-2 px-3 rounded-md text-sm ${isActive('/hostel') && location.pathname.split('/').length === 2 ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'}`} onClick={() => isMobile && setIsSidebarOpen(false)}>Student Management</Link>
                      </div>
                    )}
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button
            className={`group flex items-center w-full px-3 py-2.5 rounded-lg text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors ${
              effectiveIsCollapsed ? 'justify-center' : ''
            }`}
            onClick={handleLogout}
          >
            <LogOut size={20} className={`text-gray-500 group-hover:text-teal-600 ${effectiveIsCollapsed ? '' : 'mr-3'}`} />
            {!effectiveIsCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
