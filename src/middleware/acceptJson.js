import responses from "../utils/responses.js";

const { errors } = responses;

export default function acceptJson(req, res, next) {
  const accept = req.headers.accept;

  if (!accept) return next();
  if (accept.includes("*/*")) return next();
  if (accept.includes("application/json")) return next();

  return res.status(406).json(errors.NOT_ACCEPTABLE);
}
