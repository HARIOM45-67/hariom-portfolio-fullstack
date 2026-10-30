export default function SectionTitle({ number, eyebrow, title, muted }) {
  return <div className="section-heading">
    <div className="eyebrow"><span>{number}</span> / {eyebrow}</div>
    <h2>{title}<br /><span className="muted">{muted}</span></h2>
  </div>;
}