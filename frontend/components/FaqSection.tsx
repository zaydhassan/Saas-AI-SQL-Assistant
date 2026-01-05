"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Do I need to know SQL?",
    a: "No. You can ask questions in plain English and AI generates safe SQL automatically.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Queries are read-only and your data is isolated per user.",
  },
  {
    q: "What file formats are supported?",
    a: "Currently CSV files. Database connections are coming soon.",
  },
  {
    q: "Can I visualize data?",
    a: "Yes. AI generates charts and KPIs automatically from your queries.",
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mt-32 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-10">
        Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="glass p-5 cursor-pointer"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">{faq.q}</h4>
              <span className="text-xl">
                {open === i ? "−" : "+"}
              </span>
            </div>

            {open === i && (
              <p className="mt-3 text-muted text-sm">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}