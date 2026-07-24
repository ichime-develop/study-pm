// Reactからメモリ上の認証状態と認証APIを扱うためのhookを提供する。
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

import { accessTokenStore } from "../../shared/api/accessTokenStore";
import { authApi } from "./authApi";
import type { LoginRequest, SignupRequest } from "./authTypes";

export const authQueryKey = ["auth", "me"] as const;

export const useAccessToken = () =>
  useSyncExternalStore(accessTokenStore.subscribe, accessTokenStore.get, accessTokenStore.get);

export const useCurrentAccount = () =>
  useQuery({
    queryKey: authQueryKey,
    queryFn: authApi.me,
    retry: false,
  });

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: LoginRequest) => authApi.login(request),
    onSuccess: (response) => {
      queryClient.setQueryData(authQueryKey, response.account);
    },
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SignupRequest) => authApi.signup(request),
    onSuccess: (response) => {
      queryClient.setQueryData(authQueryKey, response.account);
    },
  });
};

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      accessTokenStore.set(null);
      queryClient.clear();
      navigate("/login");
    },
  });
};
