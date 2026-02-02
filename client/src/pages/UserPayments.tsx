import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, CreditCard, Plus, Receipt
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserPayments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentMethods] = useState<any[]>([]);
  const [transactions] = useState<any[]>([]);

  const handleAddCard = () => {
    toast({ title: "Payment integration coming soon!" });
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} data-testid="button-back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-display font-bold">Your Payments</h1>
      </div>

      <Tabs defaultValue="methods" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="methods" data-testid="tab-payment-methods">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            <Receipt className="w-4 h-4 mr-2" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No payment methods added</p>
              <Button onClick={handleAddCard} data-testid="button-add-card">
                <Plus className="w-4 h-4 mr-2" />
                Add Card
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method, idx) => (
                <Card key={idx}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <div className="font-medium">•••• {method.last4}</div>
                        <div className="text-sm text-muted-foreground">{method.brand}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full" onClick={handleAddCard}>
                <Plus className="w-4 h-4 mr-2" />
                Add Another Card
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your booking history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, idx) => (
                <Card key={idx}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{tx.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-bold">${tx.amount.toFixed(2)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
