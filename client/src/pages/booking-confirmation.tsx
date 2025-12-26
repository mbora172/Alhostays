import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Mail, Phone, Calendar, Home } from "lucide-react";

export default function BookingConfirmation() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const type = params.get("type");

  const isRequest = type === "request";

  return (
    <div className="min-h-screen pt-20 md:pt-24 pb-12 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
        <Card className="p-8 md:p-12">
          <CardContent className="p-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              {isRequest ? (
                <Clock className="h-10 w-10 text-primary" />
              ) : (
                <CheckCircle className="h-10 w-10 text-primary" />
              )}
            </div>

            <h1 
              className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4"
              data-testid="text-confirmation-title"
            >
              {isRequest ? "Booking Request Submitted!" : "Booking Confirmed!"}
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
              {isRequest ? (
                "Thank you for your booking request. We'll review your reservation and send you a payment link within 24 hours."
              ) : (
                "Mahalo! Your reservation has been confirmed. You'll receive a confirmation email with all the details shortly."
              )}
            </p>

            <div className="bg-card border border-border rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-foreground mb-4">What's Next?</h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Check your email</p>
                    <p className="text-sm text-muted-foreground">
                      {isRequest 
                        ? "We'll send a payment link to complete your booking"
                        : "Confirmation details and check-in instructions have been sent"
                      }
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
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Questions?</p>
                    <p className="text-sm text-muted-foreground">
                      Contact us at (808) 555-0123 or info@alohastays.com
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <Button size="lg" data-testid="button-home">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/properties">
                <Button variant="outline" size="lg" data-testid="button-view-properties">
                  View Properties
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
