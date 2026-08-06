// Food parser service — sits between the AI integration service and the
// nutrition service. Its one job: turn a raw array of AI-parsed items into
// normalized food-log entries ready to hand to nutritionService. Kept as a
// separate module (rather than folded into aiService) so the parsing/
// normalization rules can change or be unit-tested independently of the
// OpenAI call itself.

function round1(n) { return Math.round((Number(n) || 0) * 10) / 10; }

function itemsToEntries(items) {
  return items.map(item => ({
    name: item.label,
    qty: 1,
    serving: item.serving || 'AI estimate',
    calories: Math.round(Number(item.calories) || 0),
    protein: round1(item.protein),
    carbs: round1(item.carbs),
    fat: round1(item.fat),
    fiber: round1(item.fiber),
    confidence: item.confidence || 'medium',
    loggedBy: 'ai'
  }));
}

module.exports = { itemsToEntries };
