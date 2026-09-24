import { useEffect, useState } from 'react';
import { uptimeRows, uptimeText } from '../scripts/uptime';

// how long zain has been running. rendered at build time, then ticks. opens
// into the maths behind it: every unit is a remainder, with the % shouting.
export default function Uptime({ birth }: { birth: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <details className="rail-uptime">
      <summary>
        <span suppressHydrationWarning>{uptimeText(birth, now)}</span>
        <span className="op-tag" aria-hidden="true">%</span>
        <span className="sr-only">, show the maths</span>
      </summary>
      <div className="uptime-maths">
        <p>t = now - {birth}</p>
        <table>
          <tbody>
            {uptimeRows(birth, now).map(([unit, expr, value]) => (
              <tr key={unit}>
                <th scope="row">{unit}</th>
                <td>= {expr.split('%').flatMap((part, i) => (i ? [<span key={i} className="op">%</span>, part] : [part]))}</td>
                <td suppressHydrationWarning>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>every unit is a remainder: what's left once the bigger ones are taken out.</p>
      </div>
    </details>
  );
}
