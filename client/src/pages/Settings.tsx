import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, ChevronRight, User, Activity, CreditCard, Settings as SettingsIcon,
  HelpCircle, Info, FileText, Shield, LogOut
} from "lucide-react";

type MenuItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  external?: boolean;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    title: "Your Account",
    items: [
      { label: "Edit Profile", icon: User, href: "/settings/edit-profile" },
      { label: "Your Activity", icon: Activity, href: "/settings/activity" },
      { label: "Your Payments", icon: CreditCard, href: "/settings/payments" },
      { label: "Settings", icon: SettingsIcon, href: "/settings/privacy" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help", icon: HelpCircle, href: "/settings/help" },
      { label: "How the App Works", icon: Info, href: "/settings/how-it-works" },
    ],
  },
  {
    title: "Legal Information",
    items: [
      { label: "Terms of Use", icon: FileText, href: "/settings/terms" },
      { label: "Privacy Policy", icon: Shield, href: "/settings/privacy-policy" },
    ],
  },
];

export default function Settings() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto px-4 py-6 pb-24 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} data-testid="button-back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {menuSections.map((section, sectionIdx) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {section.title}
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {section.items.map((item, itemIdx) => (
                <Link key={item.href} href={item.href}>
                  <div 
                    className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
                    data-testid={`menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {itemIdx < section.items.length - 1 && (
                    <Separator className="ml-12" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <Button 
          variant="destructive" 
          className="w-full mt-6"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
