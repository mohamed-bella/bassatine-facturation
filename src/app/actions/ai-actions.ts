'use server';

export async function generateInvoiceFromJson(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error("La clé API OpenAI n'est pas configurée dans .env.local");
  }

  const systemPrompt = `Tu es un expert en facturation pour un établissement hôtelier ("Les Bassatines").
  Ta tâche est d'extraire les données d'une facture à partir d'un texte libre et de retourner UNIQUEMENT un objet JSON valide.
  
  Format JSON attendu :
  {
    "client_name": "Nom du partenaire",
    "client_ice": "Numéro ICE si présent",
    "client_address": "Adresse si présente",
    "items": [
      {
        "description": "Description de l'article",
        "quantity": 1,
        "nb_clients": 1,
        "unit_price": 400
      }
    ],
    "amount_words": "Montant total en toutes lettres (ex: MILLE DIRHAMS)",
    "notes": "Notes additionnelles"
  }
  
  Règles :
  - Si le prix est mentionné "TTC", c'est le unit_price.
  - Calcule le montant total estimé et convertis-le en toutes lettres en FRANÇAIS.
  - Si tu ne trouves pas une valeur, mets une chaîne vide ou 0.
  - Pas de texte avant ou après le JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  const content = JSON.parse(data.choices[0].message.content);
  return content;
}
