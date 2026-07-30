import { Link } from "react-router-dom";
import { Store } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans bg-app-bg text-app-primary">
      <div className="max-w-sm w-full bg-app-card border border-app-border p-8 rounded-2xl space-y-6 shadow-sm">
        <div className="w-12 h-12 bg-app-accent text-app-primary rounded-xl flex items-center justify-center mx-auto">
          <Store size={24} />
        </div>
        
        <div>
          <span className="text-3xl font-bold font-mono tracking-tight block mb-1 text-app-primary">
            404
          </span>
          <h2 className="text-base font-semibold text-app-primary">Заведение не найдено</h2>
          <p className="text-app-muted text-xs mt-2 leading-relaxed">
            Возможно, вы перешли по неверной ссылке или магазин временно недоступен.
          </p>
        </div>
        
        <Link 
          to="/"
          className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-app-accent text-app-primary font-medium text-xs hover:bg-app-hover transition-colors"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
