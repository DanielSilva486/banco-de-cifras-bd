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
    if (event.queryStringParameters && event.queryStringParameters.id) {
      const idParts = event.queryStringParameters.id.split(' - ');
      const titulo = idParts[0];
      const artista = idParts.slice(1).join(' - ');
      const { rows } = await pool.query('SELECT cifra_json FROM cifras WHERE titulo = $1 AND artista = $2', [titulo, artista]);
      return {
        statusCode: 200,
        body: JSON.stringify({ cifra: rows[0]?.cifra_json || "Cifra não encontrada." })
      };
    }

    const { rows } = await pool.query('SELECT titulo, artista FROM cifras ORDER BY artista, titulo');
    const musicas = rows.map(row => ({
      id: `${row.titulo} - ${row.artista}`,
      titulo: row.titulo,
      artista: row.artista
    }));
    return {
      statusCode: 200,
      body: JSON.stringify(musicas)
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  } finally {
    await pool.end();
  }
};