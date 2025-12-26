import heroImage from "@assets/stock_images/waikiki_beach_sunset_a695b88c.jpg";
import livingRoom1 from "@assets/stock_images/modern_vacation_rent_defd23e2.jpg";
import livingRoom2 from "@assets/stock_images/modern_vacation_rent_33d170be.jpg";
import bedroom1 from "@assets/stock_images/luxury_bedroom_vacat_bf02249a.jpg";
import bedroom2 from "@assets/stock_images/luxury_bedroom_vacat_7dca3811.jpg";
import kitchen1 from "@assets/stock_images/modern_kitchen_vacat_dad019d0.jpg";
import kitchen2 from "@assets/stock_images/modern_kitchen_vacat_f92077d6.jpg";
import balcony1 from "@assets/stock_images/ocean_view_balcony_t_29ba464b.jpg";
import balcony2 from "@assets/stock_images/ocean_view_balcony_t_83e916ae.jpg";
import bathroom1 from "@assets/stock_images/modern_bathroom_vaca_2008724f.jpg";
import bathroom2 from "@assets/stock_images/modern_bathroom_vaca_9de59579.jpg";

export { heroImage };

export interface PropertyData {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  address: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  nightlyRate: number;
  cleaningFee: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  amenities: string[];
  houseRules: {
    checkIn: string;
    checkOut: string;
    smoking: boolean;
    parties: boolean;
    pets: boolean;
  };
  images: string[];
  nearbyAttractions: {
    name: string;
    distance: string;
  }[];
}

export const properties: PropertyData[] = [
  {
    id: "property-1",
    name: "Sunset Paradise Suite",
    slug: "sunset-paradise-suite",
    description: "Experience the ultimate Hawaiian getaway in our stunning Sunset Paradise Suite. This beautifully appointed 2-bedroom condo offers breathtaking ocean views, modern amenities, and a prime Waikiki location just steps from the beach. Wake up to spectacular sunrises over Diamond Head and end your days watching the sun dip below the Pacific horizon from your private lanai.\n\nThe open-concept living space features contemporary Hawaiian decor, a fully equipped gourmet kitchen, and floor-to-ceiling windows that flood the space with natural light. The master bedroom boasts a king-size bed with premium linens and an ensuite bathroom with a luxurious rain shower. The second bedroom is perfect for families or friends, with two comfortable queen beds.\n\nWhether you're here for a romantic escape, family vacation, or adventure-filled trip, Sunset Paradise Suite provides the perfect home base for exploring everything Oahu has to offer.",
    shortDescription: "Stunning 2BR oceanview suite with modern Hawaiian decor, perfect for families or couples seeking a prime Waikiki location.",
    address: "2100 Kalakaua Avenue, Waikiki, HI 96815",
    capacity: 6,
    bedrooms: 2,
    bathrooms: 2,
    nightlyRate: 289,
    cleaningFee: 150,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "Full Kitchen",
      "Washer/Dryer",
      "Ocean View",
      "Private Lanai",
      "Smart TV",
      "Free Parking",
      "Beach Gear",
      "Pool Access",
      "Gym Access",
      "Concierge Service"
    ],
    houseRules: {
      checkIn: "3:00 PM",
      checkOut: "11:00 AM",
      smoking: false,
      parties: false,
      pets: false
    },
    images: [livingRoom1, bedroom1, kitchen1, balcony1, bathroom1, heroImage],
    nearbyAttractions: [
      { name: "Waikiki Beach", distance: "2 min walk" },
      { name: "Diamond Head", distance: "10 min drive" },
      { name: "Royal Hawaiian Center", distance: "5 min walk" },
      { name: "Honolulu Zoo", distance: "8 min walk" },
      { name: "Waikiki Aquarium", distance: "12 min walk" }
    ]
  },
  {
    id: "property-2",
    name: "Diamond Head Retreat",
    slug: "diamond-head-retreat",
    description: "Discover your perfect Hawaiian hideaway at Diamond Head Retreat. This charming 1-bedroom condo combines classic island elegance with modern comfort, offering a peaceful sanctuary just minutes from Waikiki's vibrant energy. The property features stunning views of Diamond Head crater, creating a picture-perfect backdrop for your island adventure.\n\nThe thoughtfully designed interior showcases warm tropical woods, island-inspired artwork, and comfortable furnishings that invite relaxation. The fully equipped kitchen makes meal prep a breeze, while the spacious living area is ideal for unwinding after a day of exploring. Step onto your private balcony to enjoy your morning coffee with panoramic mountain and partial ocean views.\n\nThe bedroom features a plush king-size bed, blackout curtains for restful sleep, and a generous closet. The spa-like bathroom includes a soaking tub and separate walk-in shower. Diamond Head Retreat is perfect for couples or solo travelers seeking an authentic Hawaiian experience.",
    shortDescription: "Charming 1BR retreat with Diamond Head views, ideal for couples seeking a peaceful Hawaiian escape.",
    address: "2500 Kuhio Avenue, Waikiki, HI 96815",
    capacity: 4,
    bedrooms: 1,
    bathrooms: 1,
    nightlyRate: 199,
    cleaningFee: 100,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
    amenities: [
      "Free WiFi",
      "Air Conditioning",
      "Full Kitchen",
      "In-unit Laundry",
      "Mountain View",
      "Private Balcony",
      "Smart TV",
      "Free Street Parking",
      "Beach Towels",
      "Yoga Mats",
      "Coffee Maker",
      "BBQ Grill"
    ],
    houseRules: {
      checkIn: "4:00 PM",
      checkOut: "10:00 AM",
      smoking: false,
      parties: false,
      pets: false
    },
    images: [livingRoom2, bedroom2, kitchen2, balcony2, bathroom2, heroImage],
    nearbyAttractions: [
      { name: "Waikiki Beach", distance: "5 min walk" },
      { name: "Diamond Head Trail", distance: "5 min drive" },
      { name: "Kapahulu Avenue Eats", distance: "3 min walk" },
      { name: "Ala Wai Golf Course", distance: "8 min walk" },
      { name: "International Market", distance: "10 min walk" }
    ]
  }
];

export const testimonials = [
  {
    id: "1",
    guestName: "Sarah M.",
    rating: 5,
    review: "Absolutely incredible stay! The Sunset Paradise Suite exceeded all our expectations. The views were breathtaking and the location couldn't be better. We'll definitely be back!",
    propertyId: "property-1",
    date: "November 2024"
  },
  {
    id: "2",
    guestName: "Michael & Lisa",
    rating: 5,
    review: "Perfect honeymoon destination. The Diamond Head Retreat was clean, comfortable, and the hosts were so helpful with local recommendations. Pure paradise!",
    propertyId: "property-2",
    date: "October 2024"
  },
  {
    id: "3",
    guestName: "The Johnson Family",
    rating: 5,
    review: "We traveled with kids and this was the best decision. The suite had everything we needed, the beach was steps away, and the kitchen saved us so much money on meals.",
    propertyId: "property-1",
    date: "September 2024"
  },
  {
    id: "4",
    guestName: "David K.",
    rating: 5,
    review: "As a solo traveler, the Diamond Head Retreat was perfect. Quiet, well-maintained, and the morning views from the balcony with coffee were unforgettable.",
    propertyId: "property-2",
    date: "August 2024"
  },
  {
    id: "5",
    guestName: "Emma & James",
    rating: 5,
    review: "Third time staying with Aloha Stays and we keep coming back. The attention to detail, cleanliness, and hospitality are unmatched. Mahalo!",
    propertyId: "property-1",
    date: "July 2024"
  }
];

export function getPropertyBySlug(slug: string): PropertyData | undefined {
  return properties.find(p => p.slug === slug);
}

export function getPropertyById(id: string): PropertyData | undefined {
  return properties.find(p => p.id === id);
}
