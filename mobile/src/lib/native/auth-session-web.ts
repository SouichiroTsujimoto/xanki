import type { AuthSessionPlugin } from "./auth-session";

export class AuthSessionWeb implements AuthSessionPlugin {
  async openAuthSession(): Promise<{ url: string }> {
    throw new Error("AuthSession is only available on native platforms");
  }
}
