// Função serverless do Vercel. Fica disponível automaticamente em: /api/solicitacoes
// Usa a variável de ambiente DATABASE_URL (connection string do Neon).

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { nome, telefone, tipo, descricao } = req.body || {};

  if (!nome || !telefone || !tipo || !descricao) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO solicitacoes (nome, telefone, tipo_problema, descricao)
      VALUES (${nome}, ${telefone}, ${tipo}, ${descricao})
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro ao gravar solicitação:', err);
    return res.status(500).json({ error: 'Não foi possível salvar a solicitação. Tente novamente.' });
  }
};
