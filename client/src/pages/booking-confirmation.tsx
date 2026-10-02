import { Link, useSearch } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Mail, Phone, Calendar, Home, Download, Loader2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { getPropertyBySlug } from "@/lib/property-data";
import { usePageTitle } from "@/hooks/use-page-title";
import { isIsoDate } from "@shared/catalog";

/** A one-event .ics file the guest can add to their own calendar. */
function tripCalendarHref(name: string, address: string, checkIn: string, checkOut: string, ref: string) {
  const d = (s: string) => s.replace(/-/g, "");
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aloha Stays//Guest Trip//EN",
    "BEGIN:VEVENT",
    `UID:trip-${ref}@alohastays`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${d(checkIn)}`,
    `DTEND;VALUE=DATE:${d(checkOut)}`,
    `SUMMARY:${esc(`Aloha Stays - ${name}`)}`,
    `LOCATION:${esc(address)}`,
    `DESCRIPTION:${esc(`Booking reference ${ref}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export default function BookingConfirmation() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const type = params.get("type");
  const ref = params.get("ref") ?? "";
  const property = getPropertyBySlug(params.get("property") ?? "");
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const total = params.get("total");
  const hasTrip = !!property && isIsoDate(checkIn) && isIsoDate(checkOut);

  const sessionId = params.get("session_id");

  // For card payments, ask the server (which asks Stripe) whether the payment
  // went through. Re-check briefly while Stripe finishes processing.
  const [polls, setPolls] = useState(0);
  const { data: payment, isError: paymentCheckFailed } = useQuery<{ outcome: string }>({
    queryKey: [`/api/checkout/${sessionId}/status`],
    enabled: type === "paid" && !!sessionId,
    refetchInterval: (query) => {
      const outcome = query.state.data?.outcome;
      return (outcome === "processing" || outcome === "unpaid") && polls < 10 ? 2000 : false;
    },
    staleTime: 0,
  });
  useEffect(() => {
    if (payment) setPolls((n) => n + 1);
  }, [payment]);

  type View = "request" | "checking" | "confirmed" | "processing" | "failed";
  const view: View =
    type !== "paid"
      ? "request"
      : !sessionId || paymentCheckFailed
        ? "processing"
        : !payment
          ? "checking"
          : payment.outcome === "confirmed"
            ? "confirmed"
            : payment.outcome === "processing" || (payment.outcome === "unpaid" && polls < 10)
              ? "processing"
              : "failed";

  const copy: Record<View, { title: string; body: string; next: string }> = {
    request: {
      title: "Booking Request Submitted!",
      body: "Thank you for your booking request. We'll review your reservation and send you a payment link within 24 hours.",
      next: "We'll email a secure payment link to complete your booking, then check-in instructions before you arrive",
    },
    checking: {
      title: "Confirming your payment...",
      body: "This only takes a moment.",
      next: "We'll email check-in instructions 24-48 hours before you arrive",
    },
    confirmed: {
      title: "Booking Confirmed!",
      body: "Mahalo! Your payment went through and your stay is confirmed.",
      next: "We'll email check-in instructions 24-48 hours before you arrive",
    },
    processing: {
      title: "Payment Processing",
      body: "Your payment is being processed. Your dates are held and you'll get an email from us once it's complete.",
      next: "We'll email you as soon as the payment completes, then check-in instructions before you arrive",
    },
    failed: {
      title: "Payment Not Completed",
      body: "Your payment didn't go through, so no charge was made and the dates were released. Please try again or contact us.",
      next: "If you were charged, contact us and we'll sort it out right away",
    },
  };
  usePageTitle(copy[view].title.replace(/[!.]+$/, ""));

  return (
    <div className="min-h-screen pt-20 md:pt-24 pb-12 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
        <Card className="p-8 md:p-12">
          <CardContent className="p-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              {view === "checking" ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : view === "confirmed" ? (
                <CheckCircle className="h-10 w-10 text-primary" />
              ) : view === "failed" ? (
                <XCircle className="h-10 w-10 text-destructive" />
              ) : (
                <Clock className="h-10 w-10 text-primary" />
              )}
            </div>

            <h1 
              className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4"
              data-testid="text-confirmation-title"
            >
              {copy[view].title}
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              {copy[view].body}
            </p>

            {view === "failed" && property && (
              <Button asChild size="lg" className="mb-8" data-testid="button-try-again">
                <Link href={`/property/${property.slug}`}>Choose dates again</Link>
              </Button>
            )}

            {hasTrip && view !== "failed" && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-6 text-left" data-testid="card-trip-summary">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Your stay</p>
                    <p className="font-serif text-xl font-semibold text-foreground">{property!.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(parseISO(checkIn), "EEE, MMM d")} - {format(parseISO(checkOut), "EEE, MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    {ref && (
                      <>
                        <p className="text-sm text-muted-foreground">Reference</p>
                        <p className="font-mono font-semibold text-foreground" data-testid="text-booking-ref">{ref}</p>
                      </>
                    )}
                    {total && <p className="text-sm text-muted-foreground mt-1">Total ${total}</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-foreground mb-4">What's Next?</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Check your email</p>
                    <p className="text-sm text-muted-foreground">
                      {copy[view].next}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Save the date</p>
                    <p className="text-sm text-muted-foreground">
                      Add your trip to your calendar so you don't forget!
                    </p>
                    {hasTrip && view !== "failed" && (
                      <a
                        href={tripCalendarHref(property!.name, property!.address, checkIn, checkOut, ref)}
                        download={`aloha-stays-${property!.slug}.ics`}
                        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                        data-testid="link-add-to-calendar"
                      >
                        <Download className="h-4 w-4" />
                        Add to calendar
                      </a>
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Questions?</p>
                    <p className="text-sm text-muted-foreground">
                      Call <a href="tel:+18085550123" className="text-primary hover:underline">(808) 555-0123</a> or email{" "}
                      <a href="mailto:info@alohastays.com" className="text-primary hover:underline">info@alohastays.com</a>
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" data-testid="button-home">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" data-testid="button-view-properties">
                <Link href="/properties">View Properties</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
