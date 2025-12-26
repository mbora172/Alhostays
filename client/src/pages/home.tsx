import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Waves, 
  Utensils, 
  Wifi, 
  Star,
  Users,
  Bed,
  ChevronRight
} from "lucide-react";
import { heroImage, properties, testimonials } from "@/lib/property-data";

const valueProps = [
  { icon: MapPin, label: "Prime Waikiki Location" },
  { icon: Waves, label: "Walking Distance to Beach" },
  { icon: Utensils, label: "Fully Equipped Kitchens" },
  { icon: Wifi, label: "Free WiFi & Parking" },
  { icon: Star, label: "5-Star Guest Reviews" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 
            className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            data-testid="text-hero-title"
          >
            Aloha Stays
          </h1>
          <p 
            className="text-xl sm:text-2xl md:text-3xl text-white/90 mb-4 font-light"
            data-testid="text-hero-subtitle"
          >
            Waikiki Vacation Rentals
          </p>
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            2 Beautiful Properties in the Heart of Waikiki
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/properties">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg backdrop-blur-md"
                data-testid="button-hero-view-properties"
              >
                View Properties
              </Button>
            </Link>
            <Link href="/properties">
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-6 text-lg bg-white/10 backdrop-blur-md border-white/30 text-white"
                data-testid="button-hero-book-now"
              >
                Book Now
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="h-8 w-8 text-white/70 rotate-90" />
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-16 md:py-20 bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {valueProps.map((prop, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center text-center"
                data-testid={`value-prop-${index}`}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <prop.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="text-sm md:text-base font-medium text-foreground">
                  {prop.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Our Properties
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose from our carefully curated vacation rentals, each offering a unique Hawaiian experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {properties.map((property) => (
              <Link 
                key={property.id} 
                href={`/property/${property.slug}`}
                data-testid={`card-property-${property.id}`}
              >
                <Card className="group overflow-hidden hover-elevate cursor-pointer h-full">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button variant="secondary" className="w-full backdrop-blur-sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-2">
                      {property.name}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {property.shortDescription}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Sleeps {property.capacity}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>{property.bedrooms} BR / {property.bathrooms} BA</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        ${property.nightlyRate}
                      </span>
                      <span className="text-muted-foreground">/night</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Why Choose Aloha Stays
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're committed to making your Hawaiian vacation unforgettable
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                title: "Local Ownership", 
                description: "We're Hawaii residents who know the islands inside and out" 
              },
              { 
                title: "24/7 Support", 
                description: "We're always available to help with any questions or needs" 
              },
              { 
                title: "Flexible Check-in", 
                description: "Self-service entry so you can arrive on your schedule" 
              },
              { 
                title: "Spotlessly Clean", 
                description: "Professional cleaning with hospital-grade sanitization" 
              },
            ].map((item, index) => (
              <Card key={index} className="p-6" data-testid={`card-why-${index}`}>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              What Our Guests Say
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Don't just take our word for it - hear from travelers who've experienced Aloha Stays
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial) => (
              <Card 
                key={testimonial.id} 
                className="p-6"
                data-testid={`card-testimonial-${testimonial.id}`}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-4 leading-relaxed">
                  "{testimonial.review}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {testimonial.guestName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{testimonial.guestName}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.date}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${properties[0].images[0]})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-6">
            Ready to Book Your Waikiki Stay?
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Start planning your perfect Hawaiian vacation today. 
            Our properties book quickly, so reserve your dates now.
          </p>
          <Link href="/properties">
            <Button 
              size="lg" 
              className="px-10 py-6 text-lg"
              data-testid="button-cta-book"
            >
              Book Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
