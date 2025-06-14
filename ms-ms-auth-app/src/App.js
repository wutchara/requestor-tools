import MainPage from "./pages/MainPage";
import RedirectPage from "./pages/RedirectPage";

// --- Main App Component ---
export default function App() {
  // --- Simple Router ---
  // This logic determines which "page" to show based on the URL path.
  const path = window.location.pathname;

  if (path === "/redirect") {
    return <RedirectPage />;
  }

  // For any other path, render the MainPage
  return <MainPage />;
}
