import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { documentQueue } from "@/document/queue";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(documentQueue)],
  serverAdapter,
});

const handler = serverAdapter.getRouter();

async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return null;
}

function expressToNext(req: NextRequest) {
  const url = new URL(req.url);

  return new Promise<NextResponse>((resolve) => {
    const expressReq = {
      method: req.method,
      url: url.pathname.replace("/api/admin/queues", "") + url.search || "/",
      path: url.pathname.replace("/api/admin/queues", "") || "/",
      query: Object.fromEntries(url.searchParams),
      headers: Object.fromEntries(req.headers),
      baseUrl: "/api/admin/queues",
    };

    const chunks: Uint8Array[] = [];
    const expressRes = {
      statusCode: 200,
      _headers: {} as Record<string, string>,
      setHeader(key: string, value: string) {
        this._headers[key] = value;
        return this;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      send(body: string | Buffer) {
        const headers = new Headers(this._headers);
        const responseBody =
          typeof body === "string" ? body : new Uint8Array(body);
        resolve(
          new NextResponse(responseBody, {
            status: this.statusCode,
            headers,
          }),
        );
      },
      end(body?: string | Buffer) {
        const allChunks = [...chunks];
        if (body) {
          const buf =
            typeof body === "string"
              ? new TextEncoder().encode(body)
              : new Uint8Array(body);
          allChunks.push(buf);
        }
        const combined =
          allChunks.length > 0
            ? allChunks.reduce((acc, chunk) => {
                const merged = new Uint8Array(acc.length + chunk.length);
                merged.set(acc);
                merged.set(chunk, acc.length);
                return merged;
              }, new Uint8Array(0))
            : null;
        const headers = new Headers(this._headers);
        resolve(
          new NextResponse(
            combined ? new Uint8Array(combined) : null,
            { status: this.statusCode, headers },
          ),
        );
      },
      write(chunk: Buffer | Uint8Array) {
        chunks.push(new Uint8Array(chunk));
      },
      json(data: unknown) {
        this._headers["content-type"] = "application/json";
        this.send(JSON.stringify(data));
      },
      redirect(url: string) {
        resolve(NextResponse.redirect(new URL(url, req.url)));
      },
    };

    handler(expressReq as any, expressRes as any, () => {
      resolve(new NextResponse(null, { status: 404 }));
    });
  });
}

async function handleRequest(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  return expressToNext(req);
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export async function PUT(req: NextRequest) {
  return handleRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleRequest(req);
}

export async function PATCH(req: NextRequest) {
  return handleRequest(req);
}
