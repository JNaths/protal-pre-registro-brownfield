type ErrorBannerProps = {
  message?: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-destructive-text"
    >
      <p className="text-sm font-medium">Por favor corrige los errores antes de continuar:</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
