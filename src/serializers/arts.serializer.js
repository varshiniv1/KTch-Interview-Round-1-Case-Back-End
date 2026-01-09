import { selfLink } from "../utils/urls.js";

export function artToResponse(artRow, previousArtRow = null) {
  if (!artRow) return null;

  let comments = [];
  try {
    comments = artRow.comments ? JSON.parse(artRow.comments) : [];
    if (!Array.isArray(comments)) comments = [];
  } catch {
    comments = [];
  }

  
  let previous = {};
  if (artRow.previous_art_id) {
    previous = {
      A_ID: artRow.previous_art_id,
      self: selfLink(`/arts/${artRow.previous_art_id}`),
    };
  }

  if (previousArtRow && previousArtRow.id) {
    previous = {
      A_ID: previousArtRow.id,
      self: selfLink(`/arts/${previousArtRow.id}`),
      
    };
  }
return {
    A_ID: artRow.id,
    A_Image: artRow.image ?? null,
    A_Title: artRow.title ?? null,
    A_Comments: comments,
    A_Modified_Date: artRow.modified_date ?? null,
    A_Is_Public: Boolean(artRow.is_public),
    A_Previous: previous,

    self: selfLink(`/arts/${artRow.id}`),
  };
}