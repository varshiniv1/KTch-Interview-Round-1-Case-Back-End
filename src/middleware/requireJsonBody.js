import responses from "../utils/responses.js";
const { errors } = responses;

export default function requireJsonBody(req, res, next) {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json(errors.BAD_REQUEST);
  }
  if (Object.keys(req.body).length === 0) {
    return res.status(400).json(errors.BAD_REQUEST);
  }
  next();
}