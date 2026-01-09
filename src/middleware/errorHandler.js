import responses from "../utils/responses.js";

const { errors } = responses;

export default function errorHandler(err, req, res, next) {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json(errors.BAD_REQUEST);
  }

  console.error(err);
  return res.status(500).json(errors.INTERNAL);
}
