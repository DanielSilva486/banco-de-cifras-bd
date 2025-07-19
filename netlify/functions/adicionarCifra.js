// Salve este arquivo como: netlify/functions/adicionarCifra.js

const { Pool } = require('pg');

// Funções auxiliares para processar o texto da cifra
function isPalavraDeAcorde(palavra) { if (!palavra) return true; if (palavra.startsWith('[') && palavra.endsWith(']')) return true; if (palavra.startsWith('(') && palavra.endsWith(')')) return true; const notaRegex = /^[A-G](b|#)?/; if (!notaRegex.test(palavra)) return false; const restoDaPalavra = palavra.replace(notaRegex, ''); const caracteresValidosRegex = /^[mMajJdDiIsSuUgGaAdD0-9#b()/,-\s]*$/; return caracteresValidosRegex.test(restoDaPalavra); }
function isLinhaDeAcordes(linha) { linha = linha.trim(); if (linha === '') return false; const palavras = linha.split(/\s+/); return palavras.every(isPalavraDeAcorde); }
function converterCifraParaJson(textoCifra) { const linhas = textoCifra.trim().split('\n'); const resultado = []; let i = 0; while (i < linhas.length) { const linhaAtual = linhas[i]; if (linhaAtual.trim() === '') { i++; continue; } const proximaLinha = (i + 1 < linhas.length) ? linhas[i + 1] : null; if (isLinhaDeAcordes(linhaAtual)) { if (proximaLinha && !isLinhaDeAcordes(proximaLinha) && proximaLinha.trim() !== '') { resultado.push({ acordes: linhaAtual, letra: proximaLinha }); i += 2; } else { resultado.push({ acordes: linhaAtual, letra: '' }); i += 1; } } else { resultado.push({ acordes: '', letra: linhaAtual }); i += 1; } } return JSON.stringify(resultado); }

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
    
    // Converte o texto da cifra para o formato JSON que será salvo no banco
    const cifraJson = converterCifraParaJson(cifraBruta);

    // Insere no banco e retorna o ID da nova cifra para o frontend
    const result = await pool.query(
      'INSERT INTO cifras (titulo, artista, cifra_json) VALUES ($1, $2, $3) RETURNING id', 
      [titulo, artista, cifraJson]
    );

    const novaMusica = {
      status: "sucesso",
      novaMusica: {
        id: result.rows[0].id, // Envia o ID numérico real do banco
        titulo,
        artista
      }
    };
    return { statusCode: 200, body: JSON.stringify(novaMusica) };
  } catch (error) {
    console.error("Erro ao inserir no banco:", error);
    // Verifica se é um erro de duplicidade
    if (error.code === '23505') { // Código de erro para violação de unique constraint no PostgreSQL
        return { statusCode: 409, body: JSON.stringify({ error: `A música "${error.detail.match(/\(([^)]+)\)/g)[1]}" já existe.` }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  } finally {
    await pool.end();
  }
};