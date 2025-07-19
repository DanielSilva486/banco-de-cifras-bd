const { Pool } = require('pg');

// COLE SUAS 3 FUNÇÕES (isPalavraDeAcorde, isLinhaDeAcordes, converterCifraParaJson) AQUI

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { statusCode: 500, body: JSON.stringify({ error: "DATABASE_URL não está configurada." }) };
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const dadosFormulario = JSON.parse(event.body);
    const { titulo, artista, cifraBruta } = dadosFormulario;
    const cifraJson = converterCifraParaJson(cifraBruta);

    await pool.query(
      'INSERT INTO cifras (titulo, artista, cifra_json) VALUES ($1, $2, $3)',
      [titulo, artista, cifraJson]
    );

    const novaMusica = {
      status: "sucesso",
      novaMusica: { id: `${titulo} - ${artista}`, titulo, artista }
    };
    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(novaMusica) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  } finally {
    await pool.end();
  }
};