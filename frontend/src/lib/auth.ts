
const AUTH_TOKEN_KEY = "deusa_auth_token";
const USER_DATA_KEY = "deusa_user_data";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
}

export const AuthService = {
  login: (email: string) => {
    if (!hasBrowserStorage()) return null;

    const mockUser: User = {
      id: "1",
      name: "Rafael Mendes",
      email: email,
      role: "Comercial",
      location: "SP",
    };
    localStorage.setItem(AUTH_TOKEN_KEY, "mock-jwt-token");
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  logout: () => {
    if (!hasBrowserStorage()) return;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  },

  isAuthenticated: () => {
    if (!hasBrowserStorage()) return false;
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getUser: (): User | null => {
    if (!hasBrowserStorage()) return null;
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  },
};
