/** Copyright line shown on the loading screen and in Settings. */
export function Credit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-amber-100/60 ${className}`}>
      © {new Date().getFullYear()} Model Trainz. Created by{" "}
      <a
        href="https://www.luigiht.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        Luis Hermosilla
      </a>
    </p>
  );
}
