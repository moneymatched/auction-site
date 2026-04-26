import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { parseAdminEmailAllowlist, isAllowedAdminEmail } from "@/lib/admin-access";

function redirectPreservingCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh/validate auth cookie on each request for SSR/API access.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminLogin = path === "/admin/login";
  const isAdminArea = path.startsWith("/admin");

  if (isAdminArea && !isAdminLogin) {
    if (!user) {
      const redirect = NextResponse.redirect(new URL("/admin/login", request.url));
      return redirectPreservingCookies(response, redirect);
    }
    const allowlist = parseAdminEmailAllowlist(process.env.ADMIN_EMAILS);
    if (!isAllowedAdminEmail(user.email ?? undefined, allowlist)) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("error", "forbidden");
      const redirect = NextResponse.redirect(url);
      return redirectPreservingCookies(response, redirect);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
