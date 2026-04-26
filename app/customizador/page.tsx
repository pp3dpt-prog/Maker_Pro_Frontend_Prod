import { useState } from 'react';
import GeneratedEditor from 'components/GeneratedEditor';

export default function Page({ produto }: any) {
  const schema = produto.generation_schema;

  const [values, setValues] = useState(() => {
    const o: any = {};
    Object.entries(schema.parameters).forEach(
      ([k, d]: any) => (o[k] = d.default)
    );
    return o;
  });

  async function gerar() {
    await fetch('/gerar-stl-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: produto.id,
        mode: 'final',
        params: values
      })
    });
  }

  return (
    <>
      <GeneratedEditor
        schema={schema}
        values={values}
        onChange={setValues}
      />
      <button onClick={gerar}>Gerar STL</button>
    </>
  );
}