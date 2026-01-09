const errors = {
  NOT_ACCEPTABLE: { Error: "NotAcceptable" },

  NO_BODY_ALLOWED: {
    Error: "The request should not have any content json",
  },

  NO_AUTH_HEADER: {
    code: "no auth header",
    description: "Authorization header is missing",
  },

  INVALID_HEADER: {
    code: "invalid_header",
    description: "Invalid header. Use an RS256 signed JWT Access Token",
  },

  UNSUPPORTED_MEDIA_TYPE: { Error: "UnsupportedMediaType" },
  BAD_REQUEST: { Error: "BadRequest" },
  INTERNAL: { Error: "InternalServerError" },

  // --- USERS 404
  USER_NOT_FOUND: { Error: "No user with this user_id exists" },
  NOT_THE_USER: { Error: "You are not the user" },

  FRIEND_SELF: { Error: "A user cannot friend themselves" },
  FRIEND_ALREADY: { Error: "Friend already exists" },
  FRIEND_NOT_FOUND: { Error: "Friend does not exist" },

  

  // PATCH 
  AUTO_ONLY: { Error: "Should not be triggered manually" },
  //ARTS
  ART_NOT_FOUND: { Error: "No art with this art_id exists" },
  NOT_THE_ART_OWNER: { Error: "Art does not belong to the user" },
  INVALID_ART_BODY: { Error: "Invalid art body" },
  INVALID_ART_FIELD: { Error: "Invalid field in request body" },

  // ---------- GALLERIES ----------
  GALLERY_NOT_FOUND: { Error: "No gallery with this gallery_id exists" },
  NOT_THE_GALLERY_OWNER: { Error: "Gallery does not belong to the user" },
  INVALID_GALLERY_BODY: { Error: "Invalid gallery body" },
  INVALID_GALLERY_FIELD: { Error: "Invalid field in request body" },
  
  ART_ALREADY_IN_GALLERY: { Error: "Art already exists in gallery" },
  ART_NOT_IN_GALLERY: { Error: "Art is not in the gallery" },
};

export default { errors };
