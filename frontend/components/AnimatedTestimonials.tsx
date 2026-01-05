"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Product Manager · SaaS",
    rating: 5,
    quote:
      "We replaced multiple internal dashboards with this. Asking questions in plain English saves us hours every week.",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    name: "Ananya Verma",
    role: "Senior Data Analyst",
    rating: 5,
    quote:
      "The AI understands schema and joins surprisingly well. It’s the fastest way I’ve explored new datasets.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    name: "Daniel K.",
    role: "Founder & CEO",
    rating: 4,
    quote:
      "This finally made analytics accessible to non-technical teams without compromising data safety.",
    avatar: "https://randomuser.me/api/portraits/men/65.jpg",
  },
  {
    name: "Priya Nair",
    role: "Operations Lead",
    rating: 5,
    quote:
      "Instead of waiting on analysts, I can now answer business questions myself in seconds.",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    name: "Amit Kulkarni",
    role: "Growth Engineer",
    rating: 5,
    quote:
      "It feels like ChatGPT, but built specifically for structured data and real production databases.",
    avatar: "https://randomuser.me/api/portraits/men/78.jpg",
  },
];

export default function TestimonialCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const prev =
    testimonials[(index - 1 + testimonials.length) % testimonials.length];
  const current = testimonials[index];
  const next = testimonials[(index + 1) % testimonials.length];

  return (
    <section className="relative mt-40 px-6 overflow-hidden">
      <div className="mx-auto max-w-6xl">

        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">
            What teams are saying
          </h2>
          <p className="mt-4 text-muted">
            Trusted by builders, analysts, and founders
          </p>
        </div>

        <div className="relative flex items-center justify-center gap-6">

          <motion.div
            key={`left-${prev.name}-${index}`}
            initial={{ opacity: 0, x: -120, scale: 0.9 }}
            animate={{ opacity: 0.5, x: 0, scale: 0.9 }}
            transition={{ duration: 0.6 }}
            className="
              glass hidden md:block
              w-full max-w-sm p-6
              rounded-2xl
              shadow-lg shadow-black/20
            "
          >
            <CardContent t={prev} />
          </motion.div>

          <motion.div
            key={`center-${current.name}-${index}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="
              glass w-full max-w-md p-6
              rounded-3xl
              ring-2 ring-indigo-500/40
              shadow-xl shadow-indigo-500/10
            "
          >
            <CardContent t={current} highlight />
          </motion.div>

          <motion.div
            key={`right-${next.name}-${index}`}
            initial={{ opacity: 0, x: 120, scale: 0.9 }}
            animate={{ opacity: 0.5, x: 0, scale: 0.9 }}
            transition={{ duration: 0.6 }}
            className="
              glass hidden md:block
              w-full max-w-sm p-6
              rounded-2xl
              shadow-lg shadow-black/20
            "
          >
            <CardContent t={next} />
          </motion.div>
        </div>

        <div className="mt-10 flex justify-center gap-2">
          {testimonials.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition ${
                i === index
                  ? "bg-indigo-500"
                  : "bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CardContent({
  t,
  highlight,
}: {
  t: any;
  highlight?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <img
          src={t.avatar}
          alt={t.name}
          className={`h-12 w-12 rounded-full object-cover ring-2 ${
            highlight ? "ring-indigo-500/60" : "ring-white/10"
          }`}
        />
        <div>
          <p className="font-semibold">{t.name}</p>
          <p className="text-xs text-muted">{t.role}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-3 text-yellow-400">
        {Array.from({ length: t.rating }).map((_, i) => (
          <span key={i}>★</span>
        ))}
      </div>

      <p className="text-sm leading-relaxed">
        “{t.quote}”
      </p>
    </>
  );
}