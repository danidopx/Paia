export default async function handler(req, res) {
  const { texto } = req.body;
  
  // Aqui você chamaria a API da IA
  const respostaIA = `Analisei seu dado: "${texto}". Como cientista, vejo um padrão de...`; 

  res.status(200).json({ feedback: respostaIA });
}