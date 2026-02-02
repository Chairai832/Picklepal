import { Venue, Court } from "@shared/schema";
import { MapPin, Zap } from "lucide-react";
import { Link } from "wouter";

interface VenueCardProps {
  venue: Venue & { courts: Court[] };
}

export function VenueCard({ venue }: VenueCardProps) {
  // Use a placeholder if no image
  const image = venue.imageUrl || "https://images.unsplash.com/photo-1626244422258-293d254b9f04?q=80&w=800&auto=format&fit=crop";

  return (
    <Link href={`/venues/${venue.id}`} className="group block">
      <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="relative h-48 overflow-hidden">
          {/* Descriptive comment for dynamic image */}
          {/* Pickleball court outdoors sunny day */}
          <img 
            src={image} 
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-display font-bold text-xl text-white mb-1">{venue.name}</h3>
            <div className="flex items-center text-white/80 text-sm">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              <span className="truncate">{venue.location}</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {venue.courts.length} courts available
            </span>
            <div className="flex gap-2">
              {venue.courts.some(c => c.type === 'indoor') && (
                <span className="text-[10px] font-bold bg-secondary text-secondary-foreground px-2 py-1 rounded">Indoor</span>
              )}
              {venue.courts.some(c => c.type === 'outdoor') && (
                <span className="text-[10px] font-bold bg-primary/20 text-primary-foreground px-2 py-1 rounded">Outdoor</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-primary text-sm font-semibold mt-4">
            <Zap className="w-4 h-4 fill-primary" />
            <span>Book instantly</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
