import responses from "../utils/responses.js";

const { errors } = responses;

/**
 * Expected header:
 * Authorization: Bearer sub:<AUTH_SUB>
 * Example: Bearer sub:auth0|123
 */
export default function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json(errors.NO_AUTH_HEADER);
  }

  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json(errors.INVALID_HEADER);
  }

  if (!token.startsWith("sub:")) {
    return res.status(401).json(errors.INVALID_HEADER);
  }

  req.authSub = token.replace("sub:", "");
  if (!req.authSub) {
    return res.status(401).json(errors.INVALID_HEADER);
  }

  next();
}
