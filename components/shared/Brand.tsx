'use client';

interface BrandProps {
  onClick?: () => void;
}

export function Brand({ onClick }: BrandProps = {}) {
  const inner = (
    <>
      <svg viewBox="0 0 512 512" className="size-9.5 shrink-0" aria-hidden="true" data-testid="brand-logo">
        <rect width="512" height="512" rx="96" className="fill-acc" />
        <circle cx="256" cy="270" r="160" fill="none" stroke="white" strokeWidth="18" />
        <circle cx="256" cy="240" r="88" fill="#1E1B4B" />
        <circle cx="256" cy="240" r="54" className="fill-acc-soft" />
        <line x1="256" y1="240" x2="256" y2="195" stroke="white" strokeWidth="7" strokeLinecap="round" />
        <line x1="256" y1="240" x2="291" y2="260" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <circle cx="256" cy="240" r="7" fill="white" />
        <rect x="196" y="425" width="28" height="36" rx="8" fill="white" />
        <rect x="288" y="425" width="28" height="36" rx="8" fill="white" />
      </svg>
      <div className="flex flex-col gap-0">
        <h1 className="text-lg leading-none font-bold tracking-tight">Binome</h1>
        <p className="text-muted-foreground hidden text-xs min-[420px]:block">Every second counts</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="About Binome"
        className="focus-visible:ring-acc-ring flex cursor-pointer items-center gap-3 rounded-md text-left hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex items-center gap-3">{inner}</div>;
}
