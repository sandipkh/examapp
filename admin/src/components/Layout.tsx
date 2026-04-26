import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const NAV_ITEMS = {
  superadmin: [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Questions', path: '/questions', icon: '📝' },
    { label: 'Create Question', path: '/questions/create', icon: '➕' },
    { label: 'Upload CSV', path: '/upload-csv', icon: '📤' },
    { label: 'Review Queue', path: '/review', icon: '✅' },
    { label: 'Review History', path: '/reviewed-history', icon: '📋' },
    { label: 'User Management', path: '/users', icon: '👥' },
  ],
  maker: [
    { label: 'My Questions', path: '/questions', icon: '📝' },
    { label: 'Create Question', path: '/questions/create', icon: '➕' },
    { label: 'Upload CSV', path: '/upload-csv', icon: '📤' },
  ],
  checker: [
    { label: 'Review Queue', path: '/review', icon: '✅' },
    { label: 'Review History', path: '/reviewed-history', icon: '📋' },
  ],
} as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role, name, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const items = NAV_ITEMS[(role as keyof typeof NAV_ITEMS) ?? 'maker'] ?? NAV_ITEMS.maker;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col">
        <div className="p-4">
          <h1 className="text-lg font-bold">UPSC Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">{name}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
            {role}
          </span>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
