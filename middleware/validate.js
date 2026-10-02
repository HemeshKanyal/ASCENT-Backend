/** Parse req.body (or another part) with a zod schema; 400 with the first problem on failure. */
module.exports = (schema, part = "body") => (req, res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const issue = result.error.issues[0];
    return res.status(400).json({ message: `${issue.path.join(".") || part}: ${issue.message}` });
  }
  req[part === "body" ? "body" : `valid_${part}`] = result.data;
  next();
};
