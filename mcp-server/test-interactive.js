import { generate_can_document } from './build/tools/templateTools.js';

async function testInteractiveWorkflow() {
  try {
    console.log('=== Testing CAN Document Generation with Minimal Data ===\n');
    
    // Test 1: Minimal data
    const minimalData = {
      customerName: "Test Customer"
    };
    
    console.log('Input data:', JSON.stringify(minimalData, null, 2));
    console.log('\n--- Result ---\n');
    
    const result1 = await generate_can_document(minimalData);
    console.log(result1);
    
    console.log('\n\n=== Testing CAN Document Generation with Complete Data ===\n');
    
    // Test 2: Complete data
    const completeData = {
      customerName: "Hashicorp",
      description: "Customer having issues with Terraform Enterprise FDO Active Active deployment",
      severity: "Sev1",
      problem_statement: "Terraform Enterprise FDO Active Active deployment is experiencing connectivity issues between nodes",
      business_impact: "Customer cannot deploy infrastructure changes, affecting their CI/CD pipeline",
      actions: "Initial investigation shows network connectivity issues between FDO nodes",
      needs: "Require network team assistance to resolve connectivity issues"
    };
    
    console.log('Input data:', JSON.stringify(completeData, null, 2));
    console.log('\n--- Result ---\n');
    
    const result2 = await generate_can_document(completeData);
    console.log(result2);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testInteractiveWorkflow(); 