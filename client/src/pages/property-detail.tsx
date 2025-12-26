import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  Maximize2
} from "lucide-react";
import { getPropertyBySlug } from "@/lib/property-data";
import { differenceInDays, format, isBefore, isWithinInterval, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { BlockedDate } from "@shared/schema";

export default function PropertyDetail() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const property = getPropertyBySlug(params.slug || "");
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState("2");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: blockedDates = [] } = useQuery<BlockedDate[]>({
    queryKey: ["/api/blocked-dates", property?.id],
    enabled: !!property?.id,
  });

  const isDateBlocked = (date: Date): boolean => {
    return blockedDates.some((blocked) => {
      const start = parseISO(blocked.startDate);
      const end = parseISO(blocked.endDate);
      return isWithinInterval(date, { start, end });
    });
  };

  const nights = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      const diff = differenceInDays(dateRange.to, dateRange.from);
      return diff > 0 ? diff : 0;
    }
    return 0;
  }, [dateRange]);

  const pricing = useMemo(() => {
    if (!property || nights === 0) return null;
    
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
      total
    };
  }, [property, nights]);

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

  const handleBookNow = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const params = new URLSearchParams({
      propertyId: property.id,
      checkIn: format(dateRange.from, "yyyy-MM-dd"),
      checkOut: format(dateRange.to, "yyyy-MM-dd"),
      guests: guests
    });
    
    setLocation(`/booking?${params.toString()}`);
  };

  return (
    <div className="min-h-screen pt-16 md:pt-20">
      {/* Photo Gallery */}
      <section className="relative">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[50vh] md:h-[60vh]">
          <div 
            className="md:col-span-2 md:row-span-2 relative cursor-pointer group"
            onClick={() => { setCurrentImageIndex(0); setGalleryOpen(true); }}
          >
            <img
              src={property.images[0]}
              alt={`${property.name} - Main`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="h-8 w-8 text-white" />
            </div>
          </div>
          {property.images.slice(1, 5).map((image, index) => (
            <div 
              key={index}
              className="hidden md:block relative cursor-pointer group"
              onClick={() => { setCurrentImageIndex(index + 1); setGalleryOpen(true); }}
            >
              <img
                src={image}
                alt={`${property.name} - ${index + 2}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="h-6 w-6 text-white" />
              </div>
              {index === 3 && property.images.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    +{property.images.length - 5} photos
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <Button
          variant="secondary"
          className="absolute bottom-4 right-4 backdrop-blur-sm"
          onClick={() => setGalleryOpen(true)}
          data-testid="button-show-all-photos"
        >
          Show all photos
        </Button>
      </section>

      {/* Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black">
          <div className="relative h-[80vh] flex items-center justify-center">
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.name} - ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20"
              onClick={() => setCurrentImageIndex((i) => (i === 0 ? property.images.length - 1 : i - 1))}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 text-white hover:bg-white/20"
              onClick={() => setCurrentImageIndex((i) => (i === property.images.length - 1 ? 0 : i + 1))}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {currentImageIndex + 1} / {property.images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Property Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 
                className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4"
                data-testid="text-property-name"
              >
                {property.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  <span>{property.address}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                  <span className="ml-1">5.0</span>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="flex flex-wrap gap-6 py-6 border-y border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Entire home</p>
                  <p className="text-sm text-muted-foreground">You'll have the whole place</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{property.capacity} guests</p>
                  <p className="text-sm text-muted-foreground">Maximum capacity</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bed className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{property.bedrooms} bedroom{property.bedrooms > 1 ? 's' : ''}</p>
                  <p className="text-sm text-muted-foreground">{property.bathrooms} bathroom{property.bathrooms > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                About this space
              </h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                {property.description.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
                What this place offers
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map((amenity, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3"
                    data-testid={`amenity-${index}`}
                  >
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* House Rules */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
                House Rules
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-foreground">
                    Check-in: {property.houseRules.checkIn} | Check-out: {property.houseRules.checkOut}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {property.houseRules.smoking ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-foreground">
                    {property.houseRules.smoking ? "Smoking allowed" : "No smoking"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {property.houseRules.parties ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-foreground">
                    {property.houseRules.parties ? "Events allowed" : "No parties or events"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {property.houseRules.pets ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-foreground">
                    {property.houseRules.pets ? "Pets allowed" : "No pets"}
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-6">
                Location
              </h2>
              <div className="bg-card rounded-lg p-6 border border-border">
                <div className="flex items-start gap-3 mb-6">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium text-foreground">{property.address}</p>
                    <p className="text-sm text-muted-foreground">Waikiki, Honolulu, Hawaii</p>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-4">Nearby Attractions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {property.nearbyAttractions.map((attraction, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{attraction.name}</span>
                      <span className="text-sm text-foreground font-medium">{attraction.distance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg" data-testid="card-booking">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">${property.nightlyRate}</span>
                  <span className="text-muted-foreground font-normal">/night</span>
                </CardTitle>
                {property.weeklyDiscount > 0 && (
                  <p className="text-sm text-primary">
                    {property.weeklyDiscount}% off for weekly stays
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Select dates
                  </label>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      disabled={(date) => isBefore(date, today) || isDateBlocked(date)}
                      className="w-full"
                      data-testid="calendar-booking"
                    />
                  </div>
                </div>

                {/* Guest Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Guests
                  </label>
                  <Select value={guests} onValueChange={setGuests}>
                    <SelectTrigger data-testid="select-guests">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(property.capacity)].map((_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1} guest{i > 0 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pricing Breakdown */}
                {pricing && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-foreground">
                      <span>${property.nightlyRate} x {nights} nights</span>
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
                  disabled={!dateRange?.from || !dateRange?.to}
                  onClick={handleBookNow}
                  data-testid="button-reserve"
                >
                  {dateRange?.from && dateRange?.to ? "Reserve" : "Select dates to book"}
                </Button>

                <p className="text-sm text-center text-muted-foreground">
                  You won't be charged yet
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
