import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { Profile as ProfileType } from "@shared/schema";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Venues from "@/pages/Venues";
import VenueDetails from "@/pages/VenueDetails";
import Matches from "@/pages/Matches";
import Community from "@/pages/Community";
import MatchDetails from "@/pages/MatchDetails";
import Profile from "@/pages/Profile";
import VenueDashboard from "@/pages/VenueDashboard";
import Compete from "@/pages/Compete";
import RatePlayers from "@/pages/RatePlayers";
import Settings from "@/pages/Settings";
import EditProfile from "@/pages/EditProfile";
import UserActivity from "@/pages/UserActivity";
import UserPayments from "@/pages/UserPayments";
import PrivacySettings from "@/pages/PrivacySettings";
import HelpPage from "@/pages/HelpPage";
import HowItWorks from "@/pages/HowItWorks";
import TermsOfUse from "@/pages/TermsOfUse";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Onboarding from "@/pages/Onboarding";

function Router() {
  const { user, isLoading } = useAuth();
  
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileType>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  if (isLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Show onboarding for new users who haven't completed it
  if (user.role === "player" && profile && !profile.onboardingCompleted) {
    return (
      <Switch>
        <Route path="/onboarding" component={Onboarding} />
        <Route component={Onboarding} />
      </Switch>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/venues" component={Venues} />
        <Route path="/venues/:id" component={VenueDetails} />
        <Route path="/matches" component={Community} />
        <Route path="/find-matches" component={Matches} />
        <Route path="/matches/:id" component={MatchDetails} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/settings/edit-profile" component={EditProfile} />
        <Route path="/settings/activity" component={UserActivity} />
        <Route path="/settings/payments" component={UserPayments} />
        <Route path="/settings/privacy" component={PrivacySettings} />
        <Route path="/settings/help" component={HelpPage} />
        <Route path="/settings/how-it-works" component={HowItWorks} />
        <Route path="/settings/terms" component={TermsOfUse} />
        <Route path="/settings/privacy-policy" component={PrivacyPolicy} />
        <Route path="/venue-dashboard" component={VenueDashboard} />
        <Route path="/compete" component={Compete} />
        <Route path="/rate/:id" component={RatePlayers} />
        <Route path="/onboarding" component={Onboarding} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
