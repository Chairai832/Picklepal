import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMatchSchema } from "@shared/schema";
import { useCreateMatch } from "@/hooks/use-matches";
import { useVenues } from "@/hooks/use-venues";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";

// Extend schema for form handling (string -> number coercion)
const formSchema = insertMatchSchema.extend({
  courtId: z.coerce.number().min(1, "Please select a court"),
  duration: z.coerce.number().min(30),
  levelMin: z.coerce.number().min(0).max(7),
  levelMax: z.coerce.number().min(0).max(7),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
});

type FormData = z.infer<typeof formSchema>;

export function CreateMatchDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: venues } = useVenues();
  const { mutate: createMatch, isPending } = useCreateMatch();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      duration: 60,
      levelMin: 1.0,
      levelMax: 5.0,
      status: "open",
      maxPlayers: 4,
    },
  });

  const onSubmit = (data: FormData) => {
    // Transform string date to ISO Date string for the API
    const payload = {
      ...data,
      date: new Date(data.date).toISOString(), // API expects ISO string or Date object, JSON serializes to string
    };

    createMatch(payload as any, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({ title: "Match Created!", description: "Your match is now open for others to join." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Create a Match</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input type="datetime-local" {...form.register("date")} />
            {form.formState.errors.date && <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Venue & Court</Label>
            <Select onValueChange={(val) => form.setValue("courtId", parseInt(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a court" />
              </SelectTrigger>
              <SelectContent>
                {venues?.map(venue => (
                  <div key={venue.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {venue.name}
                    </div>
                    {venue.courts.map(court => (
                      <SelectItem key={court.id} value={court.id.toString()}>
                        {court.name} ({court.type})
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.courtId && <p className="text-destructive text-sm">{form.formState.errors.courtId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Level Min</Label>
              <Input type="number" step="0.5" {...form.register("levelMin")} />
            </div>
            <div className="space-y-2">
              <Label>Level Max</Label>
              <Input type="number" step="0.5" {...form.register("levelMax")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select 
              defaultValue="60" 
              onValueChange={(val) => form.setValue("duration", parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
                <SelectItem value="120">120 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full font-bold" size="lg" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Match"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
