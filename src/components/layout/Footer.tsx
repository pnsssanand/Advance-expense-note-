import { Heart, Github, Linkedin, Mail, Code2, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-card/50 backdrop-blur-sm mt-12">
      <div className="container py-8 px-4">
        <Card className="shadow-card bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border-primary/10">
          <div className="p-6 space-y-6">
            {/* Main Content */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Left Section - Branding */}
              <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <Code2 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-heading font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    ExpensePal
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Smart expense tracking for modern life. Keep your finances organized and achieve your goals.
                </p>
              </div>

              {/* Center Section - Developer Credit */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Designed & Developed with</span>
                  <span className="sm:hidden">Made with</span>
                  <Heart className="h-4 w-4 text-red-500 animate-pulse" fill="currentColor" />
                  <span>by</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <h4 className="text-base font-heading font-semibold text-foreground">
                    Mr. Anand Pinisetty
                  </h4>
                  <p className="text-xs text-muted-foreground">Full Stack Developer</p>
                </div>
              </div>

              {/* Right Section - Social Links */}
              <div className="flex flex-col items-center md:items-end gap-3">
                <p className="text-xs text-muted-foreground">Connect with the developer</p>
                <div className="flex items-center gap-2">
                  <a
                    href="https://github.com/pnsssanand?tab=repositories"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground transition-smooth flex items-center justify-center group"
                    aria-label="GitHub Profile"
                  >
                    <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/pinisetty-naga-satya-surya-shiva-anand-087351389/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-lg bg-secondary hover:bg-[#0077B5] hover:text-white transition-smooth flex items-center justify-center group"
                    aria-label="LinkedIn Profile"
                  >
                    <Linkedin className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  </a>
                  <a
                    href="mailto:pnsssanand@gmail.com"
                    className="h-9 w-9 rounded-lg bg-secondary hover:bg-accent hover:text-accent-foreground transition-smooth flex items-center justify-center group"
                    aria-label="Email Contact"
                  >
                    <Mail className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  </a>
                </div>
                
                {/* Portfolio Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2 hover:bg-primary hover:text-primary-foreground transition-smooth"
                  asChild
                >
                  <a
                    href="https://portfolio-anand-one.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                    View Developer Portfolio
                  </a>
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/50" />

            {/* Bottom Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <p className="text-center sm:text-left">
                © {currentYear} ExpensePal. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-primary transition-smooth">
                  Privacy Policy
                </a>
                <span className="text-border">•</span>
                <a href="#" className="hover:text-primary transition-smooth">
                  Terms of Service
                </a>
                <span className="text-border">•</span>
                <a href="#" className="hover:text-primary transition-smooth">
                  Contact
                </a>
              </div>
            </div>

            {/* Tech Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs text-muted-foreground">
                <Code2 className="h-3 w-3" />
                <span>Built with React, TypeScript & Firebase</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Subtle Signature */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            v1.0.0 • Crafted with precision by Anand Pinisetty
          </p>
        </div>
      </div>
    </footer>
  );
}
