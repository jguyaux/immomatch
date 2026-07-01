import { useAuth } from "../../context/AuthContext";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">IM</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent leading-tight">
              ImmoMatch
            </h1>
            <p className="text-[10px] text-gray-400 leading-none tracking-wider uppercase">
              Trouvez votre bien idéal
            </p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-gray-400 hover:text-gray-600 transition px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
