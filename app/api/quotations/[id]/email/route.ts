import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST() {
  await requireUser();

  return NextResponse.json(
    {
      error:
        "Email delivery is structured as a future module. Add SMTP or transactional email credentials to enable sending."
    },
    { status: 501 }
  );
}
