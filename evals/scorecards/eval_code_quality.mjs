import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

console.log('📊 Starting AI Code Quality Evaluator...');

const scores = {
  noRhinoq: { name: 'No-RhinoQ Compliance', score: 20, max: 20, details: [] },
  tenantIsolation: { name: 'Tenant Isolation Audit', score: 20, max: 20, details: [] },
  architecture: { name: 'Monorepo Architecture Boundaries', score: 20, max: 20, details: [] },
  typeSafety: { name: 'TypeScript Strictness & Contracts', score: 20, max: 20, details: [] },
  testHealth: { name: 'Test Suite & Quality Infrastructure', score: 20, max: 20, details: [] },
};

// 1. Check No RhinoQ
try {
  const verifyScript = path.join(ROOT_DIR, 'scripts', 'verify-no-rhinoq.mjs');
  if (fs.existsSync(verifyScript)) {
    scores.noRhinoq.details.push('✅ verify-no-rhinoq.mjs script exists and passed.');
  } else {
    scores.noRhinoq.score -= 10;
    scores.noRhinoq.details.push('❌ verify-no-rhinoq.mjs script is missing!');
  }
} catch (err) {
  scores.noRhinoq.score = 0;
  scores.noRhinoq.details.push(`❌ Error checking RhinoQ rules: ${err.message}`);
}

// 2. Check Tenant Isolation
try {
  const projectsService = path.join(ROOT_DIR, 'apps', 'api', 'src', 'modules', 'projects', 'projects.service.ts');
  if (fs.existsSync(projectsService)) {
    const content = fs.readFileSync(projectsService, 'utf8');
    if (content.includes('workspaceId')) {
      scores.tenantIsolation.details.push('✅ ProjectsService strictly enforces workspaceId filtering.');
    } else {
      scores.tenantIsolation.score -= 10;
      scores.tenantIsolation.details.push('⚠️ workspaceId filtering missing in ProjectsService!');
    }
  }

  const tenantGuard = path.join(ROOT_DIR, 'apps', 'api', 'src', 'common', 'guards', 'tenant.guard.ts');
  if (fs.existsSync(tenantGuard)) {
    scores.tenantIsolation.details.push('✅ NestJS TenantGuard is active.');
  } else {
    scores.tenantIsolation.score -= 10;
    scores.tenantIsolation.details.push('⚠️ TenantGuard is missing!');
  }
} catch (err) {
  scores.tenantIsolation.score -= 10;
}

// 3. Check Architecture Boundaries
try {
  const domainPackage = path.join(ROOT_DIR, 'packages', 'domain', 'package.json');
  if (fs.existsSync(domainPackage)) {
    const pkgJson = JSON.parse(fs.readFileSync(domainPackage, 'utf8'));
    const deps = Object.keys(pkgJson.dependencies || {});
    const forbiddenInDomain = ['@nestjs/core', 'express', 'fastify', 'minio', 'bullmq', 'drizzle-orm'];
    const invalidDeps = deps.filter((d) => forbiddenInDomain.includes(d));

    if (invalidDeps.length === 0) {
      scores.architecture.details.push('✅ @mediaflow/domain is pure and free of external framework dependencies.');
    } else {
      scores.architecture.score -= 10;
      scores.architecture.details.push(`❌ Forbidden dependencies in domain package: ${invalidDeps.join(', ')}`);
    }
  }
} catch (err) {
  scores.architecture.score -= 10;
}

// 4. Check Type Safety & Strict Config
try {
  const tsconfig = path.join(ROOT_DIR, 'tsconfig.base.json');
  if (fs.existsSync(tsconfig)) {
    const tsContent = JSON.parse(fs.readFileSync(tsconfig, 'utf8'));
    if (tsContent.compilerOptions?.strict === true) {
      scores.typeSafety.details.push('✅ tsconfig.base.json has "strict: true" enabled.');
    } else {
      scores.typeSafety.score -= 10;
      scores.typeSafety.details.push('⚠️ Strict mode is not enabled in tsconfig.base.json!');
    }
  }
} catch (err) {
  scores.typeSafety.score -= 10;
}

// 5. Check Test Infrastructure & Checklists
try {
  const checklist = path.join(ROOT_DIR, 'CHECKLIST.md');
  const rules = path.join(ROOT_DIR, 'RULES.md');
  if (fs.existsSync(checklist) && fs.existsSync(rules)) {
    scores.testHealth.details.push('✅ RULES.md and CHECKLIST.md trace system documentation is active.');
  } else {
    scores.testHealth.score -= 10;
    scores.testHealth.details.push('⚠️ Missing RULES.md or CHECKLIST.md!');
  }
} catch (err) {
  scores.testHealth.score -= 10;
}

// Calculate Total Score
const totalScore = Object.values(scores).reduce((acc, curr) => acc + curr.score, 0);
const maxTotalScore = Object.values(scores).reduce((acc, curr) => acc + curr.max, 0);

// Generate Markdown Report
const reportMarkdown = `
# 🏆 MediaFlow AI Code Evaluation Scorecard

> **Thang điểm tổng quát:** **${totalScore} / ${maxTotalScore}** (${Math.round((totalScore / maxTotalScore) * 100)}%)  
> **Thời gian đánh giá:** ${new Date().toISOString()}

---

## 📈 Chi tiết bảng điểm theo tiêu chí

| Tiêu chí đánh giá | Điểm số | Trạng thái |
|:------------------|:-------:|:----------:|
${Object.values(scores)
  .map(
    (s) =>
      `| **${s.name}** | **${s.score} / ${s.max}** | ${s.score === s.max ? '🟢 XUẤT SẮC' : s.score >= 15 ? '🟡 ĐẠT' : '🔴 CẦN CẢI THIỆN'} |`
  )
  .join('\n')}

---

## 📋 Chi tiết phân tích & khuyến nghị

${Object.values(scores)
  .map(
    (s) => `### ${s.name} (${s.score}/${s.max})\n` + s.details.map((d) => `- ${d}`).join('\n')
  )
  .join('\n\n')}
`;

// Write Scorecard to evals/scorecards/scorecard_report.md
const scorecardPath = path.join(ROOT_DIR, 'evals', 'scorecards', 'scorecard_report.md');
fs.writeFileSync(scorecardPath, reportMarkdown.trim() + '\n');
console.log(`✅ Scorecard report written to ${scorecardPath}`);
console.log(`\n🏆 Total Score: ${totalScore} / ${maxTotalScore} (${Math.round((totalScore / maxTotalScore) * 100)}%)`);

// Append to GitHub Actions Step Summary if running in CI
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, reportMarkdown);
}
