import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Building2, MapPin, Calendar, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const venueFormSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  city: z.string().min(1, "City is required"),
  area: z.string().optional(),
  phone: z.string().optional(),
});

const courtFormSchema = z.object({
  venueId: z.string().min(1, "Please select a venue"),
  name: z.string().min(1, "Court name is required"),
  indoor: z.string(),
  pricePerHour: z.coerce.number().min(0, "Price must be positive"),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;
type CourtFormValues = z.infer<typeof courtFormSchema>;

interface Court {
  id: number;
  venueId: number;
  name: string;
  type: string;
  surface: string | null;
  pricePerHour: number | null;
}

interface Venue {
  id: number;
  ownerId: string | null;
  name: string;
  city: string;
  area: string | null;
  phone: string | null;
  location: string;
  description: string | null;
  imageUrl: string | null;
  courts: Court[];
}

interface VenueBooking {
  id: number;
  courtId: number;
  userId: string;
  startTime: string;
  endTime: string;
  status: string;
  court: Court;
  venue: Venue;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export default function VenueDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const venueForm = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: "",
      city: "Bengaluru",
      area: "",
      phone: "",
    },
  });

  const courtForm = useForm<CourtFormValues>({
    resolver: zodResolver(courtFormSchema),
    defaultValues: {
      venueId: "",
      name: "",
      indoor: "no",
      pricePerHour: 700,
    },
  });

  const { data: venues = [], isLoading: venuesLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues/my"],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<VenueBooking[]>({
    queryKey: ["/api/venues/bookings"],
  });

  const createVenueMutation = useMutation({
    mutationFn: async (data: VenueFormValues) => {
      return await apiRequest("/api/venues", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          city: data.city,
          area: data.area || "",
          phone: data.phone || "",
          location: `${data.area || ""}, ${data.city}`,
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues/my"] });
      venueForm.reset();
      toast({ title: "Venue created!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addCourtMutation = useMutation({
    mutationFn: async (data: CourtFormValues) => {
      return await apiRequest(`/api/venues/${data.venueId}/courts`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          type: data.indoor === "yes" ? "indoor" : "outdoor",
          pricePerHour: data.pricePerHour,
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues/my"] });
      courtForm.reset({ venueId: "", name: "", indoor: "no", pricePerHour: 700 });
      toast({ title: "Court added!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onVenueSubmit = (data: VenueFormValues) => {
    createVenueMutation.mutate(data);
  };

  const onCourtSubmit = (data: CourtFormValues) => {
    addCourtMutation.mutate(data);
  };

  if (user?.role !== "venue") {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="venue-dashboard-restricted">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl" data-testid="text-dashboard-title">Venue Dashboard</CardTitle>
            <CardDescription>This area is for venue accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Switch to venue mode in your profile to manage venues and courts.
            </p>
            <Button asChild data-testid="link-go-to-profile">
              <Link href="/profile">Go to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (venuesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" data-testid="venue-dashboard">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2" data-testid="text-dashboard-header">
            <Building2 className="w-6 h-6 text-primary" />
            Venue Dashboard
          </CardTitle>
          <CardDescription>Create venues, add courts, and view bookings.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Venue Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create a Venue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...venueForm}>
              <form onSubmit={venueForm.handleSubmit(onVenueSubmit)} className="space-y-4">
                <FormField
                  control={venueForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Indiranagar Pickleball Club"
                          data-testid="input-venue-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={venueForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-city">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                            <SelectItem value="Mumbai">Mumbai</SelectItem>
                            <SelectItem value="Delhi NCR">Delhi NCR</SelectItem>
                            <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                            <SelectItem value="Pune">Pune</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={venueForm.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Indiranagar"
                            data-testid="input-venue-area"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={venueForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Optional"
                          data-testid="input-venue-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createVenueMutation.isPending}
                  className="w-full"
                  data-testid="button-create-venue"
                >
                  {createVenueMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Venue
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Add Court Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add a Court
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...courtForm}>
              <form onSubmit={courtForm.handleSubmit(onCourtSubmit)} className="space-y-4">
                <FormField
                  control={courtForm.control}
                  name="venueId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Venue</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-venue">
                            <SelectValue placeholder="— choose —" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {venues.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.name} ({v.city})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={courtForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Court Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Court 1"
                          data-testid="input-court-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={courtForm.control}
                    name="indoor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indoor?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-indoor">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="no">Outdoor</SelectItem>
                            <SelectItem value="yes">Indoor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={courtForm.control}
                    name="pricePerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price/hour (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            data-testid="input-court-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={addCourtMutation.isPending}
                  className="w-full"
                  data-testid="button-add-court"
                >
                  {addCourtMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Court
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* My Venues List */}
      {venues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" data-testid="text-my-venues-title">My Venues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {venues.map((venue) => (
                <Card key={venue.id} className="border" data-testid={`card-venue-${venue.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base" data-testid={`text-venue-name-${venue.id}`}>{venue.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span data-testid={`text-venue-location-${venue.id}`}>{venue.area}, {venue.city}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {venue.courts.map((court) => (
                        <Badge key={court.id} variant="secondary" data-testid={`badge-court-${court.id}`}>
                          {court.name} - ₹{court.pricePerHour}/hr
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2" data-testid="text-bookings-title">
            <Calendar className="w-5 h-5" />
            Bookings on Your Courts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-bookings">No bookings yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.map((b) => (
                <Card key={b.id} className="border" data-testid={`card-booking-${b.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base" data-testid={`text-booking-venue-${b.id}`}>
                      {b.venue?.name} — {b.court?.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span data-testid={`text-booking-info-${b.id}`}>
                        {b.venue?.city} • {format(new Date(b.startTime), "PPp")}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="flex items-center gap-1" data-testid={`badge-booking-user-${b.id}`}>
                        <UserIcon className="w-3 h-3" />
                        {b.user?.firstName} {b.user?.lastName}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-booking-email-${b.id}`}>
                        {b.user?.email}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
