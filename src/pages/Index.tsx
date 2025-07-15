
import { useAuth } from "@/hooks/useAuth";
import AdminFileExplorer from "@/components/AdminFileExplorer";
import AdminLogin from "@/components/AdminLogin";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";

const Index = () => {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with auth status */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AC</span>
            </div>
            <h1 className="text-xl font-bold">Acme Corp</h1>
            {user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                Admin Mode
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Logged in as: {user.email}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Visitor Mode - Browse and download only
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      {user ? <AdminFileExplorer /> : <AdminFileExplorer />}
      
      {/* Login overlay for visitors who want to become admin */}
      {!user && (
        <div className="fixed bottom-6 right-6 z-50">
          <AdminLogin />
        </div>
      )}
    </div>
  );
};

export default Index;
