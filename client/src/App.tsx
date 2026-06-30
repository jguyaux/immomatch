import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { Header } from "./components/layout/Header";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PreferencesPage } from "./pages/PreferencesPage";
import { CreditPage } from "./pages/CreditPage";
import { DiscoveriesPage } from "./pages/DiscoveriesPage";
import { ComparePage } from "./pages/ComparePage";
import { api } from "./services/api";
import type { PropertyMatch } from "../../shared/types";

// Comparison context
interface CompareContextValue {
  compareList: PropertyMatch[];
  addToCompare: (match: PropertyMatch) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

export const CompareContext = createContext<CompareContextValue>({
  compareList: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
});

export function useCompare() {
  return useContext(CompareContext);
}

function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareList, setCompareList] = useState<PropertyMatch[]>([]);

  const addToCompare = (match: PropertyMatch) => {
    setCompareList((prev) => {
      if (prev.length >= 3) return prev;
      if (prev.find((m) => m.id === match.id)) return prev;
      return [...prev, match];
    });
  };

  const removeFromCompare = (id: string) => {
    setCompareList((prev) => prev.filter((m) => m.id !== id));
  };

  const clearCompare = () => setCompareList([]);

  const isInCompare = (id: string) => compareList.some((m) => m.id === id);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [discoveriesCount, setDiscoveriesCount] = useState(0);
  const { compareList } = useCompare();

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      api.getDiscoveriesCount().then((data) => setDiscoveriesCount(data.count)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex gap-2 mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            Matchs
          </NavLink>
          <NavLink
            to="/discoveries"
            className={({ isActive }) =>
              `relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            Decouvertes
            {discoveriesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1 text-xs font-bold bg-red-500 text-white rounded-full shadow-sm">
                {discoveriesCount > 99 ? "99+" : discoveriesCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/compare"
            className={({ isActive }) =>
              `relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            Comparateur
            {compareList.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center px-1 text-xs font-bold bg-primary-500 text-white rounded-full shadow-sm">
                {compareList.length}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/preferences"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            Criteres
          </NavLink>
          <NavLink
            to="/credit"
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            Credit
          </NavLink>
        </nav>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/discoveries" element={<DiscoveriesPage onCountChange={setDiscoveriesCount} />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/preferences" element={<PreferencesPage />} />
          <Route path="/credit" element={<CreditPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CompareProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </CompareProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
