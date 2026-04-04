import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { documentQueue } from "@/document/queue";
import { NextRequest, NextResponse } from "next/server";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/api/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(documentQueue)],
  serverAdapter,
});

const handler = serverAdapter.getRouter();

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

    const chunks: Buffer[] = [];
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
        const headers = new Headers(this._headers);
        const responseBody = body
          ? typeof body === "string"
            ? body
            : new Uint8Array(body)
          : null;
        resolve(
          new NextResponse(responseBody, { status: this.statusCode, headers }),
        );
      },
      write(chunk: Buffer) {
        chunks.push(chunk);
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

export async function GET(req: NextRequest) {
  return expressToNext(req);
}

export async function POST(req: NextRequest) {
  return expressToNext(req);
}

export async function PUT(req: NextRequest) {
  return expressToNext(req);
}
