// types/auth.types.ts
export interface User {
  id: string;
  fname: string;
  lname: string;
  token: string;
  email: string;
  username: string;
  photo: string;
  gender: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}
