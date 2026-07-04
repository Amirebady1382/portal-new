#!/usr/bin/env tsx
/**
 * Test Script: مقایسه JSON Mode vs JOIN Mode
 *
 * این اسکریپت نتایج دو روش دریافت variables را مقایسه می‌کند
 */

import dotenv from 'dotenv';
import { storage } from '../storage';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Dual-Mode Test: JSON vs JOIN${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  const testTemplateId = 1; // تست template اول

  console.log(`${colors.blue}Testing template #${testTemplateId}...${colors.reset}\n`);

  // 1️⃣ Fetch using legacy JSON mode
  console.log(`${colors.yellow}[1] Fetching with JSON mode (useMappings=false)...${colors.reset}`);
  const jsonResult = await storage.getContractTemplate(testTemplateId, { useMappings: false });

  if (!jsonResult) {
    console.log(`${colors.red}❌ Template not found!${colors.reset}`);
    return;
  }

  console.log(`   Template: ${jsonResult.name}`);
  console.log(`   Variables count: ${jsonResult.variables?.length || 0}`);
  console.log(`   Variables:`, JSON.stringify(jsonResult.variables, null, 2));
  console.log();

  // 2️⃣ Fetch using new JOIN mode
  console.log(`${colors.yellow}[2] Fetching with JOIN mode (useMappings=true)...${colors.reset}`);
  const joinResult = await storage.getContractTemplate(testTemplateId, { useMappings: true });

  if (!joinResult) {
    console.log(`${colors.red}❌ Template not found!${colors.reset}`);
    return;
  }

  console.log(`   Template: ${joinResult.name}`);
  console.log(`   Variables count: ${joinResult.variables?.length || 0}`);
  console.log(`   Variables:`, JSON.stringify(joinResult.variables, null, 2));
  console.log();

  // 3️⃣ مقایسه
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}   Comparison${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);

  const jsonVars = jsonResult.variables || [];
  const joinVars = joinResult.variables || [];

  console.log(`JSON mode: ${jsonVars.length} variables`);
  console.log(`JOIN mode: ${joinVars.length} variables`);

  if (jsonVars.length !== joinVars.length) {
    console.log(`${colors.red}❌ Variable count mismatch!${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓ Variable count matches${colors.reset}\n`);
  }

  // مقایسه نام متغیرها
  console.log(`${colors.yellow}Variable names comparison:${colors.reset}`);

  const jsonNames = new Set(
    jsonVars.map((v: any) => typeof v === 'string' ? v : v.name)
  );
  const joinNames = new Set(
    joinVars.map((v: any) => typeof v === 'string' ? v : v.name)
  );

  let allMatch = true;

  for (const jsonName of jsonNames) {
    if (joinNames.has(jsonName)) {
      console.log(`  ${colors.green}✓${colors.reset} ${jsonName}`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${jsonName} (missing in JOIN mode)`);
      allMatch = false;
    }
  }

  for (const joinName of joinNames) {
    if (!jsonNames.has(joinName)) {
      console.log(`  ${colors.yellow}+${colors.reset} ${joinName} (extra in JOIN mode)`);
      allMatch = false;
    }
  }

  console.log();

  if (allMatch && jsonVars.length === joinVars.length) {
    console.log(`${colors.green}✅ All tests passed! Migration is successful.${colors.reset}\n`);
    console.log(`${colors.cyan}You can now switch default to useMappings=true in storage.ts${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ Tests failed. Please review the differences above.${colors.reset}\n`);
  }
}

main().catch(console.error);
