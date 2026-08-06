// Profile service — BMI and stats-based target calculation. Pure functions,
// no I/O, same pattern as the other services: this is exactly the kind of
// formula (sign differs by sex, several multipliers chained) that's easy to
// get quietly wrong, so it's worth the same test coverage as the rest.

function computeBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  let category;
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { value: Math.round(bmi * 10) / 10, category };
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9
};

// Mifflin-St Jeor — the modern standard BMR equation, more accurate across
// body compositions than the older Harris-Benedict formula.
function computeBMR({ heightCm, weightKg, age, sex }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

// Reuses the app's existing phase concept as the goal modifier, rather than
// inventing a separate bulk/cut selector — off-season is a surplus, prep and
// peak are progressively larger deficits, matching how the phase presets
// already work.
const PHASE_MODIFIER = { offseason: 0.15, prep: -0.20, peak: -0.25 };

function computeTargetsFromStats({ heightCm, weightKg, age, sex, activityLevel, phase }) {
  if (!heightCm || !weightKg || !age || !sex) return null;
  const bmr = computeBMR({ heightCm, weightKg, age, sex });
  const activityMult = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  const phaseMod = PHASE_MODIFIER[phase] ?? 0;
  const calories = Math.round(bmr * activityMult * (1 + phaseMod));
  const protein = Math.round(2.2 * weightKg); // bodybuilding-standard g/kg, not the lower general-population RDA
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

module.exports = { computeBMI, computeBMR, computeTargetsFromStats, ACTIVITY_MULTIPLIERS, PHASE_MODIFIER };
