import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreateBooking } from "@/hooks/use-bookings";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { addHours, format } from "date-fns";

export function BookingDialog({ courtId, courtName, children }: { courtId: number, courtName: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const { user } = useAuth();
  const { mutate: createBooking, isPending } = useCreateBooking();
  const { toast } = useToast();

  const handleBooking = () => {
    if (!user || !date) return;

    const startTime = new Date(date);
    const endTime = addHours(startTime, 1); // Default 1 hour booking

    createBooking({
      courtId,
      userId: user.claims.sub, // Replit Auth user ID
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: "confirmed"
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: "Booking Confirmed!", description: `You booked ${courtName} for ${format(startTime, "PPP p")}` });
      },
      onError: (err) => {
        toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {courtName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Date & Time</Label>
            <Input 
              type="datetime-local" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
            <p>• 1 Hour duration</p>
            <p>• Instant confirmation</p>
            <p>• Free cancellation up to 24h before</p>
          </div>
          <Button className="w-full font-bold" onClick={handleBooking} disabled={isPending || !date}>
            {isPending ? <Loader2 className="animate-spin mr-2" /> : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
