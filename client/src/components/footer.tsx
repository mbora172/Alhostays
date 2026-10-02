import { Link } from "wouter";
import { MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="md:col-span-2">
            <span className="font-serif text-2xl font-semibold text-foreground">
              Aloha <span className="text-primary">Stays</span>
            </span>
            <p className="mt-4 text-muted-foreground max-w-md">
              Experience the best of Waikiki with our beautifully appointed vacation rentals. 
              Prime location, stunning views, and all the comforts of home.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Waikiki, Honolulu, HI</span>
              </div>
              <a href="tel:+18085550123" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-5 w-5 text-primary" />
                <span>(808) 555-0123</span>
              </a>
              <a href="mailto:info@alohastays.com" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-5 w-5 text-primary" />
                <span>info@alohastays.com</span>
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">Quick Links</h2>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/properties" className="text-muted-foreground hover:text-foreground transition-colors">
                  Our Properties
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">Support</h2>
            <ul className="space-y-3">
              <li>
                <Link href="/contact#faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/policies#cancellation" className="text-muted-foreground hover:text-foreground transition-colors">
                  Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/policies#terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/policies#privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Aloha Stays. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with aloha in Hawaii
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
