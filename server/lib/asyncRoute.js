// Every route handler in server/routes/ is now async (Supabase is a network
// call, not a local file read) — this wrapper is what makes a forgotten
// `await` or a rejected promise surface as a loud 500 through the terminal
// error handler in server/app.js, instead of an unhandled rejection that
// silently drops the response (Express 4 does not catch async errors for you).
module.exports = function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
