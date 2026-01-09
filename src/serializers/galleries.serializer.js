import { selfLink } from "../utils/urls.js";
import { artToResponse } from "./arts.serializer.js";

export function galleryToResponse(galleryRow, artsRows = []) {
  if (!galleryRow) return null;
  
  let comments = [];
  try {
    comments = galleryRow.comments ? JSON.parse(galleryRow.comments) : [];
    if (!Array.isArray(comments)) comments = [];
  } catch {
    comments = [];
  }

  const arts = artsRows.map((a) => artToResponse(a));

  return {
    G_ID: galleryRow.id,
    G_Name: galleryRow.name ?? null,
    G_Profile: galleryRow.profile ?? null,
    G_Comments: comments,
    G_Creation_Date: galleryRow.creation_date ?? null,
    G_Is_Public: Boolean(galleryRow.is_public),

    G_Arts: arts,

    self: selfLink(`/galleries/${galleryRow.id}`),
  };
}