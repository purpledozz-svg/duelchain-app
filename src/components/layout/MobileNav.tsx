import { Link, useLocation } from 'react-router-dom';
import { Home, Gamepad2, Trophy, User } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const MobileNav = () => {
  const location = useLocation();
  const { currentPlayer } = useStore();

  const profilePath = currentPlayer ? `/profile/${currentPlayer.username}` : '/lobby';

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/lobby', icon: Gamepad2, label: 'Lobby' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
    { path: profilePath, icon: User, label: currentPlayer ? currentPlayer.username.slice(0, 8) : 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary/90 backdrop-blur-xl border-t border-glass-border">
      <div className="grid grid-cols-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === profilePath && location.pathname.startsWith('/profile/'));

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`relative flex flex-col items-center justify-center py-3 transition-all duration-200 ${
                isActive ? 'text-white' : 'text-white/50'
              }`}
            >
              <Icon size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-body mt-1 truncate max-w-[48px] text-center">
                {item.label}
              </span>
              {isActive && (
                <div
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #B026FF, #FF267A, #FF4040)',
                    boxShadow: '0 0 10px rgba(255,38,122,0.6)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
