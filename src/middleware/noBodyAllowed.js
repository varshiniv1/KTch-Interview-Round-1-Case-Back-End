import responses from "../utils/responses.js";

const { errors } = responses;

export default function noBodyAllowed(req, res, next) {
  const contentLength = req.headers["content-length"];
  const hasDeclaredBody = contentLength && Number(contentLength) > 0;

  const hasParsedBody =
    req.body &&
    typeof req.body === "object" &&
    Object.keys(req.body).length > 0;

  if (!hasDeclaredBody && !hasParsedBody) return next();

  return res.status(400).json(errors.NO_BODY_ALLOWED);
}
