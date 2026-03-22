import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F8FAF9] px-4 py-8">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-[#0F6E56]" />
          <span className="text-2xl font-bold text-[#1A1A1A]">
            Zed<span className="text-[#0F6E56]">Pulse</span>
          </span>
        </Link>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Twende. Safe travel across Zambia.
      </p>
    </div>
  );
}
