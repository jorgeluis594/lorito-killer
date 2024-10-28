import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  // The root path "/" is not matched by the matcher, so it's not included here
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).+)",
    "/dashboard/:path*",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host")!;

  const subdomain =
    process.env.PREVIEW === "true" ? "fantastidog" : hostname.split(".")[0];

  const token = await getToken({ req });

  if (
    !token &&
    url.pathname.startsWith("/dashboard") &&
    !url.pathname.startsWith("/login")
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.rewrite(
    new URL(
      `/${subdomain}${url.pathname}?${url.searchParams.toString()}`,
      req.url,
    ),
  );
}
