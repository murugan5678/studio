import type { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 20v-5h8v5" />
      <path d="M15.13 4.13 12 2 8.87 4.13" />
      <path d="M12 22V8" />
      <path d="m6 6 1.5 1.5" />
      <path d="M16.5 7.5 18 6" />
      <path d="m6 12 1.5 1.5" />
      <path d="M16.5 13.5 18 12" />
      <path d="m6 18 1.5 1.5" />
      <path d="M16.5 19.5 18 18" />
    </svg>
  );
}
