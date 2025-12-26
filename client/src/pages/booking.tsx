import { useLocation, useSearch } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarDays, 
  Users, 
  CreditCard, 
  Clock,
  Check,
  ArrowLeft
} from "lucide-react";
import { getPropertyById } from "@/lib/property-data";
import { bookingFormSchema, type BookingFormData } from "@shared/schema";
import { differenceInDays, format, parseISO } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Booking() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const propertyId = params.get("propertyId");
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const guestsParam = params.get("guests");

  const property = propertyId ? getPropertyById(propertyId) : null;
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      guestCountry: "",
      specialRequests: "",
      paymentMethod: "card",
    },
  });

  // Calculate pricing with validation
  const nights = (() => {
    if (!checkIn || !checkOut) return 0;
    try {
      const diff = differenceInDays(parseISO(checkOut), parseISO(checkIn));
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  })();

  const calculatePricing = () => {
    if (!property || nights <= 0) return null;
    
    let discount = 0;
    if (nights >= 30 && property.monthlyDiscount) {
      discount = property.monthlyDiscount;
    } else if (nights >= 7 && property.weeklyDiscount) {
      discount = property.weeklyDiscount;
    }

    const subtotal = property.nightlyRate * nights;
    const discountAmount = Math.round(subtotal * (discount / 100));
    const discountedSubtotal = subtotal - discountAmount;
    const serviceFee = Math.round(discountedSubtotal * 0.12);
    const taxes = Math.round((discountedSubtotal + serviceFee) * 0.0425);
    const total = discountedSubtotal + property.cleaningFee + serviceFee + taxes;

    return {
      subtotal,
      discount,
      discountAmount,
      discountedSubtotal,
      cleaningFee: property.cleaningFee,
      serviceFee,
      taxes,
      total,
      nightlyRate: property.nightlyRate
    };
  };

  const pricing = calculatePricing();

  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      if (!property || !pricing || !checkIn || !checkOut) {
        throw new Error("Missing booking information");
      }

      const bookingData = {
        propertyId: property.id,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        guestCountry: data.guestCountry || "",
        checkIn,
        checkOut,
        guests: parseInt(guestsParam || "2"),
        specialRequests: data.specialRequests || "",
        nightlyRate: pricing.nightlyRate,
        nights,
        cleaningFee: pricing.cleaningFee,
        serviceFee: pricing.serviceFee,
        taxes: pricing.taxes,
        total: pricing.total,
        status: data.paymentMethod === "pay_later" ? "pending_payment" : "pending",
        paymentMethod: data.paymentMethod,
      };

      return apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: (response, variables) => {
      if (variables.paymentMethod === "pay_later") {
        toast({
          title: "Booking Request Submitted",
          description: "We'll send you a payment link within 24 hours. Mahalo!",
        });
        setLocation("/booking-confirmation?type=request");
      } else {
        toast({
          title: "Booking Confirmed",
          description: "Your reservation has been confirmed. Check your email for details.",
        });
        setLocation("/booking-confirmation?type=confirmed");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    bookingMutation.mutate(data);
  };

  if (!property || !checkIn || !checkOut || !pricing) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Invalid Booking Request
          </h1>
          <p className="text-muted-foreground mb-6">
            Please select a property and dates to continue.
          </p>
          <Button onClick={() => setLocation("/properties")}>
            View Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 md:pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation(`/property/${property.slug}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to property
        </Button>

        <h1 
          className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8"
          data-testid="text-booking-title"
        >
          Complete Your Booking
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Guest Form */}
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Guest Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Guest Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="guestName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John Smith" 
                              {...field} 
                              data-testid="input-guest-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="guestEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="john@example.com" 
                                {...field}
                                data-testid="input-guest-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="guestPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone *</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                placeholder="+1 (555) 000-0000" 
                                {...field}
                                data-testid="input-guest-phone"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="guestCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="United States" 
                              {...field}
                              data-testid="input-guest-country"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialRequests"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requests</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any special requests or questions..."
                              className="resize-none"
                              rows={4}
                              {...field}
                              data-testid="input-special-requests"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Payment Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="space-y-4"
                            >
                              <div 
                                className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                                  field.value === "card" 
                                    ? "border-primary bg-primary/5" 
                                    : "border-border"
                                }`}
                                onClick={() => field.onChange("card")}
                              >
                                <RadioGroupItem value="card" id="card" className="mt-1" />
                                <Label htmlFor="card" className="flex-1 cursor-pointer">
                                  <div className="font-medium text-foreground">
                                    Pay Now with Card
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Secure payment via Stripe. Instant confirmation.
                                  </p>
                                </Label>
                                <CreditCard className="h-5 w-5 text-muted-foreground" />
                              </div>

                              <div 
                                className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                                  field.value === "pay_later" 
                                    ? "border-primary bg-primary/5" 
                                    : "border-border"
                                }`}
                                onClick={() => field.onChange("pay_later")}
                              >
                                <RadioGroupItem value="pay_later" id="pay_later" className="mt-1" />
                                <Label htmlFor="pay_later" className="flex-1 cursor-pointer">
                                  <div className="font-medium text-foreground">
                                    Pay Later
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Submit your request and we'll send a payment link within 24 hours.
                                  </p>
                                </Label>
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Terms */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>By completing this booking, you agree to:</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>House rules for this property</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Aloha Stays cancellation policy (free cancellation 48hrs before check-in)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Terms of Service and Privacy Policy</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full py-6 text-lg"
                  disabled={bookingMutation.isPending}
                  data-testid="button-submit-booking"
                >
                  {bookingMutation.isPending ? (
                    "Processing..."
                  ) : form.watch("paymentMethod") === "pay_later" ? (
                    "Submit Booking Request"
                  ) : (
                    `Pay $${pricing.total} & Confirm`
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg" data-testid="card-booking-summary">
              <CardHeader className="pb-4">
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property Info */}
                <div className="flex gap-4">
                  <img
                    src={property.images[0]}
                    alt={property.name}
                    className="w-24 h-20 object-cover rounded-lg"
                  />
                  <div>
                    <h3 className="font-semibold text-foreground">{property.name}</h3>
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span>Check-in</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {format(parseISO(checkIn), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span>Check-out</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {format(parseISO(checkOut), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Guests</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {guestsParam} guest{parseInt(guestsParam || "2") > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between text-foreground">
                    <span>${pricing.nightlyRate} x {nights} nights</span>
                    <span>${pricing.subtotal}</span>
                  </div>
                  {pricing.discountAmount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>{pricing.discount}% discount</span>
                      <span>-${pricing.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-foreground">
                    <span>Cleaning fee</span>
                    <span>${pricing.cleaningFee}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>Service fee</span>
                    <span>${pricing.serviceFee}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>Taxes</span>
                    <span>${pricing.taxes}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xl pt-3 border-t border-border">
                    <span>Total</span>
                    <span>${pricing.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
