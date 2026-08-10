import { FORMAT_GLOSSARY } from "@/lib/formats";

type FormatGlossaryProps = {
  title?: string;
};

export function FormatGlossary({
  title = "Словарь: что значат термины",
}: FormatGlossaryProps) {
  return (
    <article className="panel format-glossary">
      <h2>{title}</h2>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Коротко для тех, кто не следит за киберспортом. Это поможет выбрать
        формат, а не угадывать аббревиатуры.
      </p>
      <dl className="format-glossary__list">
        {FORMAT_GLOSSARY.map((item) => (
          <div key={item.term} className="format-glossary__item">
            <dt>{item.term}</dt>
            <dd>{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
