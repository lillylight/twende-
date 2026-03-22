import Link from 'next/link';
import {
  Shield,
  MapPin,
  ShieldCheck,
  Phone,
  Wallet,
  AlertTriangle,
  Eye,
  Search,
  Bus,
  CreditCard,
  Navigation,
  ArrowRight,
  Users,
  Route,
  Building2,
  Wifi,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Navigation,
    title: 'Real-Time Tracking',
    description:
      'Track your bus live on a map with GPS updates every 5 seconds. Know exactly where your ride is.',
    color: 'bg-[#0F6E56]/10 text-[#0F6E56]',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Operators',
    description:
      'Every operator is RTSA-licensed and compliance-scored. Travel only with vetted, safe buses.',
    color: 'bg-[#0F6E56]/10 text-[#0F6E56]',
  },
  {
    icon: Phone,
    title: 'USSD Booking (*147#)',
    description:
      'No smartphone? No problem. Book your seat by dialing *147# from any phone across Zambia.',
    color: 'bg-[#EF9F27]/10 text-[#EF9F27]',
  },
  {
    icon: Wallet,
    title: 'Mobile Money Payments',
    description:
      'Pay with Airtel Money, MTN MoMo, or Zamtel Kwacha. Cashless, instant, and secure.',
    color: 'bg-[#0F6E56]/10 text-[#0F6E56]',
  },
  {
    icon: AlertTriangle,
    title: 'SOS Emergency',
    description:
      'One tap sends an emergency alert to RTSA and responders with your live GPS location.',
    color: 'bg-[#E24B4A]/10 text-[#E24B4A]',
  },
  {
    icon: Eye,
    title: 'RTSA Monitored',
    description:
      'Speed limits, driver fatigue, and route compliance are tracked 24/7 by the Road Transport Authority.',
    color: 'bg-[#0F6E56]/10 text-[#0F6E56]',
  },
];

const STATS = [
  { value: '10,000+', label: 'Passengers', icon: Users },
  { value: '500+', label: 'Daily Trips', icon: Route },
  { value: '50+', label: 'Operators', icon: Building2 },
  { value: '99.9%', label: 'GPS Uptime', icon: Wifi },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Search,
    title: 'Search Route',
    description: 'Enter your departure and destination cities with your travel date.',
  },
  {
    step: 2,
    icon: Bus,
    title: 'Pick a Bus',
    description: 'Compare operators by safety score, departure time, and price.',
  },
  {
    step: 3,
    icon: CreditCard,
    title: 'Pay via Mobile Money',
    description: 'Securely pay with Airtel Money, MTN MoMo, or Zamtel Kwacha.',
  },
  {
    step: 4,
    icon: Navigation,
    title: 'Track Live',
    description: 'Watch your bus in real time and get arrival ETA updates.',
  },
];

const CITIES = [
  'Lusaka',
  'Kitwe',
  'Ndola',
  'Livingstone',
  'Kabwe',
  'Chipata',
  'Kasama',
  'Solwezi',
  'Mansa',
  'Mongu',
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#F8FAF9]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-7 w-7 text-[#0F6E56]" />
            <span className="text-xl font-bold text-[#1A1A1A]">
              Zed<span className="text-[#0F6E56]">Pulse</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-gray-100"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#0F6E56] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0b5a46]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F6E56] via-[#0b5a46] to-[#094a39]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#EF9F27]" />
          <div className="absolute -bottom-48 -left-24 h-80 w-80 rounded-full bg-white" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 text-[#EF9F27]" />
              Zambia&apos;s Trusted Transport Safety Platform
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Travel Safer <span className="text-[#EF9F27]">Across Zambia</span>
            </h1>
            <p className="mb-10 text-lg text-white/80 sm:text-xl">
              Real-time GPS tracking, verified operators, and instant bookings via app or USSD{' '}
              <span className="font-semibold text-[#EF9F27]">*147#</span>
            </p>

            {/* Quick Search Form */}
            <div className="mx-auto max-w-2xl">
              <form className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-xl sm:flex-row sm:items-end sm:p-3">
                <div className="flex-1">
                  <label className="mb-1 block text-left text-xs font-medium text-gray-500">
                    From
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      name="from"
                      defaultValue=""
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-[#F8FAF9] py-2.5 pl-9 pr-3 text-sm text-[#1A1A1A] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                    >
                      <option value="" disabled>
                        Departure city
                      </option>
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-left text-xs font-medium text-gray-500">
                    To
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      name="to"
                      defaultValue=""
                      className="w-full appearance-none rounded-lg border border-gray-200 bg-[#F8FAF9] py-2.5 pl-9 pr-3 text-sm text-[#1A1A1A] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                    >
                      <option value="" disabled>
                        Destination city
                      </option>
                      {CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-left text-xs font-medium text-gray-500">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    className="w-full rounded-lg border border-gray-200 bg-[#F8FAF9] px-3 py-2.5 text-sm text-[#1A1A1A] focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                  />
                </div>
                <button
                  type="submit"
                  formAction="/passenger/search"
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#EF9F27] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d98d1f] sm:px-8"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="-mt-8 relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <stat.icon className="mb-2 h-6 w-6 text-[#0F6E56]" />
              <p className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-[#1A1A1A]">
            Everything You Need for <span className="text-[#0F6E56]">Safer Travel</span>
          </h2>
          <p className="text-gray-500">
            From booking to arrival, Twende keeps you safe, informed, and connected every kilometre
            of the way.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`mb-4 inline-flex rounded-lg p-3 ${feature.color}`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#1A1A1A]">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#1A1A1A]">How It Works</h2>
            <p className="text-gray-500">Get on the road in four simple steps.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, index) => (
              <div key={item.step} className="relative text-center">
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute right-0 top-12 hidden h-px w-full translate-x-1/2 bg-gray-200 lg:block" />
                )}
                <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F6E56]/10">
                  <item.icon className="h-7 w-7 text-[#0F6E56]" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#EF9F27] text-xs font-bold text-white">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 font-semibold text-[#1A1A1A]">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#0F6E56] via-[#0b5a46] to-[#094a39] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Ready to Travel Safer?</h2>
          <p className="mb-8 text-lg text-white/80">
            Join thousands of Zambians who trust Twende for their daily commute and intercity
            travel.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-lg bg-[#EF9F27] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#d98d1f]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2 rounded-lg border-2 border-white/30 px-8 py-3 font-semibold text-white">
              <Phone className="h-5 w-5 text-[#EF9F27]" />
              Or dial *147# from any phone
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-6 w-6 text-[#0F6E56]" />
                <span className="text-lg font-bold text-[#1A1A1A]">
                  Zed<span className="text-[#0F6E56]">Pulse</span>
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Making public transport safer and more reliable across Zambia through technology.
              </p>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-[#1A1A1A]">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/passenger/search" className="hover:text-[#0F6E56]">
                    Search Routes
                  </Link>
                </li>
                <li>
                  <Link href="/passenger/bookings" className="hover:text-[#0F6E56]">
                    My Bookings
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-[#0F6E56]">
                    Register
                  </Link>
                </li>
                <li>
                  <span>USSD: *147#</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-[#1A1A1A]">Safety</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="#features" className="hover:text-[#0F6E56]">
                    Live Tracking
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-[#0F6E56]">
                    SOS Emergency
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-[#0F6E56]">
                    RTSA Compliance
                  </Link>
                </li>
                <li>
                  <Link href="#features" className="hover:text-[#0F6E56]">
                    Operator Verification
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 font-semibold text-[#1A1A1A]">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>support@twende.co.zm</li>
                <li>+260 211 123 456</li>
                <li>Lusaka, Zambia</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Twende. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
