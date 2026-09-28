import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { API_URL } from "../api/client";
import { getAccessToken } from "../api/tokens";

const authLink = new ApolloLink((operation, forward) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }));

  return forward(operation);
});

export function createApolloClient() {
  return new ApolloClient({
    link: authLink.concat(
      new HttpLink({
        uri: `${API_URL}/graphql`,
        credentials: "include",
        fetch: async (uri, options) => {
          const token = await getAccessToken();

          const headers = new Headers(options?.headers);

          if (token) {
            headers.set("authorization", `Bearer ${token}`);
          }

          return fetch(uri, { ...options, headers });
        },
      }),
    ),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network" },
      query: { fetchPolicy: "network-only" },
    },
  });
}

export const apolloClient = createApolloClient();
