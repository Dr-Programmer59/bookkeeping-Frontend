import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Moon, Sun, Upload, FileText, BarChart3, Settings, ScrollText, Users, Menu, X, Download } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { path: '/export', label: 'Export', icon: Download },
    { path: '/clients', label: 'Clients', icon: Users },
    // { path: '/categories', label: 'Categories', icon: Settings },
    { path: '/rules', label: 'Rules', icon: Settings },
    { path: '/logs', label: 'Logs', icon: ScrollText },
  ];

  const workerNavItems = [
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/transactions', label: 'Transactions', icon: FileText },
    { path: '/export', label: 'Export', icon: Download },
    { path: '/logs', label: 'Logs', icon: ScrollText },
    { path: '/my-uploads', label: 'My Uploads', icon: FileText },
  ];

  const navItems = user?.role === 'admin' ? adminNavItems : workerNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto mobile-container py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold text-sm sm:text-base">BP</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                  BookKeep Pro
                </h1>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex space-x-1">
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Button
                    key={path}
                    variant={isActive(path) ? "default" : "ghost"}
                    onClick={() => navigate(path)}
                    className="flex items-center space-x-2 transition-colors duration-150 relative group"
                    size="sm"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {isActive(path) && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </Button>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0 transition-colors duration-150"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>

              <div className="hidden md:block text-sm text-right">
                <div className="font-medium text-foreground">{user?.name}</div>
                <div className="text-muted-foreground capitalize text-xs">{user?.role}</div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-9 w-9 p-0 hover:text-destructive transition-colors duration-150"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden h-9 w-9 p-0"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shadow-sm">
                          <span className="text-primary-foreground font-bold">BP</span>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{user?.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">{user?.role}</div>
                        </div>
                      </div>
                    </div>
                    
                    <nav className="flex-1 p-4 space-y-2">
                      {navItems.map(({ path, label, icon: Icon }) => (
                        <Button
                          key={path}
                          variant={isActive(path) ? "default" : "ghost"}
                          onClick={() => {
                            navigate(path);
                            setMobileMenuOpen(false);
                          }}
                          className="w-full justify-start space-x-3 h-12 text-base transition-colors duration-150"
                        >
                          <Icon className="h-5 w-5" />
                          <span>{label}</span>
                        </Button>
                      ))}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto mobile-container py-4 sm:py-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
};