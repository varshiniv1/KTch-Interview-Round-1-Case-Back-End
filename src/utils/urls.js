export const API_BASE_URL = "https://beartsy.wm.r.appspot.com";

export function selfLink(path) {
  
  return `${API_BASE_URL}${path}`;
}