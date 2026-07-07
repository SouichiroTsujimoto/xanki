export class UserSyncHub implements DurableObject {
  private subscribers = new Set<ReadableStreamDefaultController>();

  constructor(_state: DurableObjectState, _env: unknown) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/notify") {
      const body = (await request.json()) as { rev: number };
      const payload = `event: revision\ndata: ${JSON.stringify({ rev: body.rev })}\n\n`;
      for (const controller of this.subscribers) {
        try {
          controller.enqueue(new TextEncoder().encode(payload));
        } catch {
          this.subscribers.delete(controller);
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET") {
      const stream = new ReadableStream({
        start: (controller) => {
          this.subscribers.add(controller);
          controller.enqueue(new TextEncoder().encode(": connected\n\n"));
        },
        cancel: (controller) => {
          this.subscribers.delete(controller as ReadableStreamDefaultController);
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  }
}
