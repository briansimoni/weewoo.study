import * as oauth from "npm:oauth4webapi";
import { useEffect, useState } from "preact/hooks";

export default function LoginIsland() {
  const [authorizationServer, setAuthorizationServer] = useState<
    oauth.AuthorizationServer
  >();

  useEffect(() => {
    async function discover() {
      const issuer = new URL("https://oauth.dev.aurasvc.io");
      const response = await oauth.discoveryRequest(
        new URL("https://oauth.dev.aurasvc.io"),
      );
      const as = await oauth.processDiscoveryResponse(issuer, response);
      setAuthorizationServer(as);
    }
    discover();
  }, []);
  return <pre>{JSON.stringify(authorizationServer, null, 2)}</pre>;
}
