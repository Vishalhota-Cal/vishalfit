// Reference/seed data: the exercise library, the Indian + international food
// library, phase presets, and meal slots. This used to live as hardcoded
// consts in index.html; it now lives here so the "database layer" actually
// owns it, and the frontend fetches it once at boot via GET /api/meta.
//
// Fiber is included where a reasonably confident figure exists; unknowns are
// left `null` rather than guessed — this file feeds nutrition math directly.

const EXERCISE_LIBRARY_DEFAULT = [
  "Barbell Bench Press","Incline DB Press","Decline Bench Press","Pec Deck Fly","Cable Crossover","Weighted Dips","Push-Ups","Machine Chest Press",
  "Deadlift","Pull-Ups","Lat Pulldown","Barbell Row","Seated Cable Row","T-Bar Row","Single-Arm DB Row","Straight-Arm Pulldown",
  "Overhead Press","Seated DB Shoulder Press","Lateral Raise","Front Raise","Rear Delt Fly","Face Pull","Arnold Press","Upright Row",
  "Back Squat","Front Squat","Leg Press","Leg Extension","Lying Leg Curl","Seated Leg Curl","Walking Lunge","Bulgarian Split Squat","Standing Calf Raise","Seated Calf Raise","Hack Squat","Romanian Deadlift",
  "Barbell Curl","DB Hammer Curl","Preacher Curl","Cable Curl","Concentration Curl","Close-Grip Bench Press","Tricep Pushdown","Overhead Tricep Extension","Skull Crusher","Weighted Tricep Dips",
  "Hanging Leg Raise","Cable Crunch","Plank","Weighted Sit-Up","Ab Wheel Rollout"
];

const FOOD_LIBRARY_DEFAULT = [
  {name:"Chicken Breast", serving:"100g", calories:165, protein:31, carbs:0, fat:3.6, fiber:0},
  {name:"Egg Whites", serving:"100g", calories:52, protein:11, carbs:0.7, fat:0.2, fiber:0},
  {name:"Whole Egg", serving:"1 large", calories:72, protein:6, carbs:0.4, fat:5, fiber:0},
  {name:"White Rice (cooked)", serving:"100g", calories:130, protein:2.7, carbs:28, fat:0.3, fiber:0.4},
  {name:"Oats (dry)", serving:"100g", calories:389, protein:16.9, carbs:66, fat:6.9, fiber:10.6},
  {name:"Sweet Potato", serving:"100g", calories:86, protein:1.6, carbs:20, fat:0.1, fiber:3},
  {name:"Broccoli", serving:"100g", calories:34, protein:2.8, carbs:7, fat:0.4, fiber:2.6},
  {name:"Almonds", serving:"100g", calories:579, protein:21, carbs:22, fat:50, fiber:12.5},
  {name:"Whey Protein", serving:"1 scoop", calories:120, protein:24, carbs:3, fat:1, fiber:0},
  {name:"Tilapia", serving:"100g", calories:96, protein:20, carbs:0, fat:1.7, fiber:0},
  {name:"Olive Oil", serving:"1 tbsp", calories:119, protein:0, carbs:0, fat:13.5, fiber:0},
  {name:"Ground Beef 90/10", serving:"100g", calories:176, protein:20, carbs:0, fat:10, fiber:0},
  {name:"Salmon", serving:"100g", calories:208, protein:20, carbs:0, fat:13, fiber:0},
  {name:"Greek Yogurt (plain)", serving:"100g", calories:59, protein:10, carbs:3.6, fat:0.4, fiber:0},
  {name:"Banana", serving:"1 medium", calories:105, protein:1.3, carbs:27, fat:0.4, fiber:3.1},
  {name:"Peanut Butter", serving:"1 tbsp", calories:94, protein:4, carbs:3, fat:8, fiber:1},
  {name:"Soy Chunks (dry)", serving:"50g", calories:172, protein:26, carbs:15, fat:0.5, fiber:8},
  {name:"Paneer (raw)", serving:"100g", calories:265, protein:18, carbs:1.2, fat:20, fiber:0},
  {name:"Paneer Tikka", serving:"100g", calories:280, protein:18, carbs:6, fat:20, fiber:1},
  {name:"Palak Paneer", serving:"1 bowl (150g)", calories:270, protein:12, carbs:9, fat:20, fiber:2.5},
  {name:"Dal Tadka", serving:"1 bowl (150g)", calories:180, protein:9, carbs:24, fat:5, fiber:6},
  {name:"Dal Makhani", serving:"1 bowl (150g)", calories:280, protein:10, carbs:26, fat:15, fiber:5},
  {name:"Rajma (kidney bean curry)", serving:"1 bowl (150g)", calories:210, protein:10, carbs:30, fat:6, fiber:7},
  {name:"Chole (chickpea curry)", serving:"1 bowl (150g)", calories:230, protein:9, carbs:32, fat:8, fiber:7.5},
  {name:"Curd / Dahi (plain)", serving:"100g", calories:60, protein:3.5, carbs:4.7, fat:3.3, fiber:0},
  {name:"Curd Rice", serving:"1 bowl (200g)", calories:240, protein:7, carbs:38, fat:6, fiber:0.5},
  {name:"Lemon Rice", serving:"1 bowl (200g)", calories:260, protein:5, carbs:44, fat:8, fiber:1},
  {name:"Sambar", serving:"1 bowl (200g)", calories:130, protein:6, carbs:18, fat:4, fiber:4},
  {name:"Rasam", serving:"1 bowl (200g)", calories:60, protein:2, carbs:9, fat:1.5, fiber:1},
  {name:"Roti (whole wheat)", serving:"1 piece", calories:71, protein:2.7, carbs:15, fat:0.5, fiber:1.9},
  {name:"Naan (plain)", serving:"1 piece", calories:262, protein:8.7, carbs:45, fat:5.1, fiber:2},
  {name:"Paratha (plain)", serving:"1 piece", calories:180, protein:4, carbs:27, fat:6, fiber:2},
  {name:"Aloo Paratha", serving:"1 piece", calories:230, protein:5, carbs:32, fat:9, fiber:2.5},
  {name:"Puri", serving:"1 piece", calories:100, protein:2, carbs:11, fat:5.5, fiber:0.7},
  {name:"Jeera Rice", serving:"1 bowl (150g)", calories:210, protein:4, carbs:38, fat:5, fiber:0.5},
  {name:"Biryani (chicken)", serving:"1 plate (300g)", calories:520, protein:26, carbs:60, fat:19, fiber:2},
  {name:"Biryani (veg)", serving:"1 plate (300g)", calories:420, protein:9, carbs:60, fat:15, fiber:3},
  {name:"Khichdi", serving:"1 bowl (250g)", calories:280, protein:9, carbs:48, fat:6, fiber:4},
  {name:"Poha", serving:"1 plate (200g)", calories:270, protein:5, carbs:45, fat:8, fiber:2},
  {name:"Upma", serving:"1 plate (200g)", calories:250, protein:6, carbs:38, fat:8, fiber:2},
  {name:"Idli", serving:"2 pieces", calories:78, protein:2.6, carbs:16, fat:0.4, fiber:0.8},
  {name:"Dosa (plain)", serving:"1 piece", calories:133, protein:3, carbs:24, fat:3, fiber:0.6},
  {name:"Masala Dosa", serving:"1 piece", calories:220, protein:5, carbs:35, fat:7, fiber:1.5},
  {name:"Uttapam", serving:"1 piece", calories:160, protein:4, carbs:26, fat:4, fiber:1},
  {name:"Medu Vada", serving:"1 piece", calories:100, protein:3, carbs:11, fat:5, fiber:1},
  {name:"Coconut Chutney", serving:"2 tbsp", calories:70, protein:1, carbs:3, fat:6.5, fiber:1},
  {name:"Butter Chicken", serving:"1 bowl (200g)", calories:380, protein:24, carbs:10, fat:27, fiber:1},
  {name:"Chicken Curry (home-style)", serving:"1 bowl (200g)", calories:280, protein:26, carbs:8, fat:16, fiber:1.5},
  {name:"Tandoori Chicken", serving:"2 pieces (150g)", calories:250, protein:32, carbs:2, fat:12, fiber:0},
  {name:"Fish Curry", serving:"1 bowl (200g)", calories:220, protein:22, carbs:6, fat:12, fiber:1},
  {name:"Egg Curry", serving:"1 bowl (200g)", calories:230, protein:14, carbs:8, fat:16, fiber:1},
  {name:"Mutton Curry", serving:"1 bowl (200g)", calories:340, protein:26, carbs:6, fat:23, fiber:1},
  {name:"Mixed Veg Sabzi", serving:"1 bowl (150g)", calories:130, protein:3, carbs:15, fat:6, fiber:4},
  {name:"Aloo Gobi", serving:"1 bowl (150g)", calories:160, protein:3, carbs:20, fat:8, fiber:3},
  {name:"Bhindi Masala", serving:"1 bowl (150g)", calories:140, protein:2.5, carbs:12, fat:9, fiber:3.5},
  {name:"Samosa", serving:"1 piece", calories:262, protein:3.5, carbs:24, fat:17, fiber:1.5},
  {name:"Pakora (mixed veg)", serving:"4 pieces", calories:220, protein:4, carbs:20, fat:14, fiber:2},
  {name:"Chana Chaat", serving:"1 bowl (150g)", calories:180, protein:8, carbs:28, fat:4, fiber:6},
  {name:"Sprouts Salad", serving:"1 bowl (150g)", calories:120, protein:8, carbs:18, fat:1.5, fiber:5},
  {name:"Gulab Jamun", serving:"1 piece", calories:150, protein:2, carbs:20, fat:7, fiber:0},
  {name:"Chai (with milk + sugar)", serving:"1 cup", calories:60, protein:1.5, carbs:9, fat:2, fiber:0}
];

const PHASE_PRESETS = {
  offseason: {calories:3200, protein:220, carbs:380, fat:90, label:"Off-Season"},
  prep:      {calories:2400, protein:230, carbs:220, fat:55, label:"Prep"},
  peak:      {calories:2000, protein:210, carbs:150, fat:45, label:"Peak Week"}
};

const MEAL_SLOTS = [
  {key:"breakfast", label:"Breakfast"},
  {key:"lunch", label:"Lunch"},
  {key:"dinner", label:"Dinner"},
  {key:"preworkout", label:"Pre-Workout"},
  {key:"postworkout", label:"Post-Workout"},
  {key:"snacks", label:"Snacks"}
];

module.exports = { EXERCISE_LIBRARY_DEFAULT, FOOD_LIBRARY_DEFAULT, PHASE_PRESETS, MEAL_SLOTS };
