import responses from "../utils/responses.js";

const { errors } = responses;

export default function contentTypeJson(req, res, next) {
  const contentLength = req.headers["content-length"];
  const hasBody = contentLength && Number(contentLength) > 0;

  if (!hasBody) return next();

  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) return next();

  return res.status(415).json(errors.UNSUPPORTED_MEDIA_TYPE);
}
