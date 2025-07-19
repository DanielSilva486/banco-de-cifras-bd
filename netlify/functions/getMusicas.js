// Salve este arquivo como: netlify/functions/getMusicas.js

const { Pool } = require('pg');

exports.handler = async function (event, context) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { statusCode: 500, body: JSON.stringify({ error: "DATABASE_URL não está configurada." }) };
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // CASO 1: Buscando uma cifra específica por ID
    if (event.queryStringParameters && event.queryStringParameters.id) {
      const { id } = event.queryStringParameters;
      const { rows } = await pool.query('SELECT cifra_json FROM cifras WHERE id = $1', [id]);
      
      if (rows.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ error: "Cifra não encontrada." }) };
      }
      
      // Retorna apenas o conteúdo da cifra
      return {
        statusCode: 200,
        body: JSON.stringify({ cifra: rows[0].cifra_json })
      };
    }

    // CASO 2: Buscando a lista completa de músicas para o menu
    const { rows } = await pool.query('SELECT id, titulo, artista FROM cifras ORDER BY artista, titulo');
    return {
      statusCode: 200,
      body: JSON.stringify(rows) // Retorna um array de objetos: [{id, titulo, artista}, ...]
    };

  } catch (error) {
    console.error("Erro no banco de dados:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  } finally {
    await pool.end();
  }
};