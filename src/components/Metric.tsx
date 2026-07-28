type Props = {
  n: number | string;
  t: string;
};

export default function Metric({n, t}: Props) {
  return (
    <div className="metric">
      <span>{t}</span>
      <strong>{n}</strong>
    </div>
  );
}
