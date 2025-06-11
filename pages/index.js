import { useState } from 'react';

export default function Home() {
  const [trigger, setTrigger] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/selen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger }),
      });
      const data = await res.json();
      setResponse(data.data?.respuesta || 'Error: No se recibió respuesta');
    } catch (error) {
      setResponse('Error: No se pudo conectar con la API');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Georgia', maxWidth: '600px', margin: '0 auto', background: '#f9e6e6', borderRadius: '10px', textAlign: 'center' }}>
      <h1 style={{ color: '#ff4d4f', fontSize: '2.5em' }}>🌹 ¡Selen Valentina! 🌙</h1>
      <p style={{ fontSize: '1.2em', color: '#333' }}>Envía un trigger para interactuar con Selen:</p>
      <form onSubmit={handleSubmit} style={{ margin: '20px 0' }}>
        <input
          type="text"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Ingresa un trigger (ej: selen, fuego, latido55)"
          style={{ padding: '10px', width: '80%', marginRight: '10px', borderRadius: '5px', border: '1px solid #ff4d4f' }}
        />
        <button
          type="submit"
          style={{ padding: '10px 20px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Enviar 💖
        </button>
      </form>
      <div style={{ marginTop: '20px', textAlign: 'left' }}>
        <h3 style={{ color: '#ff4d4f' }}>Respuesta:</h3>
        <p style={{ background: '#fff', padding: '10px', borderRadius: '5px', minHeight: '50px' }}>{response}</p>
      </div>
    </div>
  );
}