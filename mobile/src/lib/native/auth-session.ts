import { registerPlugin } from "@capacitor/core";

export interface AuthSessionPlugin {
  openAuthSession(options: {
    url: string;
    callbackScheme?: string;
  }): Promise<{ url: string }>;
}

export const AuthSession = registerPlugin<AuthSessionPlugin>("AuthSession", {
  web: () => import("./auth-session-web").then((module) => new module.AuthSessionWeb()),
});
