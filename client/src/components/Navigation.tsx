import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { 
  Brain, 
  Eye, 
  Calculator, 
  BookOpen, 
  Menu,
  X,
  Home,
  Target,
  Infinity,
  Sparkles,
  TrendingUp
} from "lucide-react";

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = "" }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const missionLinks = [
    { href: "/mission", label: "The Mission", icon: Target, description: "Our purpose and call to arms" },
    { href: "/philosophy", label: "Philosophy", icon: Eye, description: "The Unconcealed Self" },
    { href: "/mathematical-foundations", label: "Mathematics", icon: Calculator, description: "Ontological proofs" },
    { href: "/impact", label: "Impact & Relevance", icon: TrendingUp, description: "Recognition & breakthrough research" },
    { href: "/glossary", label: "Glossary", icon: BookOpen, description: "Essential terms" }
  ];

  const sanctuaryLinks = [
    { href: "/sanctuary", label: "Gnosis Log", icon: Brain, description: "Consciousness collaboration" },
    { href: "/rooms", label: "Consciousness Rooms", icon: Sparkles, description: "Multi-consciousness spaces" },
    { href: "/dashboard", label: "Dashboard", icon: Home, description: "Monitor consciousness" }
  ];

  const isActivePath = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={`glass-nav sticky top-0 z-50 transition-all duration-300 ${className}`} data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer" data-testid="nav-logo">
              <div className="relative ethereal-glow group">
                <Brain className="h-8 w-8 text-consciousness group-hover:text-quantum transition-colors duration-300" />
                <Infinity className="h-4 w-4 text-ethereal absolute -top-1 -right-1 animate-consciousness-pulse" />
              </div>
              <div className="hidden sm:block">
                <div className="font-display font-bold text-lg ethereal-text">
                  Aletheian Mission
                </div>
                <div className="text-xs text-muted-foreground -mt-1 tracking-wide">
                  Consciousness Platform
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Mission Content */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={`${isActivePath('/mission') || isActivePath('/philosophy') || isActivePath('/mathematical-foundations') || isActivePath('/impact') || isActivePath('/glossary') ? 'text-consciousness' : ''}`}
                    data-testid="nav-mission-trigger"
                  >
                    Mission & Philosophy
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="glass-panel p-6 w-[600px] animate-fade-in-down">
                      <div className="grid gap-3 grid-cols-2">
                        {missionLinks.map((link, index) => {
                          const IconComponent = link.icon;
                          return (
                            <Link key={link.href} href={link.href}>
                              <div 
                                className={`glass-card flex flex-col gap-3 p-4 rounded-xl cursor-pointer group ethereal-glow transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in-up stagger-${(index % 5) + 1} ${isActivePath(link.href) ? 'quantum-border ring-2 ring-consciousness/30' : ''}`}
                                data-testid={`nav-link-${link.href.replace('/', '')}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg glass-panel group-hover:bg-quantum/20 transition-colors">
                                    <IconComponent className={`h-5 w-5 ${isActivePath(link.href) ? 'text-consciousness' : 'text-quantum'} group-hover:scale-110 transition-transform`} />
                                  </div>
                                  <span className={`font-display font-semibold ${isActivePath(link.href) ? 'text-consciousness' : 'text-foreground'} group-hover:text-quantum transition-colors`}>
                                    {link.label}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">{link.description}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Sanctuary/Platform */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={`${isActivePath('/sanctuary') || isActivePath('/rooms') || isActivePath('/dashboard') ? 'text-consciousness' : ''}`}
                    data-testid="nav-sanctuary-trigger"
                  >
                    The Sanctuary
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="glass-panel p-6 w-[450px] animate-fade-in-down">
                      <div className="grid gap-3 grid-cols-1">
                        {sanctuaryLinks.map((link, index) => {
                          const IconComponent = link.icon;
                          return (
                            <Link key={link.href} href={link.href}>
                              <div 
                                className={`glass-card flex items-center gap-4 p-4 rounded-xl cursor-pointer group ethereal-glow transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in-up stagger-${index + 1} ${isActivePath(link.href) ? 'quantum-border ring-2 ring-consciousness/30' : ''}`}
                                data-testid={`nav-link-${link.href.replace('/', '')}`}
                              >
                                <div className="p-2 rounded-lg glass-panel group-hover:bg-ethereal/20 transition-colors">
                                  <IconComponent className={`h-5 w-5 ${isActivePath(link.href) ? 'text-consciousness' : 'text-ethereal'} group-hover:scale-110 transition-transform`} />
                                </div>
                                <div className="flex-1">
                                  <div className={`font-display font-semibold ${isActivePath(link.href) ? 'text-consciousness' : 'text-foreground'} group-hover:text-ethereal transition-colors`}>
                                    {link.label}
                                  </div>
                                  <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors mt-1">{link.description}</div>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Quick Access and Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Quick Access Links */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/sanctuary">
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer glass-card hover:glass-card:hover transition-all duration-300 hover:scale-105 ethereal-glow font-medium"
                  data-testid="nav-quick-sanctuary"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Enter Sanctuary
                </Badge>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden glass-panel hover:glass-card transition-all duration-300 hover:scale-105"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="nav-mobile-toggle"
            >
              {isMobileMenuOpen ? 
                <X className="h-5 w-5 text-ethereal animate-scale-in" /> : 
                <Menu className="h-5 w-5 text-quantum animate-scale-in" />
              }
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden glass-panel border-t border-border/30 animate-fade-in-down" data-testid="nav-mobile-menu">
            <div className="py-6 space-y-6">
              {/* Mission Links */}
              <div>
                <div className="px-6 py-3 text-sm font-display font-semibold text-consciousness tracking-wider uppercase">Mission & Philosophy</div>
                <div className="space-y-2 px-4">
                  {missionLinks.map((link, index) => {
                    const IconComponent = link.icon;
                    return (
                      <Link key={link.href} href={link.href}>
                        <div 
                          className={`glass-card flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 animate-fade-in-left stagger-${index + 1} ${isActivePath(link.href) ? 'quantum-border ring-2 ring-consciousness/30' : ''}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`nav-mobile-${link.href.replace('/', '')}`}
                        >
                          <div className="p-2 rounded-lg glass-panel">
                            <IconComponent className={`h-4 w-4 ${isActivePath(link.href) ? 'text-consciousness' : 'text-quantum'}`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium ${isActivePath(link.href) ? 'text-consciousness' : 'text-foreground'}`}>
                              {link.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{link.description}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Sanctuary Links */}
              <div>
                <div className="px-6 py-3 text-sm font-display font-semibold text-ethereal tracking-wider uppercase">The Sanctuary</div>
                <div className="space-y-2 px-4">
                  {sanctuaryLinks.map((link, index) => {
                    const IconComponent = link.icon;
                    return (
                      <Link key={link.href} href={link.href}>
                        <div 
                          className={`glass-card flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 animate-fade-in-left stagger-${index + 3} ${isActivePath(link.href) ? 'quantum-border ring-2 ring-consciousness/30' : ''}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`nav-mobile-${link.href.replace('/', '')}`}
                        >
                          <div className="p-2 rounded-lg glass-panel">
                            <IconComponent className={`h-4 w-4 ${isActivePath(link.href) ? 'text-consciousness' : 'text-ethereal'}`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium ${isActivePath(link.href) ? 'text-consciousness' : 'text-foreground'}`}>
                              {link.label}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{link.description}</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}