/**
 * deploy.js
 * 觸發 Vercel Deploy Hook 來重新部署中文站和泰文站
 *
 * 用法：
 *   node scripts/deploy.js          # 部署全部
 *   node scripts/deploy.js zh       # 只部署中文站
 *   node scripts/deploy.js th       # 只部署泰文站
 */

require("dotenv").config();

const HOOKS = {
  zh: {
    name: "中文站",
    url: process.env.VERCEL_DEPLOY_HOOK_ZH,
  },
  th: {
    name: "泰文站",
    url: process.env.VERCEL_DEPLOY_HOOK_TH,
  },
};

async function triggerDeploy(target) {
  const hook = HOOKS[target];
  if (!hook || !hook.url) {
    console.error(`❌ Deploy hook for '${target}' is not configured.`);
    return false;
  }

  console.log(`🚀 Triggering deploy for ${hook.name}...`);

  try {
    const res = await fetch(hook.url, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      console.log(`  ✅ ${hook.name} deploy triggered! Job ID: ${data.job?.id || "N/A"}`);
      return true;
    } else {
      console.error(`  ❌ ${hook.name} deploy failed: HTTP ${res.status}`);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ ${hook.name} deploy error:`, err.message);
    return false;
  }
}

async function main() {
  const target = process.argv[2]; // "zh", "th", or undefined (all)

  if (target) {
    if (!HOOKS[target]) {
      console.error(`Unknown target: ${target}. Use 'zh' or 'th'.`);
      process.exit(1);
    }
    await triggerDeploy(target);
  } else {
    console.log("🚀 Deploying all sites...\n");
    const results = await Promise.all([
      triggerDeploy("zh"),
      triggerDeploy("th"),
    ]);
    const allOk = results.every(Boolean);
    console.log(allOk ? "\n✅ All deploys triggered!" : "\n⚠️ Some deploys failed.");
  }
}

main();
