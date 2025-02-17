import * as oauth from "npm:oauth4webapi";

const code_challenge_method = "S256";
/**
 * The following MUST be generated for every redirect to the authorization_endpoint. You must store
 * the code_verifier and nonce in the end-user session such that it can be recovered as the user
 * gets redirected from the authorization server back to your application.
 */

// this is temporary code before I safe it on the client
const code_verifier = oauth.generateRandomCodeVerifier();

export { code_verifier };
