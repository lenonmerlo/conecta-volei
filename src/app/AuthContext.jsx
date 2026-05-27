/* eslint-disable react-refresh/only-export-components */

// Contexto de autenticacao - compartilha sessao em todo o app

import { createContext, useContext, useState } from "react";
import {
  getSession,
  login as loginService,
  logout as logoutService,
  register,
} from "../data/authStorage";
import { PLAYER_STATUS, PLAYER_TYPE } from "../domain/constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());
  const [pendingRegister, setPendingRegister] = useState(null);

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

  function savePendingRegister(formData) {
    setPendingRegister(formData);
  }

  function commitRegister() {
    if (!pendingRegister) {
      return { success: false, error: "Nenhum cadastro pendente." };
    }

    const player = {
      id: crypto.randomUUID(),
      name: pendingRegister.name.trim(),
      nickname: pendingRegister.nickname.trim() || null,
      whatsapp: pendingRegister.whatsapp.trim(),
      type: PLAYER_TYPE.MEMBER,
      gender: pendingRegister.gender,
      status: PLAYER_STATUS.ACTIVE,
      acceptedRules: true,
      createdAt: new Date().toISOString(),
    };

    const result = register(player);
    if (result.success) {
      setPendingRegister(null);
    }
    return result;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        pendingRegister,
        savePendingRegister,
        commitRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
