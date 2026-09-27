// Função serverless do Vercel, disponível em: /api/admin
// Retorna a lista de solicitações, mas só se a senha enviada bater com ADMIN_PASSWORD.

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const senhaEnviada = req.headers['x-admin-password'];

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD não configurada no servidor.' });
  }

  if (!senhaEnviada || senhaEnviada !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, nome, telefone, tipo_problema, descricao, criado_em
      FROM solicitacoes
      ORDER BY criado_em DESC
    `;
    return res.status(200).json({ solicitacoes: rows });
  } catch (err) {
    console.error('Erro ao buscar solicitações:', err);
    return res.status(500).json({ error: 'Não foi possível carregar as solicitações.' });
  }
};
