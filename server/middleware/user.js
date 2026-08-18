// Single point of "who is making this request" for the whole API. Today
// it's always the fixed OWNER_USER_ID (single-user, pre-auth) — every route
// already reads req.userId rather than a hardcoded value, so swapping this
// for real Supabase Auth (verify the JWT in the Authorization header, set
// req.userId = user.sub) later touches ONLY this file, not the ~30 call
// sites downstream.
const OWNER_USER_ID = process.env.OWNER_USER_ID;
if (!OWNER_USER_ID) {
  throw new Error('OWNER_USER_ID must be set (see server/.env.example) — generate one with `node -e "console.log(crypto.randomUUID())"`');
}

module.exports = function attachUser(req, res, next) {
  req.userId = OWNER_USER_ID;
  next();
};
