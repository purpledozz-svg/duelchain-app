import { Link, useLocation } from "react-router-dom";
import { Trophy, Gamepad2, Home, User } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { DuelchainConnectButton } from "../wallet/DuelchainConnectButton";
import { useStore } from "../../store/useStore";
import { PlayerAvatar } from "../ui/PlayerAvatar";
import { DuelchainLogo } from "../ui/DuelchainLogo";

export const Header = ({ onOpenAccountModal }: { onOpenAccountModal?: () => void }) => {
  const location = useLocation();
  const { currentPlayer } = useStore();

  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 100],
    ['rgba(10, 10, 15, 0.55)', 'rgba(10, 10, 15, 0.88)']
  );
  const headerBorder = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.07)']
  );
  const headerBlur = useTransform(scrollY, [0, 100], [12, 20]);

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/lobby", label: "Lobby", icon: Gamepad2 },
    { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <motion.header
      style={{
        backgroundColor: headerBg,
        borderBottomColor: headerBorder,
        backdropFilter: useTransform(headerBlur, (v) => `blur(${v}px)`),
        WebkitBackdropFilter: useTransform(headerBlur, (v) => `blur(${v}px)`),
      }}
      className="fixed top-0 left-0 right-0 z-50 border-b"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/home" className="flex items-center space-x-3 group">
            <DuelchainLogo size={48} glow />
            <span className="text-xl font-heading text-white tracking-wide group-hover:duel-gradient transition-all duration-300">
              DUELCHAIN
            </span>
          </Link>

          {/* Glass segmented nav — Figma reference */}
          <nav className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl p-1.5 border border-white/20 shadow-xl shadow-black/40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-300 ease-out ${
                    active
                      ? "bg-white/90 shadow-md shadow-white/15"
                      : "bg-transparent hover:bg-white/5"
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2 : 1.5}
                    className={`transition-all duration-300 ${
                      active ? "text-gray-900" : "text-white/60"
                    }`}
                  />
                  <span
                    className={`font-body font-medium text-sm transition-all duration-300 ${
                      active ? "text-gray-900" : "text-white/60"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {currentPlayer ? (
              <Link
                to={`/profile/${currentPlayer.username}`}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:bg-white/[0.05]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                title={`Your profile: ${currentPlayer.username}`}
              >
                <PlayerAvatar
                  username={currentPlayer.username}
                  avatarUrl={currentPlayer.avatar_url}
                  size={24}
                  shape="circle"
                />
                <span className="font-heading text-sm text-white/80 font-semibold">
                  {currentPlayer.username}
                </span>
              </Link>
            ) : (
              <button
                onClick={() => onOpenAccountModal?.()}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body text-white/40 hover:text-white/70 transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <User size={12} strokeWidth={1.8} />
                <span>No profile</span>
              </button>
            )}

            <DuelchainConnectButton />
          </div>
        </div>
      </div>
    </motion.header>
  );
};
