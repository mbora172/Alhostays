import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import Booking from "@/pages/booking";
import BookingConfirmation from "@/pages/booking-confirmation";
import Contact from "@/pages/contact";
import About from "@/pages/about";
import Policies from "@/pages/policies";
import NotFound from "@/pages/not-found";
import { ScrollToTop } from "@/components/scroll-to-top";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/property/:slug" component={PropertyDetail} />
      <Route path="/booking" component={Booking} />
      <Route path="/booking-confirmation" component={BookingConfirmation} />
      <Route path="/contact" component={Contact} />
      <Route path="/about" component={About} />
      <Route path="/policies" component={Policies} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow"
          >
            Skip to content
          </a>
          <Navigation />
          <main id="main" className="flex-1">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
