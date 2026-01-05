"use client";

import { useEffect, useState } from "react";

const PROMPTS = [
  "Total sales per month",
  "Top 5 products by revenue",
  "Compare sales growth month over month",
  "Average order value by region",
];

export default function ExamplePrompts() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % PROMPTS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="example-prompts">
      <span className="muted">Try asking:</span>
      <span className="prompt-chip glow">
        {PROMPTS[index]}
      </span>
    </div>
  );
}