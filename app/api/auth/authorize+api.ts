import {
  GOOGLE_CLIENT_ID,
  BASE_URL,
  APP_SCHEME,
  GOOGLE_AUTH_URL,
} from "@/utils/constants";

export async function GET(request: Request) {
  // Guard checks for misconfiguration to avoid generating invalid URLs
  if (!BASE_URL) {
    return Response.json(
      { error: "Server misconfiguration: EXPO_PUBLIC_BASE_URL is not set" },
      { status: 500 }
    );
  }
  if (!APP_SCHEME) {
    return Response.json(
      { error: "Server misconfiguration: EXPO_PUBLIC_SCHEME is not set" },
      { status: 500 }
    );
  }
  if (!GOOGLE_CLIENT_ID) {
    return Response.json(
      { error: "Missing GOOGLE_CLIENT_ID environment variable" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  let idpClientId: string;

  const internalClient = url.searchParams.get("client_id");

  const redirectUri = url.searchParams.get("redirect_uri");

  let platform;

  if (redirectUri === APP_SCHEME) {
    platform = "mobile";
  } else if (redirectUri === BASE_URL) {
    platform = "web";
  } else {
    return Response.json({ error: "Invalid redirect_uri" }, { status: 400 });
  }

  // use state to drive redirect back to platform
  let state = platform + "|" + url.searchParams.get("state");

  if (internalClient === "google") {
    idpClientId = GOOGLE_CLIENT_ID;
  } else {
    return Response.json({ error: "Invalid client" }, { status: 400 });
  }

  // additional enforcement
  if (!state) {
    return Response.json({ error: "Invalid state" }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: idpClientId,
    redirect_uri: BASE_URL + "/api/auth/callback",
    response_type: "code",
    scope: url.searchParams.get("scope") || "identity",
    state: state,
    prompt: "select_account",
  });

  return Response.redirect(GOOGLE_AUTH_URL + "?" + params.toString());
}
