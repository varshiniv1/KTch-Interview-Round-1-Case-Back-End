import { selfLink } from "../utils/urls.js";

export function userToResponse(userRow, friendsRows = []) {
  if (!userRow) return null;

  const friends = friendsRows.map((f) => ({
    U_ID: f.id,
    U_Name: f.name ?? null,
    self: selfLink(`/users/${f.id}`),
  }));

  return {
    U_ID: userRow.id,
    U_Auth_Sub: userRow.auth_sub,
    U_Name: userRow.name ?? null,
    U_Email: userRow.email ?? null,
    U_Profile: userRow.picture ?? null,

    
    Is_Custom_Time: Boolean(userRow.is_custom_time),
    Custom_Time_Alarm: userRow.custom_time_alarm ?? null,
    Today_Time: userRow.today_time ?? null,
    Time_Length: userRow.time_length ?? 10,
    Pixel_Amount: userRow.pixel_amount ?? 10,

    // Friends list
    U_Friends: friends,

    // Required self link
    self: selfLink(`/users/${userRow.id}`),
  };
}