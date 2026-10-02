import { useParams, useLocation } from "wouter";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  MapPin,
  Users,
  Bed,
  Star,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Grid2x2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getPropertyBySlug } from "@/lib/property-data";
import { isNightBooked, isStayAvailable, nextBookedNight, toDateKey } from "@/lib/availability";
import { usePageTitle } from "@/hooks/use-page-title";
import { calculatePricing } from "@shared/catalog";
import { differenceInDays, format, isBefore } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { UnavailableRange } from "@shared/schema";

export default function PropertyDetail() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const property = getPropertyBySlug(params.slug || "");
  usePageTitle(property?.name ?? "Property not found");

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState("2");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mobileSlide, setMobileSlide] = useState(0);
  const bookingCardRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const {
    data: unavailable = [],
    isLoading: availabilityLoading,
    isError: availabilityError,
  } = useQuery<UnavailableRange[]>({
    queryKey: ["/api/availability", property?.id],
    enabled: !!property?.id,
    // Calendars sync with Airbnb/VRBO in the background; keep this view fresh.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });

  // If fresh data shows the selected stay is no longer free, clear it.
  useEffect(() => {
    if (dateRange?.from && dateRange.to) {
      if (!isStayAvailable(toDateKey(dateRange.from), toDateKey(dateRange.to), unavailable)) {
        setDateRange(undefined);
      }
    }
  }, [unavailable, dateRange]);

  const selectingCheckout = !!dateRange?.from && !dateRange?.to;
  const latestCheckout = selectingCheckout ? nextBookedNight(toDateKey(dateRange!.from!), unavailable) : null;

  const isDayDisabled = (date: Date): boolean => {
    if (isBefore(date, today)) return true;
    const key = toDateKey(date);
    if (selectingCheckout) {
      const fromKey = toDateKey(dateRange!.from!);
      // Past the next booking you can't check out; the booking's first day itself
      // is a valid checkout (same-day turnover). Earlier days start a new stay.
      if (key > fromKey) return latestCheckout !== null && key > latestCheckout;
    }
    return isNightBooked(key, unavailable);
  };

  const handleSelect = (_range: DateRange | undefined, day: Date) => {
    const key = toDateKey(day);
    if (!dateRange?.from || dateRange.to) {
      setDateRange({ from: day, to: undefined });
      return;
    }
    const fromKey = toDateKey(dateRange.from);
    if (key <= fromKey) {
      setDateRange({ from: day, to: undefined });
    } else if (isStayAvailable(fromKey, key, unavailable)) {
      setDateRange({ from: dateRange.from, to: day });
    } else if (!isNightBooked(key, unavailable)) {
      setDateRange({ from: day, to: undefined });
    }
  };

  const bookedModifier = (date: Date) => !isBefore(date, today) && isNightBooked(toDateKey(date), unavailable);

  const nights = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return Math.max(0, differenceInDays(dateRange.to, dateRange.from));
    }
    return 0;
  }, [dateRange]);

  const pricing = useMemo(() => (property ? calculatePricing(property, nights) : null), [property, nights]);

  const imageCount = property?.images.length ?? 0;
  const showPrev = useCallback(() => setCurrentImageIndex((i) => (i === 0 ? imageCount - 1 : i - 1)), [imageCount]);
  const showNext = useCallback(() => setCurrentImageIndex((i) => (i === imageCount - 1 ? 0 : i + 1)), [imageCount]);

  useEffect(() => {
    if (!galleryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryOpen, showPrev, showNext]);

  if (!property) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Property Not Found</h1>
          <Button onClick={() => setLocation("/properties")}>View All Properties</Button>
        </div>
      </div>
    );
  }

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryOpen(true);
  };

  const handleBookNow = () => {
    if (!dateRange?.from || !dateRange?.to) return;

    const params = new URLSearchParams({
      propertyId: property.id,
      checkIn: format(dateRange.from, "yyyy-MM-dd"),
      checkOut: format(dateRange.to, "yyyy-MM-dd"),
      guests: guests,
    });

    setLocation(`/booking?${params.toString()}`);
  };

  const scrollToBooking = () => {
    bookingCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const dateHint = availabilityLoading
    ? "Checking availability..."
    : !dateRange?.from
      ? "Select your check-in date"
      : !dateRange.to
        ? "Now select your check-out date"
        : `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")} · ${nights} night${nights === 1 ? "" : "s"}`;

  return (
    <div className="min-h-screen pt-16 md:pt-20 pb-24 lg:pb-0">
      {/* Photo Gallery */}
      <section className="max-w-7xl mx-auto md:px-8 md:pt-6" aria-label="Photos">
        {/* Mobile: swipeable carousel */}
        <div className="relative md:hidden">
          <div
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
            onScroll={(e) => {
              const el = e.currentTarget;
              setMobileSlide(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {property.images.map((image, index) => (
              <button
                key={index}
                type="button"
                className="w-full flex-shrink-0 snap-center aspect-[4/3]"
                onClick={() => openGallery(index)}
                aria-label={`Open photo ${index + 1} of ${property.images.length}`}
              >
                <img
                  src={image}
                  alt={`${property.name} - photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </button>
            ))}
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {mobileSlide + 1} / {property.images.length}
          </div>
        </div>

        {/* Desktop: mosaic */}
        <div className="relative hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[60vh] max-h-[560px] rounded-xl overflow-hidden">
          <button
            type="button"
            className="col-span-2 row-span-2 relative group overflow-hidden"
            onClick={() => openGallery(0)}
            aria-label="Open photo 1"
          >
            <img
              src={property.images[0]}
              alt={`${property.name} - main photo`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
          {property.images.slice(1, 5).map((image, index) => (
            <button
              type="button"
              key={index}
              className="relative group overflow-hidden"
              onClick={() => openGallery(index + 1)}
              aria-label={`Open photo ${index + 2}`}
            >
              <img
                src={image}
                alt={`${property.name} - photo ${index + 2}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}

          <Button
            variant="secondary"
            className="absolute bottom-4 right-4 shadow-md"
            onClick={() => openGallery(0)}
            data-testid="button-show-all-photos"
          >
            <Grid2x2 className="h-4 w-4" />
            Show all {property.images.length} photos
          </Button>
        </div>
      </section>

      {/* Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black border-0 [&>button]:text-white [&>button]:opacity-90 [&>button]:z-10">
          <DialogTitle className="sr-only">{property.name} photos</DialogTitle>
          <DialogDescription className="sr-only">Use the arrow keys to browse photos.</DialogDescription>
          <div className="relative h-[80vh] flex items-center justify-center">
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.name} - photo ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={showPrev}
              aria-label="Previous photo"
            >
              <ChevronLeft className="!h-7 !w-7" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={showNext}
              aria-label="Next photo"
            >
              <ChevronRight className="!h-7 !w-7" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-white text-sm">
              {currentImageIndex + 1} / {property.images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-10">
            {/* Header */}
            <div>
              <h1
                className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4"
                data-testid="text-property-name"
              >
                {property.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 flex-shrink-0" />
                  <span>{property.address}</span>
                </div>
                <div className="flex items-center gap-1" aria-label="Rated 5.0 out of 5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden />
                  ))}
                  <span className="ml-1">5.0</span>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-6 border-y border-border">
              {[
                { icon: Home, title: "Entire home", sub: "You'll have the whole place" },
                { icon: Users, title: `${property.capacity} guests`, sub: "Maximum capacity" },
                {
                  icon: Bed,
                  title: `${property.bedrooms} bedroom${property.bedrooms > 1 ? "s" : ""}`,
                  sub: `${property.bathrooms} bathroom${property.bathrooms > 1 ? "s" : ""}`,
                },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">About this space</h2>
              <div className="max-w-none">
                {property.description.split("\n\n").map((paragraph, index) => (
                  <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">What this place offers</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-3" data-testid={`amenity-${index}`}>
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">House Rules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">Check-in after {property.houseRules.checkIn}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">Check-out by {property.houseRules.checkOut}</span>
                </div>
                {[
                  { allowed: property.houseRules.smoking, yes: "Smoking allowed", no: "No smoking" },
                  { allowed: property.houseRules.parties, yes: "Events allowed", no: "No parties or events" },
                  { allowed: property.houseRules.pets, yes: "Pets allowed", no: "No pets" },
                ].map((rule) => (
                  <div key={rule.no} className="flex items-center gap-3">
                    {rule.allowed ? (
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-destructive flex-shrink-0" />
                    )}
                    <span className="text-foreground">{rule.allowed ? rule.yes : rule.no}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">Location</h2>
              <div className="bg-card rounded-lg p-6 border border-border">
                <div className="flex items-start gap-3 mb-6">
                  <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{property.address}</p>
                    <p className="text-sm text-muted-foreground">Waikiki, Honolulu, Hawaii</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-4">Nearby Attractions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {property.nearbyAttractions.map((attraction, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{attraction.name}</span>
                      <span className="text-sm text-foreground font-medium whitespace-nowrap">{attraction.distance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1" ref={bookingCardRef} id="booking">
            <Card className="lg:sticky lg:top-24 shadow-lg scroll-mt-24" data-testid="card-booking">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">${property.nightlyRate}</span>
                  <span className="text-muted-foreground font-normal text-base">/night</span>
                </CardTitle>
                {property.weeklyDiscount > 0 && (
                  <p className="text-sm text-primary">
                    {property.weeklyDiscount}% off weekly stays · {property.monthlyDiscount}% off monthly
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Select dates</span>
                    {dateRange?.from && (
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                        onClick={() => setDateRange(undefined)}
                        data-testid="button-clear-dates"
                      >
                        Clear dates
                      </button>
                    )}
                  </div>
                  <div className="relative border border-border rounded-lg flex justify-center">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={handleSelect}
                      numberOfMonths={1}
                      fromDate={today}
                      disabled={isDayDisabled}
                      modifiers={{ booked: bookedModifier }}
                      modifiersClassNames={{ booked: "line-through" }}
                      data-testid="calendar-booking"
                    />
                    {availabilityLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading availability" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground" aria-live="polite" data-testid="text-date-hint">
                    {dateHint}
                  </p>
                  {availabilityError && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Couldn't load availability. Please refresh the page.
                    </p>
                  )}
                </div>

                {/* Guest Selection */}
                <div>
                  <label htmlFor="guests" className="text-sm font-medium text-foreground mb-2 block">
                    Guests
                  </label>
                  <Select value={guests} onValueChange={setGuests}>
                    <SelectTrigger id="guests" data-testid="select-guests">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(property.capacity)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} guest{i > 0 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pricing Breakdown */}
                {pricing && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-foreground">
                      <span>
                        ${property.nightlyRate} x {nights} night{nights === 1 ? "" : "s"}
                      </span>
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
                    <div className="flex justify-between font-semibold text-lg pt-3 border-t border-border">
                      <span>Total</span>
                      <span>${pricing.total}</span>
                    </div>
                  </div>
                )}

                {/* Book Button */}
                <Button
                  className="w-full py-6 text-lg"
                  disabled={!dateRange?.from || !dateRange?.to || availabilityLoading}
                  onClick={handleBookNow}
                  data-testid="button-reserve"
                >
                  {dateRange?.from && dateRange?.to ? "Reserve" : "Select dates to book"}
                </Button>

                <p className="text-sm text-center text-muted-foreground">You won't be charged yet</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile booking bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="min-w-0">
            {pricing ? (
              <>
                <p className="font-semibold text-foreground">${pricing.total} total</p>
                <p className="text-xs text-muted-foreground truncate">
                  {format(dateRange!.from!, "MMM d")} - {format(dateRange!.to!, "MMM d")} · {nights} night
                  {nights === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <p className="text-foreground">
                <span className="font-semibold">${property.nightlyRate}</span>
                <span className="text-muted-foreground"> /night</span>
              </p>
            )}
          </div>
          {pricing ? (
            <Button onClick={handleBookNow} data-testid="button-mobile-reserve">
              Reserve
            </Button>
          ) : (
            <Button onClick={scrollToBooking} data-testid="button-mobile-check-availability">
              Check availability
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
