import { useEffect, useState } from 'react';

// how long zain has been running. rendered at build time, then ticks.
function since(birth: string) {
  const day = 864e5, year = day * 365.25;
  const diff = Date.now() - new Date(birth).valueOf();
  const y = Math.floor(diff / year), d = Math.floor((diff % year) / day);
  const h = Math.floor((diff % day) / 36e5), m = Math.floor((diff % 36e5) / 6e4), s = Math.floor((diff % 6e4) / 1e3);
  return `${y}y ${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function Uptime({ birth }: { birth: string }) {
  const [text, setText] = useState(() => since(birth));
  useEffect(() => {
    const id = setInterval(() => setText(since(birth)), 1000);
    return () => clearInterval(id);
  }, [birth]);
  return <span suppressHydrationWarning>{text}</span>;
}
