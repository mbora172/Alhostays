import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart, 
  MapPin, 
  Sparkles, 
  Users,
  Waves,
  Mountain,
  UtensilsCrossed,
  Camera
} from "lucide-react";
import { heroImage, properties } from "@/lib/property-data";

const localRecommendations = [
  {
    category: "Beaches",
    icon: Waves,
    items: [
      { name: "Waikiki Beach", description: "The iconic beach right at your doorstep" },
      { name: "Lanikai Beach", description: "Crystal clear waters and soft sand" },
      { name: "Hanauma Bay", description: "World-famous snorkeling destination" },
    ]
  },
  {
    category: "Activities",
    icon: Mountain,
    items: [
      { name: "Diamond Head Hike", description: "Iconic crater hike with stunning views" },
      { name: "Pearl Harbor", description: "Historic WWII memorial" },
      { name: "North Shore Surfing", description: "Watch pro surfers tackle big waves" },
    ]
  },
  {
    category: "Dining",
    icon: UtensilsCrossed,
    items: [
      { name: "Marukame Udon", description: "Fresh handmade udon noodles" },
      { name: "Duke's Waikiki", description: "Beachfront dining with live music" },
      { name: "Leonard's Bakery", description: "Famous malasadas (Portuguese donuts)" },
    ]
  },
  {
    category: "Hidden Gems",
    icon: Camera,
    items: [
      { name: "Manoa Falls", description: "Beautiful rainforest waterfall hike" },
      { name: "Koko Head Stairs", description: "Challenging hike with amazing views" },
      { name: "Chinatown", description: "Art galleries, food, and nightlife" },
    ]
  }
];

export default function About() {
  usePageTitle("About Us");
  return (
    <div className="min-h-screen pt-20 md:pt-24">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 
            className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            data-testid="text-about-title"
          >
            About Aloha Stays
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Your home away from home in paradise
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-6">
              Our Story
            </h2>
          </div>
          
          <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none text-center">
            <p className="text-muted-foreground leading-relaxed mb-6">
              Aloha Stays was born from a simple dream: to share the magic of Hawaii with travelers 
              from around the world. As longtime Oahu residents, we fell in love with the islands' 
              unique blend of natural beauty, rich culture, and warm hospitality - and we wanted to 
              create vacation rentals that capture that spirit.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              We started with just one property in Waikiki, pouring our hearts into every detail - 
              from selecting comfortable furniture to stocking the kitchen with everything guests 
              need to feel at home. The response was overwhelming. Guests loved the personal touches, 
              the local tips, and the genuine aloha they felt from the moment they arrived.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Today, we're proud to offer two beautiful properties in the heart of Waikiki, each 
              thoughtfully designed to provide an authentic Hawaiian experience. We're not just 
              hosts - we're your local friends, here to help you discover the real Hawaii.
            </p>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 md:py-24 bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              What Makes Us Different
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're more than just a place to stay - we're your partners in creating unforgettable memories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl text-foreground mb-3">Local Knowledge</h3>
              <p className="text-muted-foreground">
                As Hawaii residents, we provide insider tips on the best beaches, restaurants, 
                and hidden gems that tourists rarely discover.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl text-foreground mb-3">Personal Touch</h3>
              <p className="text-muted-foreground">
                Every stay includes thoughtful touches - from welcome gifts to personalized 
                recommendations based on your interests.
              </p>
            </Card>

            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-xl text-foreground mb-3">Always Available</h3>
              <p className="text-muted-foreground">
                We're just a text or call away, 24/7. Need restaurant reservations? Surfing lessons? 
                We're happy to help arrange it all.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Properties */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Our Properties
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Two unique properties, each offering the perfect Hawaiian vacation experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {properties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <img
                  src={property.images[0]}
                  alt={property.name}
                  className="w-full h-64 object-cover"
                />
                <CardContent className="p-6">
                  <h3 className="font-serif text-2xl font-semibold text-foreground mb-3">
                    {property.name}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {property.shortDescription}
                  </p>
                  <Button asChild data-testid={`button-about-view-${property.slug}`}>
                    <Link href={`/property/${property.slug}`}>View Property</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Local Recommendations */}
      <section className="py-16 md:py-24 bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
              Our Local Recommendations
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover the best of Oahu with our curated list of must-visit spots
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {localRecommendations.map((category, index) => (
              <Card key={index} className="p-6" data-testid={`card-recommendations-${index}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl text-foreground">{category.category}</h3>
                </div>
                <ul className="space-y-4">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-6">
            Ready to Experience Hawaii?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let us help you create the vacation of a lifetime. Browse our properties and find 
            your perfect Hawaiian escape.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8" data-testid="button-about-cta-properties">
              <Link href="/properties">View Properties</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8" data-testid="button-about-cta-contact">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
