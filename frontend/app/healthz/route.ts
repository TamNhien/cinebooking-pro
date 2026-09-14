export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return new Response("ok\n", {
    status: 200,
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
