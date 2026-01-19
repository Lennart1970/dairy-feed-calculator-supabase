import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Sources from "./pages/Sources";
import FeedManagement from "./pages/FeedManagement";
import FarmDashboard from "./pages/FarmDashboard";
import HerdGroups from "./pages/HerdGroups";
import Inventory from "./pages/Inventory";
import LoadingList from "./pages/LoadingList";
import Ruwvoerbalans from "./pages/Ruwvoerbalans";

function Router() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status with credentials included
    fetch("/api/auth/status", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("[Auth] Status check result:", data);
        setIsAuthenticated(data.authenticated);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[Auth] Status check failed:", err);
        setIsAuthenticated(false);
        setIsLoading(false);
      });
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && location !== "/login") {
    return <Login />;
  }

  // If authenticated and on login page, redirect to home
  if (isAuthenticated && location === "/login") {
    window.location.href = "/";
    return null;
  }

  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/bronnen"} component={Sources} />
      <Route path={"/sources"} component={Sources} />
      <Route path={"/beheer"} component={FeedManagement} />
      <Route path={"/feeds"} component={FeedManagement} />
      {/* Farm Management Routes */}
      <Route path={"/dashboard"} component={FarmDashboard} />
      <Route path={"/groepen"} component={HerdGroups} />
      <Route path={"/voorraad"} component={Inventory} />
      <Route path={"/laadlijst"} component={LoadingList} />
      <Route path={"/ruwvoerbalans"} component={Ruwvoerbalans} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
