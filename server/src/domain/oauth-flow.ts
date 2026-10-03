export interface OAuthFlow {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

export interface OAuthFlowService {
  seal(flow: OAuthFlow, now: Date): string;
  unseal(cookieValue: string | undefined, now: Date): OAuthFlow | null;
  sealError(reason: string, now: Date): string;
  unsealError(cookieValue: string | undefined, now: Date): string | null;
}
