import { Match, Court, Venue, User, MatchPlayer } from "@shared/schema";
import { format } from "date-fns";
import { MapPin, Clock, Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type MatchWithDetails = Match & {
  court: Court & { venue: Venue };
  creator: User;
  players: (MatchPlayer & { user: User })[];
};

interface MatchCardProps {
  match: MatchWithDetails;
}

export function MatchCard({ match }: MatchCardProps) {
  const spotsLeft = (match.maxPlayers || 4) - match.players.length;
  const isFull = spotsLeft <= 0;

  return (
    <Link href={`/matches/${match.id}`} className="group block h-full">
      <div className="h-full bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md hover:border-primary/50 transition-all duration-300 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isFull ? "secondary" : "default"} className="font-semibold text-[10px] uppercase tracking-wider">
                  {isFull ? "Full" : `${spotsLeft} spots left`}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                  Level {match.levelMin}-{match.levelMax}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                Match at {match.court.venue.name}
              </h3>
            </div>
            <div className="bg-primary/10 text-primary-foreground font-bold rounded-lg p-2 text-center min-w-[3.5rem] group-hover:bg-primary group-hover:text-white transition-colors">
              <div className="text-xs uppercase opacity-80">{format(new Date(match.date), "MMM")}</div>
              <div className="text-xl leading-none">{format(new Date(match.date), "d")}</div>
            </div>
          </div>

          <div className="space-y-2 mb-6 flex-grow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              <span>{format(new Date(match.date), "h:mm a")} • {match.duration} min</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="line-clamp-1">{match.court.venue.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex -space-x-2">
              {match.players.slice(0, 3).map((player) => (
                <Avatar key={player.id} className="w-8 h-8 border-2 border-card">
                  <AvatarImage src={player.user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-[10px]">{player.user.firstName?.[0]}</AvatarFallback>
                </Avatar>
              ))}
              {match.players.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-card">
                  +{match.players.length - 3}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
              View
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
