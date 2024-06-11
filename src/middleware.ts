import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)",
    "/dashboard/:path*",
  ],
};

const subdomains = [{ subdomain: "fantastidog" }];

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host")!;

  const subdomain = hostname.split(".")[0];

  const token = await getToken({ req });
  if (
    !token &&
    url.pathname.startsWith("/dashboard") &&
    !url.pathname.startsWith("/login")
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const subdomainData = subdomains.find((d) => d.subdomain === subdomain);

  if (subdomainData) {
    return NextResponse.rewrite(
      new URL(`/${subdomain}${url.pathname}`, req.url),
    );
  }

  return new Response(null, { status: 404 });
}
