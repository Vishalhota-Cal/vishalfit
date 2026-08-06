// AI integration service — the ONLY place that talks to OpenAI. The key is
// read from process.env (server-side .env), so it never reaches the browser.
// Callers get back a plain array of parsed items or a typed error; they never
// see a raw fetch/response.

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'meal_items',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'serving', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'confidence'],
            properties: {
              label: { type: 'string', description: 'name of this one food item, e.g. "Roti" or "Dal Tadka"' },
              serving: { type: 'string', description: 'the quantity actually eaten, e.g. "4 pieces" or "250g"' },
              calories: { type: 'number' },
              protein: { type: 'number' },
              carbs: { type: 'number' },
              fat: { type: 'number' },
              fiber: { type: 'number' },
              confidence: { type: 'string', enum: ['low', 'medium', 'high'] }
            }
          }
        }
      }
    }
  }
};

const SYSTEM_PROMPT = `You are a nutrition estimator familiar with Indian home cooking and
restaurant portions as well as international foods. The user describes a meal that may
contain MULTIPLE distinct food items (e.g. "4 rotis + dal 250g" is two items: roti and
dal). Split it into one item per distinct food. For each item estimate the TOTAL
nutrition for the quantity actually described, not per 100g. If a quantity is vague,
assume a realistic typical portion. Estimate fiber in grams as well; if you are not
reasonably confident, use 0 rather than omitting it.`;

class AiServiceError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

async function estimateMeal(description, { apiKey, model }) {
  if (!apiKey) throw new AiServiceError('No OpenAI API key configured on the server (.env)', 'no_key');

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: description }
        ],
        response_format: SCHEMA
      })
    });
  } catch (e) {
    throw new AiServiceError('Could not reach OpenAI', 'network');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new AiServiceError('OpenAI rejected the API key', 'unauthorized');
    if (response.status === 429) throw new AiServiceError('Rate limited or out of credit', 'rate_limited');
    throw new AiServiceError(data?.error?.message || ('HTTP ' + response.status), 'upstream');
  }

  const msg = data?.choices?.[0]?.message;
  if (msg?.refusal) throw new AiServiceError('Model declined: ' + msg.refusal, 'refusal');

  let parsed;
  try { parsed = JSON.parse(msg.content); } catch (e) { throw new AiServiceError('Malformed AI response', 'parse'); }
  if (!Array.isArray(parsed.items)) throw new AiServiceError('Malformed AI response', 'parse');
  return parsed.items;
}

module.exports = { estimateMeal, AiServiceError };
