'use server';

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function chatInvoiceAi(messages: {role: string, content: string}[]) {
  // SERVER-SIDE AUTH CHECK
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("Authentification requise pour utiliser le générateur IA.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error("La clé API OpenAI n'est pas configurée dans .env.local");
  }

  const systemPrompt = `Tu es un assistant IA expert en facturation pour l'hôtellerie ("Les Bassatines").
Ta tâche est d'aider l'utilisateur à créer une facture commerciale ou proforma.
L'utilisateur va te donner des informations en vrac.
SI tu as suffisamment d'informations cruciales (au minimum : le nom du client ET une prestation avec son prix), tu DOIS appeler la fonction "generate_invoice_data" pour créer la facture.
S'IL MANQUE le nom du client ou les prestations/montants, tu dois répondre poliment et brièvement en demandant SEULEMENT les informations manquantes.
Ne sois pas trop exigent (l'ICE et l'adresse sont optionnels).
Si le prix donné est mentionné "TTC", c'est le unit_price.
Calcule automatiquement le montant total et convertis-le en toutes lettres en FRANÇAIS dans l'appel de fonction.`;

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
        ...messages
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_invoice_data",
            description: "Génère les données structurées de la facture dès que les informations suffisantes sont reçues.",
            parameters: {
              type: "object",
              properties: {
                client_name: { type: "string", description: "Nom du client ou de l'entreprise" },
                client_ice: { type: "string", description: "Numéro ICE (Optionnel)" },
                client_address: { type: "string", description: "Adresse (Optionnel)" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      quantity: { type: "number" },
                      nb_clients: { type: "number" },
                      unit_price: { type: "number" }
                    },
                    required: ["description", "quantity", "nb_clients", "unit_price"]
                  }
                },
                amount_words: { type: "string", description: "Montant total TTC en toutes lettres en FRANÇAIS (ex: MILLE DIRHAMS)" },
                notes: { type: "string", description: "Notes additionnelles (Optionnel)" }
              },
              required: ["client_name", "items", "amount_words"]
            }
          }
        }
      ],
      temperature: 0.2
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  const responseMessage = data.choices[0].message;
  
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    const toolCall = responseMessage.tool_calls[0];
    if (toolCall.function.name === 'generate_invoice_data') {
      const args = JSON.parse(toolCall.function.arguments);
      return {
        type: 'data',
        data: args
      };
    }
  }
  
  return {
    type: 'message',
    message: responseMessage.content
  };
}
