// React Queryを必要とするコンポーネントテストを共通の設定で描画する。
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

type RenderWithQueryClientOptions = {
  queryClient?: QueryClient;
};

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

export const renderWithQueryClient = (
  ui: ReactElement,
  { queryClient = createTestQueryClient() }: RenderWithQueryClientOptions = {},
) => render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
