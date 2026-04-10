import { NextResponse } from "next/server";

const DEPLOY_HOOKS = {
  zh: process.env.VERCEL_DEPLOY_HOOK_ZH,
  th: process.env.VERCEL_DEPLOY_HOOK_TH,
};

export async function POST(request) {
  try {
    const { target } = await request.json();

    if (!target || !DEPLOY_HOOKS[target]) {
      return NextResponse.json(
        { error: "Invalid deploy target. Use 'zh' or 'th'." },
        { status: 400 }
      );
    }

    const hookUrl = DEPLOY_HOOKS[target];
    if (!hookUrl) {
      return NextResponse.json(
        { error: `Deploy hook for '${target}' is not configured.` },
        { status: 500 }
      );
    }

    // 觸發 Vercel Deploy Hook
    const res = await fetch(hookUrl, { method: "POST" });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Vercel deploy hook returned ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      target,
      job: data,
      message: `Deploy triggered for ${target} site.`,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
