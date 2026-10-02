import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

const sections = [
  {
    id: "cancellation",
    title: "Cancellation Policy",
    body: [
      "Free cancellation up to 48 hours before check-in.",
      "Cancellations made less than 48 hours before check-in are charged for one night. The rest of the stay is refunded.",
      "To cancel or change a booking, contact us by email or phone with your name and dates.",
    ],
  },
  {
    id: "terms",
    title: "Terms of Service",
    body: [
      "Bookings are for the guests named on the reservation, up to the property's maximum capacity.",
      "Check-in and check-out times and house rules are listed on each property page. Smoking, parties and pets are not allowed.",
      "Pay Later bookings are held as requests until payment is received. We send a payment link within 24 hours.",
      "Our calendars sync with other booking platforms. In the rare case that dates are booked elsewhere at the same moment, we will contact you right away and refund any payment in full.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    body: [
      "We collect only the details needed to manage your stay: your name, email, phone number, country and any requests you share.",
      "We use them to confirm your booking, send check-in instructions and answer your questions. We never sell your information.",
      "Our public availability calendars show which dates are booked, never who booked them.",
      "To see or delete the information we hold about you, contact us at info@alohastays.com.",
    ],
  },
];

export default function Policies() {
  usePageTitle("Policies");

  return (
    <div className="min-h-screen pt-20 md:pt-24 pb-16">
      <section className="py-12 md:py-16 bg-card">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Policies</h1>
          <p className="text-lg text-muted-foreground">
            The fine print, kept short. Questions?{" "}
            <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
              Get in touch
            </Link>
            .
          </p>
          <nav className="mt-8 flex flex-wrap justify-center gap-3" aria-label="Policy sections">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-12">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">{s.title}</h2>
            <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc pl-5 marker:text-primary">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
