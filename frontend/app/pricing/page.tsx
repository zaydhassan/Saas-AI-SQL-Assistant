import { Suspense } from "react";
import PricingClient from "./pricing-client";

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <PricingClient />
    </Suspense>
  );
}

function PricingSkeleton() {
  return (
    <div className="py-24 text-center text-gray-400">
      Loading pricing…
    </div>
  );
}