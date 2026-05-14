import { PricingTable } from '@clerk/nextjs';

export default function SubscriptionsPage() {
  return (
    <div className="min-h-screen  pt-20 md:pt-28 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
            Upgrade your Bookified experience
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] mt-3 sm:mt-4 max-w-2xl mx-auto">
            Choose the plan that fits your reading habits
          </p>
        </div>

        {/* Pricing Table Container */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-white overflow-x-auto" style={{ boxShadow: 'var(--shadow-soft)' }}>
          <div className="[&_*]:font-sans" style={{
            '--_pricing_table_bg': 'white',
            '--_pricing_table_border_color': 'var(--border-subtle)',
            '--_pricing_table_text': 'var(--text-primary)',
            '--_pricing_button_bg': '#663820',
            '--_pricing_button_hover': '#7a4528',
          } as React.CSSProperties}
          >
            <PricingTable />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 sm:mt-12 text-center">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            💡 Free tier active by default. Monthly limits reset on the 1st.
          </p>
        </div>
      </div>
    </div>
  );
}
