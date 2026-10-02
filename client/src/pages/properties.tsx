import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bed, Star, MapPin } from "lucide-react";
import { properties } from "@/lib/property-data";

export default function Properties() {
  usePageTitle("Our Properties");
  return (
    <div className="min-h-screen pt-20 md:pt-24">
      {/* Header */}
      <section className="py-12 md:py-16 bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8 text-center">
          <h1 
            className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4"
            data-testid="text-properties-title"
          >
            Our Properties
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover your perfect Hawaiian vacation rental. Both properties offer prime Waikiki locations 
            with stunning views and all the amenities you need.
          </p>
        </div>
      </section>

      {/* Properties List */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="space-y-8">
            {properties.map((property) => (
              <Card 
                key={property.id} 
                className="overflow-hidden"
                data-testid={`card-property-listing-${property.id}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative aspect-[4/3] lg:aspect-auto overflow-hidden">
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">(5.0)</span>
                      </div>
                      
                      <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-3">
                        {property.name}
                      </h2>
                      
                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{property.address}</span>
                      </div>
                      
                      <p className="text-muted-foreground mb-6 line-clamp-3">
                        {property.shortDescription}
                      </p>
                      
                      <div className="flex flex-wrap gap-4 text-sm mb-6">
                        <div className="flex items-center gap-2 text-foreground">
                          <Users className="h-5 w-5 text-primary" />
                          <span>Sleeps {property.capacity}</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Bed className="h-5 w-5 text-primary" />
                          <span>{property.bedrooms} Bedroom{property.bedrooms > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {property.amenities.slice(0, 5).map((amenity, index) => (
                          <span 
                            key={index}
                            className="text-xs bg-secondary px-3 py-1 rounded-full text-secondary-foreground"
                          >
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 5 && (
                          <span className="text-xs bg-secondary px-3 py-1 rounded-full text-secondary-foreground">
                            +{property.amenities.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold text-foreground">
                            ${property.nightlyRate}
                          </span>
                          <span className="text-muted-foreground">/night</span>
                        </div>
                        {property.weeklyDiscount > 0 && (
                          <p className="text-sm text-primary mt-1">
                            {property.weeklyDiscount}% off weekly stays
                          </p>
                        )}
                      </div>
                      <Button asChild size="lg" data-testid={`button-view-${property.slug}`}>
                        <Link href={`/property/${property.slug}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
