import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WelcomeAnimationProps {
  userName: string;
  userPhoto?: string | null;
  onComplete: () => void;
}

export function WelcomeAnimation({ userName, userPhoto, onComplete }: WelcomeAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Auto-hide after 2 seconds and call onComplete
    const timer = setTimeout(() => {
      setShow(false);
      // Wait for fade-out animation to complete before calling onComplete
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-lg transition-all duration-500 ${
        show ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-10 p-8 md:p-12">
        {/* Profile Picture with Animation */}
        <div
          className={`relative transition-all duration-700 ${
            show
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 -translate-y-4'
          }`}
          style={{ animationDelay: '0.1s' }}
        >
          {/* Enhanced Glow effect behind avatar */}
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-[80px] scale-[2] animate-pulse" />
          
          {/* Avatar - Increased size */}
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary/30 shadow-2xl relative z-10">
            <AvatarImage src={userPhoto || undefined} alt={userName} />
            <AvatarFallback className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>

          {/* Enhanced Sparkle effect */}
          <div className="absolute -top-2 -right-2 h-8 w-8 animate-ping">
            <div className="h-full w-full rounded-full bg-accent opacity-75" />
          </div>
        </div>

        {/* Welcome Text with Animation - Increased sizes */}
        <div
          className={`text-center space-y-3 transition-all duration-700 delay-200 ${
            show
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-heading font-bold tracking-tight">
            Hi, {userName}
            <span className="inline-block animate-wave ml-3 text-5xl md:text-6xl">👋</span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            Welcome back!
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top left gradient */}
          <div className="absolute -top-40 -left-40 h-80 w-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          
          {/* Bottom right gradient */}
          <div className="absolute -bottom-40 -right-40 h-80 w-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>
    </div>
  );
}
