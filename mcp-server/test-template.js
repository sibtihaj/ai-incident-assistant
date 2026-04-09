import { formatCANDocument } from './src/utils/documentFormatters.js';
import { get_can_templates } from './src/tools/templateTools.js';

async function testTemplate() {
  try {
    // Get the template
    const templates = await get_can_templates();
    console.log('Templates found:', templates.length);
    
    if (templates.length > 0) {
      const template = templates[0];
      console.log('Template name:', template.name);
      
      // Test the formatting
      const incidentData = {
        customerName: 'Hashicorp',
        description: 'Customer having issues with Terraform Enterprise FDO Active Active deployment',
        severity: 'Sev1'
      };
      
      const result = formatCANDocument(template, incidentData);
      console.log('\n=== GENERATED CAN DOCUMENT ===\n');
      console.log(result);
      console.log('\n=== END DOCUMENT ===\n');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testTemplate(); 