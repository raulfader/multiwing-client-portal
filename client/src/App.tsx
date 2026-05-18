import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Project from "./pages/Project";
import NewProjectRequest from "./pages/NewProjectRequest";
import SharedProject from "./pages/SharedProject";
import GuestLogout from "./pages/GuestLogout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      <Route path="/projects/:slug" component={Project} />
      <Route path="/new-project" component={NewProjectRequest} />
      <Route path="/share/:token" component={SharedProject} />
      <Route path="/guest-logout" component={GuestLogout} />
      <Route path="/project/:slug">{(params) => <Redirect to={`/projects/${params.slug}`} />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "#141414",
                border: "1px solid #2A2A2A",
                color: "#FAFAFA",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
