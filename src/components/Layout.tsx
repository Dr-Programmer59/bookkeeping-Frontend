import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Moon, Sun, Upload, FileText, BarChart3, Settings, ScrollText, Users } from 'lucide-react';
import { useState } from 'react';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path: string) => location.pathname === path;

  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/transactions', label: 'Transactions', icon: FileText },
    { path: '/clients', label: 'Clients', icon: Users },
    // { path: '/categories', label: 'Categories', icon: Settings },
    { path: '/rules', label: 'Rules', icon: Settings },
    { path: '/logs', label: 'Logs', icon: ScrollText },
  ];

  const workerNavItems = [
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/transactions', label: 'Transactions', icon: FileText },
    { path: '/logs', label: 'Logs', icon: ScrollText },

    { path: '/my-uploads', label: 'My Uploads', icon: FileText },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : workerNavItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">BP</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">BookKeep Pro</h1>
              </div>

              <nav className="hidden md:flex space-x-2">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Button
                    key={path}
                    variant={isActive(path) ? "default" : "ghost"}
                    onClick={() => navigate(path)}
                    className="flex items-center space-x-2 transition-all duration-200"
                    size="sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Button>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <div className="hidden sm:block text-sm text-right">
                <div className="font-medium text-foreground">{user?.name}</div>
                <div className="text-muted-foreground capitalize text-xs">{user?.role}</div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 p-0"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 lg:py-8 animate-in">
        <Outlet />
      </main>
    </div>
  );
};