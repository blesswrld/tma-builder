import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]">
      <h1 className="text-5xl font-bold text-[var(--tg-theme-button-color)] mb-4 drop-shadow-sm">404</h1>
      <h2 className="text-xl font-bold mb-2">Заведение не найдено</h2>
      <p className="text-[var(--tg-theme-hint-color)] text-sm mb-8 max-w-xs leading-relaxed">
        Возможно, вы перешли по неверной ссылке или магазин был удалён.
      </p>
      
      <Link 
        to="/"
        className="px-6 py-3 rounded-xl bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] text-xs font-bold uppercase tracking-wide shadow-lg transition-opacity hover:opacity-90"
      >
        Вернуться на главную
      </Link>
    </div>
  );
}
