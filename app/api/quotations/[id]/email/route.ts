import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Email delivery is structured as a future module. Add SMTP or transactional email credentials to enable sending."
    },
    { status: 501 }
  );
}
