import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Home, 
  Lightbulb, 
  FolderKanban, 
  Users, 
  User,
  LogOut,
  Database,
  GitBranch,
  ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Home', icon: Home, href: '/dashboard' },
  { label: 'Ideas', icon: Lightbulb, href: '/ideas' },
  { label: 'Review', icon: ClipboardCheck, href: '/review' },
  { label: 'Projects', icon: FolderKanban, href: '/projects' },
  { label: 'Teams', icon: Users, href: '/teams' },
  { label: 'Crunch', icon: Database, href: '/crunch' },
  { label: 'Flow', icon: GitBranch, href: '/flow' },
  { label: 'Account', icon: User, href: '/account' },
];

interface AppSidebarProps {
  userName?: string;
  companyName?: string;
}

export function AppSidebar({ userName = 'Demo User', companyName = 'Demo Company' }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/account') {
      return location.pathname.startsWith('/account');
    }
    if (href === '/ideas') {
      return location.pathname.startsWith('/ideas');
    }
    if (href === '/projects') {
      return location.pathname.startsWith('/projects');
    }
    if (href === '/review') {
      return location.pathname.startsWith('/review');
    }
    return location.pathname === href;
  };

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm fixed left-0 top-0 bottom-0 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-border">
        <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-display font-bold text-foreground">Fusion AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Account Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{companyName}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/')}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
