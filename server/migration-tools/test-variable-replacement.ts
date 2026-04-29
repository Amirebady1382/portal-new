#!/usr/bin/env tsx
/**
 * Test Script: Variable Replacement with Context
 *
 * این اسکریپت تست می‌کند که آیا سیستم جایگذاری متغیرها با استفاده از context درست کار می‌کند
 */

// Mock implementation for testing without needing full AI service
interface DetectedVariable {
  original: string;
  suggestion: string;
  name: string;
  label: string;
  leftContext?: string;
  rightContext?: string;
}

class VariableReplacementTester {
  /**
   * Apply variables to text using context-aware replacement
   */
  private applyVariablesToText(content: string, variables: DetectedVariable[]): string {
    console.log(`📝 Starting context-aware replacement for ${variables.length} variables`);
    let processedContent = content;
    let replacementCount = 0;

    // Sort variables by specificity (longer context = more specific = replace first)
    const sortedVariables = [...variables].sort((a, b) => {
      const aContextLength = (a.leftContext?.length || 0) + (a.rightContext?.length || 0);
      const bContextLength = (b.leftContext?.length || 0) + (b.rightContext?.length || 0);
      return bContextLength - aContextLength; // Descending order
    });

    // Track which positions we've already replaced to avoid double-replacement
    const replacedPositions = new Set<number>();

    for (const variable of sortedVariables) {
      const { original, suggestion, leftContext, rightContext, name, label } = variable;

      if (!original || !suggestion) {
        console.warn(`⚠️ Skipping variable ${name} - missing original or suggestion`);
        continue;
      }

      console.log(`\n🔍 Looking for: "${original}"`);
      console.log(`   Left context: "${leftContext || 'none'}"`);
      console.log(`   Right context: "${rightContext || 'none'}"`);
      console.log(`   Will replace with: ${suggestion}`);

      // If we have context, use it for precise matching
      if (leftContext || rightContext) {
        // Build a search pattern with context
        const leftPattern = leftContext ? this.escapeRegExp(leftContext) : '';
        const originalPattern = this.escapeRegExp(original);
        const rightPattern = rightContext ? this.escapeRegExp(rightContext) : '';

        // Create regex that matches: leftContext + original + rightContext
        const pattern = new RegExp(
          `(${leftPattern})(${originalPattern})(${rightPattern})`,
          'g'
        );

        let match;
        while ((match = pattern.exec(processedContent)) !== null) {
          const matchIndex = match.index;
          const originalStartIndex = matchIndex + match[1].length; // Position of original text

          // Check if this position was already replaced
          if (replacedPositions.has(originalStartIndex)) {
            console.log(`   ⏭️  Position ${originalStartIndex} already replaced, skipping`);
            continue;
          }

          console.log(`   ✅ Found match at position ${matchIndex}`);
          console.log(`      Before: "${match[0]}"`);

          // Replace: keep left context + replace original + keep right context
          const replacement = match[1] + suggestion + match[3];

          processedContent =
            processedContent.substring(0, matchIndex) +
            replacement +
            processedContent.substring(matchIndex + match[0].length);

          console.log(`      After: "${replacement}"`);

          // Mark this position as replaced
          replacedPositions.add(originalStartIndex);
          replacementCount++;

          // Reset regex index after modification
          pattern.lastIndex = matchIndex + replacement.length;
        }
      } else {
        // No context - simple replacement (may cause issues with identical placeholders!)
        console.warn(`⚠️ No context for "${original}" - using simple replace (may be ambiguous)`);

        // Only replace first occurrence to avoid replacing all identical placeholders
        const index = processedContent.indexOf(original);
        if (index !== -1 && !replacedPositions.has(index)) {
          processedContent =
            processedContent.substring(0, index) +
            suggestion +
            processedContent.substring(index + original.length);

          replacedPositions.add(index);
          replacementCount++;
          console.log(`   ✅ Replaced at position ${index}`);
        } else {
          console.log(`   ❌ Not found or already replaced`);
        }
      }
    }

    console.log(`\n✅ Replacement complete: ${replacementCount} replacements made`);
    return processedContent;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Test Case 1: User's exact problematic text
   */
  testUserExample() {
    console.log('\n\n═════════════════════════════════════════════════════════════');
    console.log('TEST 1: User\'s Exact Example');
    console.log('═════════════════════════════════════════════════════════════\n');

    const inputText = `شرکت ................................. به شماره ثبت 184 به شماره ثبت اختصاصی ............ در اداره ثبت شرکت‌ها و موسسات غیرتجاری ..................... واقع در ........................ به شناسه ملی .....................`;

    const variables: DetectedVariable[] = [
      {
        original: '.................................',
        suggestion: '{{beneficiary_company_name}}',
        name: 'beneficiary_company_name',
        label: 'نام شرکت مضمون‌عنه',
        leftContext: 'شرکت ',
        rightContext: ' به شماره ثبت'
      },
      {
        original: '184',
        suggestion: '{{beneficiary_registration_number}}',
        name: 'beneficiary_registration_number',
        label: 'شماره ثبت',
        leftContext: 'به شماره ثبت ',
        rightContext: ' به شماره ثبت اختصاصی'
      },
      {
        original: '............',
        suggestion: '{{beneficiary_unique_registration_number}}',
        name: 'beneficiary_unique_registration_number',
        label: 'شماره ثبت اختصاصی',
        leftContext: 'به شماره ثبت اختصاصی ',
        rightContext: ' در اداره ثبت'
      },
      {
        original: '.....................',
        suggestion: '{{beneficiary_registration_office}}',
        name: 'beneficiary_registration_office',
        label: 'اداره ثبت',
        leftContext: 'اداره ثبت شرکت‌ها و موسسات غیرتجاری ',
        rightContext: ' واقع در'
      },
      {
        original: '........................',
        suggestion: '{{beneficiary_address}}',
        name: 'beneficiary_address',
        label: 'آدرس',
        leftContext: 'واقع در ',
        rightContext: ' به شناسه ملی'
      },
      {
        original: '.....................',
        suggestion: '{{beneficiary_national_id}}',
        name: 'beneficiary_national_id',
        label: 'شناسه ملی',
        leftContext: 'به شناسه ملی ',
        rightContext: ''
      }
    ];

    console.log('📄 INPUT TEXT:');
    console.log(inputText);
    console.log('\n📦 DETECTED VARIABLES:', variables.length);

    const result = this.applyVariablesToText(inputText, variables);

    console.log('\n\n✨ FINAL RESULT:');
    console.log('═════════════════════════════════════════════════════════════');
    console.log(result);
    console.log('═════════════════════════════════════════════════════════════');

    // Verify expectations
    const expectedOutput = `شرکت {{beneficiary_company_name}} به شماره ثبت {{beneficiary_registration_number}} به شماره ثبت اختصاصی {{beneficiary_unique_registration_number}} در اداره ثبت شرکت‌ها و موسسات غیرتجاری {{beneficiary_registration_office}} واقع در {{beneficiary_address}} به شناسه ملی {{beneficiary_national_id}}`;

    console.log('\n📊 VERIFICATION:');
    if (result === expectedOutput) {
      console.log('✅ ✅ ✅ TEST PASSED! Output matches expected result!');
    } else {
      console.log('❌ TEST FAILED!');
      console.log('\nEXPECTED:');
      console.log(expectedOutput);
      console.log('\nACTUAL:');
      console.log(result);
      console.log('\nDIFFERENCES:');
      this.showDifferences(expectedOutput, result);
    }
  }

  /**
   * Test Case 2: Multiple identical placeholders
   */
  testMultipleIdenticalPlaceholders() {
    console.log('\n\n═════════════════════════════════════════════════════════════');
    console.log('TEST 2: Multiple Identical Placeholders');
    console.log('═════════════════════════════════════════════════════════════\n');

    const inputText = `شرکت ........ به شناسه ملی ........ در شهر ........ کد پستی ........`;

    const variables: DetectedVariable[] = [
      {
        original: '........',
        suggestion: '{{company_name}}',
        name: 'company_name',
        label: 'نام شرکت',
        leftContext: 'شرکت ',
        rightContext: ' به شناسه ملی'
      },
      {
        original: '........',
        suggestion: '{{national_id}}',
        name: 'national_id',
        label: 'شناسه ملی',
        leftContext: 'به شناسه ملی ',
        rightContext: ' در شهر'
      },
      {
        original: '........',
        suggestion: '{{city}}',
        name: 'city',
        label: 'شهر',
        leftContext: 'در شهر ',
        rightContext: ' کد پستی'
      },
      {
        original: '........',
        suggestion: '{{postal_code}}',
        name: 'postal_code',
        label: 'کد پستی',
        leftContext: 'کد پستی ',
        rightContext: ''
      }
    ];

    console.log('📄 INPUT TEXT:');
    console.log(inputText);

    const result = this.applyVariablesToText(inputText, variables);

    console.log('\n✨ FINAL RESULT:');
    console.log(result);

    const expectedOutput = `شرکت {{company_name}} به شناسه ملی {{national_id}} در شهر {{city}} کد پستی {{postal_code}}`;

    console.log('\n📊 VERIFICATION:');
    if (result === expectedOutput) {
      console.log('✅ ✅ ✅ TEST PASSED!');
    } else {
      console.log('❌ TEST FAILED!');
      console.log('EXPECTED:', expectedOutput);
      console.log('ACTUAL:  ', result);
    }
  }

  /**
   * Show character-by-character differences
   */
  showDifferences(expected: string, actual: string) {
    const maxLen = Math.max(expected.length, actual.length);
    let diffCount = 0;

    for (let i = 0; i < maxLen; i++) {
      if (expected[i] !== actual[i]) {
        console.log(`Position ${i}: Expected '${expected[i]}' (${expected.charCodeAt(i)}), got '${actual[i]}' (${actual.charCodeAt(i)})`);
        diffCount++;
        if (diffCount > 10) {
          console.log('... (more differences)');
          break;
        }
      }
    }
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('🧪 Starting Variable Replacement Tests...\n');

    this.testUserExample();
    this.testMultipleIdenticalPlaceholders();

    console.log('\n\n🏁 All tests complete!');
  }
}

// Run tests
const tester = new VariableReplacementTester();
tester.runAllTests();
