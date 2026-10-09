export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl?: string;
}

export interface GoogleAuthRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export interface GoogleIdentityProvider {
  begin(): Promise<GoogleAuthRequest>;
  complete(code: string, codeVerifier: string, nonce: string): Promise<GoogleIdentity>;
}
