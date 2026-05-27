/* eslint-disable react-refresh/only-export-components */

// Contexto de autenticacao - compartilha sessao em todo o app

import { createContext, useContext, useState } from "react";
import {
  getSession,
  login as loginService,
  logout as logoutService,
} from "../data/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());

  function login(whatsapp) {
    const result = loginService(whatsapp);
    if (result.success) {
      setUser(result.member);
    }
    return result;
  }

  function logout() {
    logoutService();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
